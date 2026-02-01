import { ScrapeJob, ScrapeJobStatus } from '@/types/scrape-job'

const jobs = new Map<string, ScrapeJob>()

export function createJob(sessionId: string, threadsUsername: string): ScrapeJob {
  const job: ScrapeJob = {
    id: crypto.randomUUID(),
    orderId: sessionId,
    threadsUsername,
    status: 'pending',
    postCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  jobs.set(sessionId, job)
  return job
}

export function getJob(sessionId: string): ScrapeJob | undefined {
  return jobs.get(sessionId)
}

export function updateJob(sessionId: string, updates: Partial<Pick<ScrapeJob, 'status' | 'postCount' | 'pdfUrl' | 'errorMessage'>>): ScrapeJob | undefined {
  const job = jobs.get(sessionId)
  if (!job) return undefined
  Object.assign(job, updates, { updatedAt: new Date() })
  return job
}
