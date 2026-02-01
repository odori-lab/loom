import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createJob, updateJob } from '@/lib/job-store'
import { scrapeThreads } from '@/lib/scraper'
import { generatePdf } from '@/lib/pdf-generator'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_SIGNATURE', message: 'Invalid signature' } }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const threadsUsername = session.metadata?.threadsUsername
    if (!threadsUsername) {
      return NextResponse.json({ error: { code: 'MISSING_METADATA', message: 'Missing username' } }, { status: 400 })
    }

    const sessionId = session.id
    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : undefined
    createJob(sessionId, threadsUsername)

    processJob(sessionId, threadsUsername, paymentIntentId).catch(console.error)
  }

  return NextResponse.json({ received: true })
}

async function processJob(sessionId: string, username: string, paymentIntentId?: string) {
  try {
    updateJob(sessionId, { status: 'scraping' })

    const posts = await scrapeThreads(username, sessionId, (count) => {
      updateJob(sessionId, { postCount: count })
    })

    if (posts.length === 0) {
      throw new Error('No posts found for this user')
    }

    updateJob(sessionId, { status: 'generating_pdf', postCount: posts.length })

    const pdfUrl = await generatePdf(username, posts, sessionId)

    updateJob(sessionId, { status: 'completed', pdfUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    updateJob(sessionId, { status: 'failed', errorMessage: message })

    // Refund on failure
    if (paymentIntentId) {
      try {
        await stripe.refunds.create({ payment_intent: paymentIntentId })
      } catch (refundError) {
        console.error('Refund failed:', refundError)
      }
    }
  }
}
