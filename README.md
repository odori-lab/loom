# Loom

> Turn your Threads into a beautiful book

Threads 포스트를 아름다운 PDF 책으로 변환하는 서비스

## Features

- **Book-like Format** - A5 사이즈, 적절한 마진과 타이포그래피
- **Images Included** - 포스트의 이미지 자동 포함
- **Filter & Sort** - 날짜 필터링, 최신순/역순 정렬
- **Engagement Stats** - 좋아요, 댓글 수 보존

## Tech Stack

- **Frontend**: Next.js 16, React 19, TailwindCSS 4
- **Backend**: Next.js API Routes
- **Auth**: Supabase Auth (Google OAuth)
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage
- **PDF Generation**: Puppeteer
- **Scraping**: Apify API

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Setup Supabase

1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. `supabase/schema.sql` 실행하여 테이블 생성
3. Storage에서 `looms-pdf` 버킷 생성
4. Authentication > Providers에서 Google OAuth 설정

### 3. Environment Variables

`.env.local` 파일 생성:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Apify
APIFY_TOKEN=your-apify-token

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── login/                # Login page
│   ├── my/                   # My Looms page
│   ├── create/               # Create Loom flow
│   ├── auth/callback/        # OAuth callback
│   └── api/
│       ├── scrape/           # Threads scraping
│       ├── looms/            # Loom CRUD
│       └── generate-pdf/     # PDF generation
├── components/
│   ├── auth/                 # Auth components
│   ├── create/               # Create flow steps
│   └── loom/                 # Loom components
├── lib/
│   ├── supabase/             # Supabase clients
│   ├── scraper.ts            # Apify scraper
│   └── pdf/                  # PDF generation
└── types/                    # TypeScript types
```

## Documentation

- [Plan Document](docs/01-plan/features/loom-mvp.plan.md)
- [Design Document](docs/02-design/features/loom-mvp.design.md)
- [Database Schema](supabase/schema.sql)

## License

MIT
