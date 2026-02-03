# Loom MVP Design Document

> Threads to PDF 변환 서비스 상세 설계

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                       │
├─────────────────────────────────────────────────────────────────┤
│  Landing │ Login │ My Page │ Create Flow (3 steps)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Routes (Next.js)                         │
├─────────────────────────────────────────────────────────────────┤
│  /api/auth/*  │  /api/scrape  │  /api/generate-pdf  │  /api/looms │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ Supabase │   │ Supabase │   │  Apify   │
        │   Auth   │   │ DB + S3  │   │   API    │
        └──────────┘   └──────────┘   └──────────┘
```

---

## 2. Database Schema (Supabase PostgreSQL)

### 2.1 Tables

```sql
-- Users table (Supabase Auth와 연동)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Looms table
CREATE TABLE public.looms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  thread_username TEXT NOT NULL,
  thread_display_name TEXT,
  post_count INTEGER NOT NULL DEFAULT 0,
  pdf_path TEXT NOT NULL,  -- Supabase Storage path
  cover_data JSONB,        -- 커버 페이지 정보
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.looms ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can only see their own looms
CREATE POLICY "Users can view own looms" ON public.looms
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own looms" ON public.looms
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own looms" ON public.looms
  FOR DELETE USING (auth.uid() = user_id);
```

### 2.2 Storage Buckets

```
looms-pdf/
  └── {user_id}/
      └── {loom_id}.pdf
```

Storage Policy: 사용자는 자신의 폴더에만 접근 가능

---

## 3. Page & Route Design

### 3.1 Page Structure

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/` | LandingPage | No | 서비스 소개 |
| `/login` | LoginPage | No | 로그인/회원가입 |
| `/my` | MyPage | Yes | Loom 목록 |
| `/create` | CreatePage | Yes | Loom 생성 플로우 |

### 3.2 Create Flow (Single Page with Steps)

```
Step 1: Username Input
  └─► Step 2: Post Selection (정렬, 필터, 선택)
      └─► Step 3: Complete & Download
```

---

## 4. API Endpoints

### 4.1 Auth (Supabase Auth 사용)

| Method | Endpoint | Description |
|--------|----------|-------------|
| - | Supabase Client | signInWithOAuth, signOut |

### 4.2 Looms API

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | `/api/looms` | - | `{ looms: Loom[] }` |
| GET | `/api/looms/[id]` | - | `{ loom: Loom, downloadUrl: string }` |
| POST | `/api/looms` | `{ username, posts, coverData }` | `{ loom: Loom }` |
| DELETE | `/api/looms/[id]` | - | `{ success: boolean }` |

### 4.3 Scrape API (기존 개선)

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| POST | `/api/scrape` | `{ username }` | `{ posts: ThreadsPost[], profile: ThreadsProfile }` |

---

## 5. Type Definitions

### 5.1 ThreadsPost (확장)

```typescript
interface ThreadsPost {
  id: string
  username: string
  content: string
  imageUrls: string[]
  likeCount: number
  replyCount: number
  repostCount: number
  postedAt: Date
}
```

### 5.2 ThreadsProfile (신규)

```typescript
interface ThreadsProfile {
  username: string
  displayName: string
  bio: string
  followerCount: number
  profileImageUrl: string
}
```

### 5.3 Loom

```typescript
interface Loom {
  id: string
  userId: string
  threadUsername: string
  threadDisplayName: string
  postCount: number
  pdfPath: string
  coverData: CoverData
  createdAt: Date
}

interface CoverData {
  name: string
  username: string
  bio: string
  profileImageUrl: string
}
```

---

## 6. PDF Design Specification

### 6.1 Page Format

```
Format: A5 (148mm x 210mm)
Margins:
  - Top: 22mm
  - Bottom: 22mm
  - Left: 20mm
  - Right: 20mm
Content Area: 108mm x 166mm
```

### 6.2 Cover Page Layout

```
┌─────────────────────────────────┐
│           (margin 22mm)         │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │      [Profile Image]      │  │
│  │          (80px)           │  │
│  │                           │  │
│  │      Display Name         │  │
│  │      @username            │  │
│  │                           │  │
│  │      "Bio text here"      │  │
│  │                           │  │
│  │      📍 Location          │  │
│  │      👥 Followers         │  │
│  │                           │  │
│  │                           │  │
│  │        [Loom Logo]        │  │
│  │                           │  │
│  └───────────────────────────┘  │
│           (margin 22mm)         │
└─────────────────────────────────┘
```

### 6.3 Content Page Layout

```
┌─────────────────────────────────┐
│           (margin 22mm)         │
│  ┌───────────────────────────┐  │
│  │ [Avatar] @username  Date  │  │
│  │                           │  │
│  │ Post content text here... │  │
│  │ with proper line breaks   │  │
│  │                           │  │
│  │ [Image 1] [Image 2]       │  │
│  │ (max 2 images)            │  │
│  │                           │  │
│  │ ♡ 123  💬 45  ↻ 67       │  │
│  │                           │  │
│  │ ─────────────────────────│  │
│  │                           │  │
│  │ (Next post if short...)   │  │
│  │                           │  │
│  └───────────────────────────┘  │
│           (margin 22mm)         │
└─────────────────────────────────┘
```

### 6.4 Last Page Layout

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│                                 │
│                                 │
│          [Loom Logo]            │
│                                 │
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
```

### 6.5 Layout Algorithm

```typescript
function calculateLayout(posts: ThreadsPost[]): PageLayout[] {
  const pages: PageLayout[] = []
  let currentPage: PageLayout = { posts: [] }

  for (const post of posts) {
    const postHeight = calculatePostHeight(post)

    if (postHeight > MAX_PAGE_HEIGHT) {
      // 긴 글: 단독 페이지
      if (currentPage.posts.length > 0) {
        pages.push(currentPage)
        currentPage = { posts: [] }
      }
      pages.push({ posts: [post] })
    } else if (currentPage.height + postHeight > MAX_PAGE_HEIGHT) {
      // 현재 페이지에 안 들어감
      pages.push(currentPage)
      currentPage = { posts: [post], height: postHeight }
    } else {
      // 현재 페이지에 추가
      currentPage.posts.push(post)
      currentPage.height += postHeight
    }
  }

  if (currentPage.posts.length > 0) {
    pages.push(currentPage)
  }

  return pages
}
```

---

## 7. Component Structure

```
src/
├── app/
│   ├── page.tsx                 # Landing
│   ├── login/page.tsx           # Login
│   ├── my/page.tsx              # My Page
│   ├── create/page.tsx          # Create Flow
│   ├── api/
│   │   ├── scrape/route.ts      # 개선
│   │   ├── looms/
│   │   │   ├── route.ts         # GET, POST
│   │   │   └── [id]/route.ts    # GET, DELETE
│   │   └── generate-pdf/route.ts # 개선
│   └── layout.tsx
├── components/
│   ├── landing/
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   └── HowItWorks.tsx
│   ├── auth/
│   │   ├── LoginButton.tsx
│   │   └── UserMenu.tsx
│   ├── loom/
│   │   ├── LoomCard.tsx
│   │   └── LoomList.tsx
│   ├── create/
│   │   ├── UsernameStep.tsx
│   │   ├── SelectPostsStep.tsx
│   │   └── CompleteStep.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Card.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser client
│   │   ├── server.ts            # Server client
│   │   └── middleware.ts        # Auth middleware
│   ├── scraper.ts               # 개선
│   └── pdf/
│       ├── generator.ts         # PDF 생성 로직
│       ├── templates/
│       │   ├── cover.ts
│       │   ├── content.ts
│       │   └── last.ts
│       └── layout.ts            # 레이아웃 계산
└── types/
    ├── threads.ts               # ThreadsPost, ThreadsProfile
    ├── loom.ts                  # Loom, CoverData
    └── database.ts              # Supabase types
```

---

## 8. Implementation Order

### Phase 1: Supabase Setup
1. Supabase 프로젝트 생성 및 환경변수 설정
2. DB 테이블 생성 (SQL 실행)
3. Storage 버킷 생성 및 정책 설정
4. Supabase client 설정 (`lib/supabase/`)

### Phase 2: Auth
1. Supabase Auth 설정 (Google OAuth)
2. 로그인 페이지 구현
3. Auth middleware 구현
4. UserMenu 컴포넌트

### Phase 3: Scraper Enhancement
1. Apify 응답 분석 및 추가 필드 추출
2. ThreadsPost, ThreadsProfile 타입 업데이트
3. scraper.ts 개선

### Phase 4: PDF Design
1. PDF 템플릿 HTML/CSS 작성
2. 커버 페이지 구현
3. 콘텐츠 페이지 구현 (레이아웃 알고리즘)
4. 마지막 페이지 구현
5. generate-pdf API 개선

### Phase 5: Looms API & Storage
1. POST /api/looms - PDF 생성 및 저장
2. GET /api/looms - 목록 조회
3. GET /api/looms/[id] - 상세 및 다운로드 URL
4. DELETE /api/looms/[id] - 삭제

### Phase 6: My Page
1. LoomCard, LoomList 컴포넌트
2. 마이페이지 UI

### Phase 7: Create Flow Improvement
1. UsernameStep (프로필 정보 표시)
2. SelectPostsStep (정렬, 필터, 메타데이터)
3. CompleteStep (저장 완료, 다운로드)

### Phase 8: Landing Page
1. Hero 섹션
2. Features 섹션
3. HowItWorks 섹션

---

## 9. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Apify
APIFY_TOKEN=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 10. Dependencies to Add

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x",
    "@supabase/ssr": "^0.x"
  }
}
```

---

## 11. Additional Features (Implemented)

### 11.1 i18n (Internationalization)

```
src/lib/i18n/
├── context.tsx        # Language context provider
└── translations.ts    # Korean/English translations
```

- 지원 언어: 한국어 (ko), 영어 (en)
- LanguageToggle 컴포넌트로 언어 전환
- localStorage에 언어 설정 저장

### 11.2 Middleware

```typescript
// src/middleware.ts
- Protected routes: /my, /create
- Redirect to /login if not authenticated
```

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-03 | 초안 작성 |
| 2026-02-04 | MVP 구현 완료 - i18n, middleware 추가 |
