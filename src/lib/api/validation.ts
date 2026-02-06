import { ThreadsPost, ThreadsProfile } from '@/types/threads'

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function parseLoomInput(body: unknown): { posts: ThreadsPost[]; profile: ThreadsProfile } {
  const { posts, profile } = body as { posts: ThreadsPost[]; profile: ThreadsProfile }

  if (!posts || !Array.isArray(posts) || posts.length === 0) {
    throw new ValidationError('Posts are required')
  }

  if (!profile) {
    throw new ValidationError('Profile is required')
  }

  return { posts, profile }
}
