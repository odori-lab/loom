import type {
  ThreadsProfile as PdfThreadsProfile,
  ThreadsPost as PdfThreadsPost,
} from '@loom/shared';

export type { BookSubChapter, BookChapter, ImageCaption, BookStructure } from '@loom/shared';

export interface ScraperAccount {
  id: string;
  username: string;
  password: string;
}

export interface AccountState {
  status: 'available' | 'in_use' | 'cooldown' | 'locked';
  cooldownUntil?: number;
  lastUsed?: number;
  lastError?: string;
  consecutiveFailures: number;
}

export interface StoredSession {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
  }>;
  lastRefreshed: number;
  userAgent: string;
}

// Worker extends PDF types with extra scraper fields
export interface ThreadsProfile extends PdfThreadsProfile {
  hdProfileImageUrl?: string;
  followerCount: number;
  isVerified?: boolean;
  bioLinks?: string[];
  profileTags?: string[];
}

export interface ThreadsPost extends PdfThreadsPost {
  shareCount: number;
}

export interface ScrapeResult {
  success: boolean;
  profile?: ThreadsProfile;
  posts?: ThreadsPost[];
  error?: string;
  accountId: string;
  duration: number;
}
