# Loom

> Turn your Threads into a beautiful book

Threads 포스트를 아름다운 A5 PDF 책으로 변환하는 서비스

## Features

- **Book-like Format** — A5 사이즈, 적절한 마진과 타이포그래피
- **Images Included** — 포스트의 이미지 자동 포함
- **Filter & Sort** — 날짜 필터링, 최신순/역순 정렬
- **Engagement Stats** — 좋아요, 댓글 수 보존
- **i18n** — 한국어/영어 지원

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Auth / DB / Storage | Supabase (Google OAuth, PostgreSQL, Storage) |
| PDF Generation | Puppeteer + pdf-lib |
| Scraping | Apify API |
| Design | Pencil (Lunaris design system) |

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Supabase 프로젝트

### 1. Install dependencies

```bash
npm install
```

### 2. Setup Supabase

1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 실행
3. Storage에서 `looms-pdf` 버킷 생성 (private)
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

[http://localhost:3000](http://localhost:3000) 에서 확인

## Scripts

```bash
npm run dev       # 개발 서버
npm run build     # 프로덕션 빌드
npm run start     # 프로덕션 서버
npm run lint      # ESLint
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # 랜딩 페이지
│   ├── login/              # 로그인
│   ├── auth/callback/      # OAuth 콜백
│   ├── create/             # Loom 생성 플로우
│   ├── my/                 # 내 Loom 목록
│   └── api/
│       ├── scrape/         # Threads 스크래핑
│       ├── looms/          # Loom CRUD
│       ├── generate-pdf/   # PDF 생성
│       └── proxy-image/    # 이미지 프록시
├── components/
│   ├── auth/               # 인증 컴포넌트
│   ├── create/             # 생성 플로우 컴포넌트
│   ├── landing/            # 랜딩 페이지
│   └── ui/                 # 공통 UI
├── lib/
│   ├── api/                # API 유틸리티
│   ├── i18n/               # 다국어 지원
│   ├── pdf/                # PDF 생성 엔진
│   ├── supabase/           # Supabase 클라이언트
│   └── scraper.ts          # Apify 스크래퍼
└── types/                  # TypeScript 타입 정의
```

## Database

두 개의 테이블로 구성:

- **profiles** — 사용자 프로필 (auth.users 확장)
- **looms** — 생성된 Loom 메타데이터 (PDF 경로, 포스트 수, 커버 데이터)

RLS(Row Level Security) 활성화 — 사용자 본인의 데이터만 접근 가능

## License

MIT
