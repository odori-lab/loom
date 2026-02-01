export type ScrapeJobStatus = 'pending' | 'scraping' | 'generating_pdf' | 'completed' | 'failed'

export interface ScrapeJob {
  id: string
  orderId: string
  threadsUsername: string
  status: ScrapeJobStatus
  postCount: number
  pdfUrl?: string
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
}
