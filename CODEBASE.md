# Loom 코드베이스 완전 가이드

> Loom은 Threads 프로필의 포스트를 A5 PDF 책으로 변환하는 웹 서비스입니다.
> 이 문서를 읽으면 프로젝트의 모든 코드를 이해할 수 있습니다.

---

## 목차

1. [아키텍처 개요](#1-아키텍처-개요)
2. [사용자 여정 (플로우)](#2-사용자-여정)
3. [타입 정의](#3-타입-정의)
4. [API 라우트](#4-api-라우트)
5. [PDF 라이브러리](#5-pdf-라이브러리)
6. [React 컴포넌트](#6-react-컴포넌트)
7. [커스텀 훅](#7-커스텀-훅)
8. [유틸리티 & 설정](#8-유틸리티--설정)

---

## 1. 아키텍처 개요

### 기술 스택
- **프레임워크**: Next.js 16 (App Router) + React 19 + TypeScript
- **스타일**: Tailwind CSS v4
- **인증/DB/스토리지**: Supabase (Google OAuth, PostgreSQL, Storage)
- **PDF 생성**: 외부 loom-worker 서비스 (Puppeteer HTML→PDF)
- **AI 책 구조화**: Google Gemini 2.5 Flash
- **스크래핑**: 외부 loom-worker 서비스 (Threads 프로필)
- **i18n**: 자체 구현 (ko/en, 쿠키 기반)

### 핵심 아키텍처 결정
- **Worker 서비스 분리**: Threads 스크래핑과 PDF 생성은 외부 `loom-worker`로 위임. Vercel의 서버리스 함수 타임아웃(10초)을 우회하기 위해 클라이언트에서 직접 Worker를 호출.
- **2-pass 측정 시스템**: 브라우저의 숨겨진 iframe에서 실제 DOM을 렌더링하여 각 콘텐츠 블록의 정확한 높이를 측정한 뒤, bin-packing 알고리즘으로 페이지에 배치.
- **에세이 모드 전용**: AI(Gemini)가 항상 `BookStructure`를 생성하며, 챕터/소챕터 구조의 에세이 스타일로만 렌더링.

### 상태 관리 구조
```
CreateFlowProvider (생성 플로우 전체 상태)
├── usePostSelection      (포스트 필터/정렬/선택)
├── useBookOrganization   (AI 책 구조화)
└── usePdfMeasurement     (PDF 측정 파이프라인)

DashboardProvider (대시보드 상태)
├── 탭 전환, Loom 목록, 선택/삭제
└── 미리보기 URL 관리
```

### 디렉토리 구조
```
src/
├── app/                        # Next.js App Router 페이지
│   ├── page.tsx                # 랜딩 페이지 (서버 컴포넌트)
│   ├── layout.tsx              # 루트 레이아웃 (폰트, Providers)
│   ├── login/page.tsx          # Google OAuth 로그인
│   ├── auth/callback/route.ts  # OAuth 콜백 → 프로필 생성
│   ├── create/page.tsx         # → /dashboard?tab=create 리디렉트
│   ├── dashboard/page.tsx      # 대시보드 (보호된 라우트)
│   ├── test-preview/page.tsx   # PDF 레이아웃 테스트용
│   └── api/
│       ├── scrape/             # Threads 스크래핑
│       ├── looms/              # Loom CRUD
│       ├── looms/[id]/         # 단일 Loom 조회/삭제
│       ├── generate-pdf/       # PDF 생성 (익명)
│       ├── organize-book/      # Gemini AI 책 구조화
│       └── proxy-image/        # Instagram CDN 이미지 프록시
├── components/
│   ├── create/                 # 생성 플로우 UI
│   ├── dashboard/              # 대시보드 UI
│   ├── landing/                # 랜딩 페이지
│   ├── auth/                   # 로그인/사용자 메뉴
│   └── ui/                     # 공통 UI (Icons, Spinner, SpreadViewer)
├── hooks/                      # 커스텀 훅
├── lib/
│   ├── pdf/                    # PDF 생성 핵심 라이브러리
│   │   ├── constants.ts        # 매직넘버 통합
│   │   ├── types.ts            # PDF 관련 타입
│   │   ├── utils.ts            # 공유 유틸리티
│   │   ├── content-blocks.ts   # 콘텐츠 블록 생성
│   │   ├── measure.ts          # DOM 높이 측정
│   │   ├── splitting.ts        # 오버사이즈 블록 분할
│   │   ├── packing.ts          # 페이지 배치 (bin-packing)
│   │   ├── generator.ts        # 페이지 HTML 생성 오케스트레이터
│   │   ├── render.ts           # Worker 서비스 호출
│   │   ├── spreads.ts          # 스프레드(양면) 계산
│   │   └── templates/          # HTML 템플릿 (cover, toc, content, ...)
│   ├── supabase/               # Supabase 클라이언트
│   ├── i18n/                   # 번역 시스템
│   ├── api/                    # API 유틸 (auth, storage, validation)
│   ├── scraper.ts              # 서버 스크래퍼
│   ├── worker-client.ts        # 클라이언트 Worker 호출
│   └── mockdata.ts             # 개발용 목 데이터
└── types/                      # 타입 정의
```

---

## 2. 사용자 여정

### 로그인 흐름
```
/login → Google OAuth → /auth/callback → profiles 테이블 upsert → /dashboard
```

### Loom 생성 흐름 (3단계)
```
Step 1: Username (사용자명 입력)
  └─ submitUsername()
     ├─ Phase 1: scrapeThreadsDirect() → Worker로 Threads 포스트 스크래핑
     ├─ Phase 2: /api/organize-book → Gemini AI로 책 구조 생성
     └─ Phase 3: 'organize' 단계로 이동

Step 2: Organize (구성)
  ├─ TOCSidebar: 챕터/소챕터 목차 표시, 클릭으로 스프레드 이동
  ├─ BookPreview: HTML 페이지를 스프레드(양면)로 미리보기
  │   └─ usePdfMeasurement: iframe 측정 → 블록 분할 → 페이지 배치
  └─ generateLoom()
     ├─ createLoomDirect() → Worker에서 PDF 생성
     ├─ POST /api/looms → DB에 Loom 저장
     └─ 'complete' 단계로 이동

Step 3: Complete (완료)
  ├─ 컨페티 축하 애니메이션
  ├─ PDF 다운로드 링크
  └─ 대시보드로 이동 또는 새 Loom 만들기
```

### PDF 측정 파이프라인 (가장 핵심적인 플로우)
```
orderedPosts + profile + bookStructure
  │
  ▼
generateContentBlocks()
  → cover, blank, preface, toc, chapter-title, sub-chapter, post, last 블록 생성
  │
  ▼
measureBlockHeights()
  → 숨겨진 iframe(559×793px)에서 각 블록의 실제 DOM 높이 측정
  → 이미지 로드 2초 타임아웃, 실패 시 폴백 높이 적용
  │
  ▼
splitOversizedBlocks()
  → SAFE_PAGE_HEIGHT(612px) 초과 블록을 재귀적으로 분할
  → TOC는 .toc-item 단위, 일반 블록은 leaf 요소 + 개행 기준
  │
  ▼
assignBlocksToPages()  (1차)
  → First-fit bin-packing으로 페이지 배치
  → Sub-chapter 고착성 (고아 헤더 방지)
  → Backfill (여백에 다음 블록 끌어오기)
  │
  ▼
buildPageMapping()
  → 블록 ID → 1-based 페이지 번호 매핑
  │
  ▼
generateTocPage(bookStructure, pageMapping)  (2차 — 페이지 번호 포함 TOC 재생성)
  → TOC 재측정 → 재분할 → 재배치 → 재매핑
  │
  ▼
pagesToHtml()
  → 페이지 번호 삽입
  → 홀수 콘텐츠 페이지면 빈 페이지 추가 (양면 인쇄)
  → string[] 반환
  │
  ▼
calculateSpreads()
  → [Cover(우)] [좌|우] [좌|우] ... [Last(좌)]
```

---

## 3. 타입 정의

### `src/types/threads.ts` — Threads 포스트/프로필

```typescript
interface ThreadsPost {
  id: string              // 포스트 고유 ID
  username: string        // 작성자 사용자명
  content: string         // 포스트 내용
  imageUrls: string[]     // 포함된 이미지 URL 배열
  likeCount: number       // 좋아요 수
  replyCount: number      // 댓글 수
  repostCount: number     // 재포스트 수
  postedAt: Date          // 작성 시간
  threadId?: string       // 스레드 ID (셀프 리플라이 체인)
}

interface ThreadsProfile {
  username: string        // 사용자명
  displayName: string     // 표시 이름
  bio: string             // 프로필 소개
  followerCount: number   // 팔로워 수
  profileImageUrl: string // 프로필 이미지 URL
}
```

### `src/types/book.ts` — 책 구조 (AI 생성)

```typescript
interface BookStructure {
  title: string                    // 책 제목 (AI가 지어줌)
  preface: string                  // 서문
  chapters: BookChapter[]          // 챕터 배열
  imageCaptions?: ImageCaption[]   // 이미지 캡션 (AI가 생성)
}

interface BookChapter {
  id: string                       // 영문 슬러그 (예: "daily-thoughts")
  title: string                    // 챕터 제목
  description: string              // 한 줄 설명
  subChapters: BookSubChapter[]    // 소챕터 배열
}

interface BookSubChapter {
  id: string                       // 소챕터 ID
  title: string                    // 소챕터 제목
  postIds: string[]                // 이 소챕터에 포함된 포스트 ID들
}

interface ImageCaption {
  postId: string                   // 포스트 ID
  caption: string                  // AI가 생성한 이미지 캡션
}
```

### `src/types/loom.ts` — Loom 엔티티

```typescript
interface Loom {
  id: string
  userId: string
  threadUsername: string
  threadDisplayName: string | null
  title: string | null             // 책 제목
  postCount: number
  pdfPath: string                  // Supabase Storage 경로
  coverData: CoverData | null      // 표지 정보
  createdAt: Date
}

interface CoverData {
  name: string                     // 작성자 이름
  username: string
  bio: string
  profileImageUrl: string
  followerCount?: number
}
```

### `src/types/database.ts` — Supabase DB 스키마 타입

looms 테이블과 profiles 테이블의 Row/Insert/Update 타입을 정의.
Supabase의 타입 안전한 쿼리를 위해 사용.

### `src/lib/pdf/types.ts` — PDF 전용 타입

```typescript
// 콘텐츠 블록: PDF를 구성하는 최소 단위
interface ContentBlock {
  id: string          // 블록 고유 ID (예: "cover", "post-0-1-2")
  html: string        // 렌더링할 HTML
  type: 'cover' | 'toc' | 'preface' | 'chapter-title'
      | 'sub-chapter' | 'post' | 'last' | 'blank'
  fullPage?: boolean  // true면 한 페이지를 통째로 차지
}

// DOM 측정 후 높이가 추가된 블록
interface MeasuredBlock extends ContentBlock {
  measuredHeight: number  // 실제 렌더링 높이 (px)
}

// 블록 ID → 페이지 번호 매핑 (TOC 페이지 번호 계산용)
type PageMapping = Map<string, number>

// 스레드 포스트들을 하나로 병합한 결과
interface MergedPost {
  content: string       // \n\n으로 연결된 본문
  date: Date
  likeCount: number     // 합산된 좋아요
  imageUrls: string[]   // 모든 이미지 병합
  postIds?: string[]    // 원본 포스트 ID들
}
```

---

## 4. API 라우트

### `POST /api/scrape` — Threads 포스트 스크래핑

서버에서 loom-worker의 `/scrape` 엔드포인트를 호출하여 포스트를 가져옴.

- **입력**: `{ username, limit?, cursor? }`
- **처리**: username에서 `@` 제거 → `scrapeThreads()` 호출
- **응답**: `{ posts: ThreadsPost[], profile: ThreadsProfile, hasMore: boolean }`

### `GET /api/looms` — 내 Loom 목록

로그인한 사용자의 모든 Loom을 최신순으로 조회.

- **인증**: 필수 (`requireAuth()`)
- **응답**: `{ looms: Loom[] }`

### `POST /api/looms` — Loom 생성 및 저장

PDF 생성 후 DB에 Loom 레코드를 저장.

- **인증**: 필수
- **입력**: `{ posts, profile, title?, bookStructure?, pdfPath?, loomId? }`
- **처리**:
  - `pdfPath`가 이미 있으면 (Worker에서 사전 생성) 그대로 사용
  - 없으면 `createLoomPdf()` 호출로 PDF 생성
  - CoverData 객체 생성 → DB insert
  - 1시간 유효 서명 URL 생성
- **응답**: `{ loom, downloadUrl }`
- **에러**: 실패 시 Storage의 PDF 파일 자동 삭제 시도

### `GET /api/looms/[id]` — 단일 Loom 조회

특정 Loom의 상세 정보와 다운로드 URL을 반환.

- **인증**: 필수 (본인 Loom만 접근 가능)
- **응답**: `{ loom, downloadUrl }`

### `DELETE /api/looms/[id]` — Loom 삭제

Storage의 PDF 파일과 DB 레코드를 모두 삭제.

- **인증**: 필수
- **처리**: Storage 삭제 → DB 삭제
- **응답**: `{ success: true }`

### `POST /api/generate-pdf` — 익명 PDF 생성

인증 없이 PDF를 생성. Worker 직접 호출.

- **입력**: `{ posts, profile }`
- **응답**: `{ pdfPath, loomId }`

### `GET /api/proxy-image` — 이미지 프록시

Instagram CDN 이미지를 프록시하여 CORS 문제를 해결.
BookPreview의 iframe에서 CDN 이미지를 직접 로드할 수 없기 때문에 필요.

- **쿼리**: `?url=https://scontent-...cdninstagram.com/...`
- **처리**: User-Agent 헤더로 fetch → 바이너리 반환
- **캐시**: 24시간

### `POST /api/organize-book` — AI 책 구조화

Google Gemini에 포스트를 보내서 챕터/소챕터 구조를 자동 생성.

- **입력**: `{ posts, profile }`
- **처리**:
  1. 포스트를 간소화 (id, content, date, likeCount, hasImages)
  2. Gemini 프롬프트: "작가의 성향과 글을 분석하여 3~7개 챕터로 구성"
  3. JSON 응답 파싱
  4. 미분류 포스트가 있으면 "그 외 이야기" 챕터에 추가
- **응답**: `BookStructure` (title, preface, chapters, imageCaptions)

### `GET /auth/callback` — OAuth 콜백

Google OAuth 인증 코드를 세션으로 교환.

- **처리**: `exchangeCodeForSession()` → 사용자 프로필 조회/생성 → 리디렉트
- **응답**: `/dashboard`로 302 리디렉트

---

## 5. PDF 라이브러리

### 5.1 `constants.ts` — 매직넘버 통합

```
A5 at 96dpi:
  PAGE_WIDTH  = 559px (148mm)
  PAGE_HEIGHT = 793px (210mm)
  PAGE_PADDING_TOP  = 83px (22mm)
  PAGE_PADDING_SIDE = 76px (20mm)
  MAX_PAGE_HEIGHT   = 627px (콘텐츠 최대 높이)
  SAFE_PAGE_HEIGHT  = 612px (페이지 분할 기준 — 15px 여유)

이미지:
  IMAGE_LOAD_TIMEOUT = 2000ms
  IMAGE_FALLBACK_HEIGHTS = { 'essay-inline-image': 200 }
  DEFAULT_IMAGE_FALLBACK = 200

ESSAY:
  CONTENT_HEIGHT          = 627
  SUB_CHAPTER_TITLE_HEIGHT = 40
  POST_HEADER_HEIGHT      = 24  (날짜 + 좋아요)
  POST_MARGIN             = 20
  LINE_HEIGHT             = 24  (10pt × 1.7)
  CHARS_PER_LINE          = 30
  IMAGE_HEIGHT            = 224 (max-height 200 + 여백)
```

### 5.2 `content-blocks.ts` — 콘텐츠 블록 생성

**`generateContentBlocks(posts, profile, bookStructure): ContentBlock[]`**

BookStructure를 기반으로 에세이 스타일 블록을 생성.

**블록 순서**:
1. Cover (fullPage) — 책 제목 + 저자
2. Blank — 커버 뒤 빈 페이지
3. Preface (fullPage) — 서문
4. TOC (fullPage) — 목차
5. 각 챕터마다:
   - Chapter Title (fullPage) — "Chapter 1" + 제목
   - 각 소챕터마다:
     - Sub-chapter 헤더 — 소챕터 제목
     - Post 블록들 — 같은 스레드는 `mergeThreadPosts()`로 병합
6. Last (fullPage) — Loom 로고

**핵심 헬퍼 함수**:
- `generateInlineContent(content, imageUrls, caption)`: 텍스트와 이미지를 인라인 배치. 다단락이면 첫 단락 뒤에 이미지 삽입.
- `renderImagesHtml(imageUrls, caption)`: figure/figcaption으로 이미지 렌더링. 3장 이상이면 세로 적층.

### 5.3 `measure.ts` — DOM 높이 측정

**`measureBlockHeights(blocks): Promise<{ measured, iframe }>`**

화면 밖에 숨겨진 iframe(559×793px)을 만들어 각 블록의 실제 렌더링 높이를 측정.

1. iframe 생성 (position: fixed, left: -9999px)
2. PDF 스타일시트 주입
3. 폰트 로드 대기
4. 각 블록을 순서대로 렌더링 → `getBoundingClientRect().height` 측정
5. 이미지는 2초 타임아웃, 실패 시 CSS class에 따른 폴백 높이 적용

### 5.4 `splitting.ts` — 오버사이즈 블록 분할

**`splitOversizedBlocks(measuredBlocks, iframe): Promise<MeasuredBlock[]>`**

SAFE_PAGE_HEIGHT(612px) 초과 블록을 재귀적으로 분할.

- cover, preface, chapter-title, last, blank은 분할 안 함
- TOC: `.toc-item` 요소 단위로 bin-pack
- 일반 블록: `collectLeaves()` → `refineOversizedLeaves()` → bin-pack

**`collectLeaves(element, maxHeight)`**: DOM 트리를 깊이 우선으로 순회하며 maxHeight 이하 "잎" 요소를 수집. 잎이 너무 크면 자식으로 내려감.

**`refineOversizedLeaves(leaves, maxHeight, ...)`**: 아직 maxHeight를 초과하는 잎을 개행(`\n`) 기준으로 재분할.

### 5.5 `packing.ts` — 페이지 배치

**`assignBlocksToPages(measuredBlocks): MeasuredBlock[][]`**

First-fit bin-packing으로 블록을 페이지에 배치.

1. fullPage 블록 → 새 페이지
2. 일반 블록 → 현재 페이지에 넣을 수 있으면 추가, 아니면 새 페이지
3. **Sub-chapter 고착성**: 페이지 끝에 소챕터 헤더만 남으면 → 다음 페이지로 이동 (고아 헤더 방지)
4. **Backfill**: 현재 페이지에 여백이 있고 다음 페이지 첫 블록이 들어갈 수 있으면 끌어옴

**`buildPageMapping(pageAssignments): PageMapping`**

블록 ID → 1-based 페이지 번호 매핑. TOC에 "p.5" 같은 페이지 번호를 표시하기 위해 사용.

**`pagesToHtml(pageAssignments): string[]`**

페이지 배치를 HTML 문자열 배열로 변환.
- cover, blank, last, chapter-title에는 페이지 번호 미표시
- 콘텐츠 페이지가 홀수면 마지막 앞에 빈 페이지 삽입 (양면 인쇄 대비)

### 5.6 `generator.ts` — 페이지 HTML 생성 오케스트레이터

**`generatePageContents(posts, profile, bookStructure): string[]`**

측정 없이 높이를 추정해서 페이지를 생성하는 동기 함수. `usePdfMeasurement`의 fallback으로 사용.

- `splitSubChapterIntoPages()`로 소챕터를 여러 페이지로 분할. 높이 추정 기반.

**`mergeThreadPosts(posts): MergedPost[]`**

같은 `threadId`를 가진 포스트들을 하나로 병합. 본문은 `\n\n`으로 연결, 좋아요는 합산, 이미지는 배열 병합.

### 5.7 `render.ts` — Worker 서비스 호출

**`createLoomPdf(posts, profile, userId): Promise<{ pdfPath, loomId }>`**

외부 loom-worker의 `/create-loom` 엔드포인트를 POST 호출하여 실제 PDF를 생성.

### 5.8 `spreads.ts` — 스프레드 계산

**`calculateSpreads(pages): SpreadData[]`**

페이지 배열을 양면 스프레드로 변환.

```typescript
interface SpreadData {
  left: string | null   // 왼쪽 페이지 HTML
  right: string | null  // 오른쪽 페이지 HTML
  leftIdx: number       // 페이지 인덱스 (-1 if null)
  rightIdx: number
}
```

레이아웃: `[Cover(우)] [1(좌)|2(우)] [3(좌)|4(우)] ... [Last(좌)]`

### 5.9 `templates/` — HTML 템플릿

| 파일 | 함수 | 설명 |
|------|------|------|
| `cover.ts` | `generateCoverPage(profile, bookTitle?)` | 표지: 제목 + 저자 정보 + Loom 로고 |
| `toc.ts` | `generateTocPage(bookStructure, pageMapping?)` | 목차: 챕터/소챕터 번호 + 제목 + 페이지 번호 |
| `preface.ts` | `generatePrefacePage(preface)` | 서문 페이지 |
| `chapter.ts` | `generateChapterTitlePage(chapter, index)` | 챕터 제목 페이지: "Chapter 1" + 제목 + 설명 |
| `chapter.ts` | `generateSubChapterTitle(title, chapterIdx?, subIdx?)` | 소챕터 헤더: "1.2 제목" |
| `content.ts` | `generateEssaySubChapterPage(title, posts, ...)` | 소챕터 제목 + 포스트 |
| `content.ts` | `generateEssayContinuationPage(posts, ...)` | 오버플로우 (제목 없는 이어지는 페이지) |
| `last.ts` | `generateLastPage()` | 마지막 페이지: Loom 로고 |
| `styles.ts` | `PDF_STYLES` | 전체 PDF CSS. A5 148×210mm, 폰트 10pt |
| `logo.ts` | `LOOM_LOGO_SVG` | Loom 로고 Base64 이미지 |

---

## 6. React 컴포넌트

### 6.1 생성 플로우 (`src/components/create/`)

#### `CreateFlowContext.tsx`
Context 타입 정의. `state` / `actions` / `meta` 3분할 구조.
- `useCreateFlow()` 훅으로 접근

#### `CreateFlowProvider.tsx` (239줄)
생성 플로우의 전체 상태를 관리하는 Provider.

- **Core state** (9개): step, posts, profile, downloadUrl, loading, error, currentSpread, currentUsername, loadingPhase
- **합성 훅**:
  - `useBookOrganization(posts, profile)` → book
  - `usePostSelection(posts, book.bookStructure)` → selection
  - `usePdfMeasurement(selection.orderedPosts, profile, book.bookStructure)` → pdf
- **주요 액션**:
  - `submitUsername()`: Phase 1(스크래핑) → Phase 2(AI 구조화) → Phase 3(이동)
  - `generateLoom()`: Worker PDF 생성 → DB 저장 → complete 이동
  - `createAnother()`: 전체 상태 초기화
- Context value는 `useMemo`로 래핑

#### `UsernameStep.tsx`
Threads 사용자명 입력 화면. `@` 접두사 자동 표시, 에러 시 shake 애니메이션.
- `SubmitButtonContent` 하위 컴포넌트: loading/scraping/organizing 상태별 텍스트

#### `BookPreview.tsx`
HTML 페이지를 스프레드(양면)로 미리보기.
- 각 페이지를 `PageFrame` (iframe, srcDoc)으로 렌더링
- CDN 이미지 URL을 `/api/proxy-image`로 프록시
- `useSpreadViewer` 훅으로 플립 애니메이션 + 줌 + 키보드 제어
- 하단 바: 스프레드 슬라이더, 줌 컨트롤, PDF 생성 버튼

#### `TOCSidebar.tsx` (314줄)
오른쪽 사이드바 — 목차 및 책 구조 표시.
- **ChapterList → ChapterItem → SubChapterItem** 중첩 구조
- 각 항목 클릭 → `goToSpread()` 호출로 해당 스프레드로 이동
- `postMap`은 `useMemo`로 부모에서 계산 후 prop으로 전달
- 상단: 프로필, 북 제목, 뒤로가기/재생성/생성 버튼
- organizing 중이면 `ShimmerLoading` 표시

#### `CompleteStep.tsx`
완료 화면. 24개의 컨페티 조각 애니메이션 (Threads 팔레트 색상), 체크 아이콘 바운스.
PDF 다운로드 / 대시보드 이동 / 새로 만들기 버튼.

#### `ProgressIndicator.tsx`
3단계 진행률 표시기. `getStepStyle()` 헬퍼로 완료/현재/미래 스타일 구분.

#### `ErrorBanner.tsx`
에러 메시지 배너. shake + fadeInUp 애니메이션.

#### `PostListSidebar.tsx`
왼쪽 사이드바 — 포스트 목록. 검색, 정렬(최신/오래된순), 전체 선택/해제.
각 포스트: 체크박스 + 내용(3줄) + 이미지 미리보기 + 좋아요.
IntersectionObserver 기반 무한 스크롤.

### 6.2 대시보드 (`src/components/dashboard/`)

#### `DashboardContext.tsx`
대시보드 상태 관리. `useMemo`로 context value 래핑.
- **상태**: activeTab, looms, selectedLoom, previewUrl, loadingPreview, previewModalOpen, deletingId
- **액션**: setActiveTab (URL 쿼리도 업데이트), selectLoom (미리보기 URL 로드), deleteLoom (확인 대화상자 → 삭제), openPreviewModal, addLoom

#### `DashboardShell.tsx`
대시보드 레이아웃 컨테이너. 탭별 콘텐츠를 `hidden` CSS로 전환 (상태 유지).
`useResizable` 훅 2개 사용 (looms 탭 600px, create 탭 680px).
```
Sidebar | LoomsTab + 리사이저 + LoomPreviewPanel   (looms 탭)
Sidebar | CreateTabContent + 리사이저 + CreateTabRightPanel  (create 탭)
```

#### `LoomsTab.tsx`
Loom 카드 그리드. 180px 카드에 미니 북 커버 디자인:
- 왼쪽 검은색 스파인 + 제목 + 구분선 + @사용자명
- 아바타 + 이름 + 날짜
- 호버 시 다운로드/삭제 버튼 표시
- 싱글클릭: 미리보기 로드, 더블클릭: 전체화면 모달

#### `LoomPreviewPanel.tsx`
PDF 미리보기 패널. 다양한 모드 지원:
- **Shell 모드** (`children` prop): 커스텀 콘텐츠 래퍼 (CreateTab에서 BookPreview를 감쌀 때)
- **PDF 모드** (`previewUrl`): react-pdf로 실제 PDF 표시
- **빈 상태**: "Loom을 선택하세요" 메시지
- props로 오버라이드 가능 (DashboardContext 독립적 사용)

#### `PreviewModal.tsx`
전체화면 PDF 미리보기 모달. react-pdf + `useSpreadViewer`로 플립 애니메이션.
Escape 키로 닫기. 하단: 스프레드 슬라이더 + 줌 컨트롤.

#### `CreateTab.tsx`
대시보드의 Create 탭. `CreateTabContent` (왼쪽: 단계별 UI) + `CreateTabRightPanel` (오른쪽: 미리보기).
complete 단계에서는 실제 PDF를 LoomPreviewPanel로 표시.

#### `Sidebar.tsx`
왼쪽 네비게이션. Looms/Create 탭 전환. 하단에 프로필 + 설정 버튼.

### 6.3 랜딩 & 인증

#### `LandingContent.tsx`
랜딩 페이지. 5개 섹션: Hero, How It Works (3단계), Features (2×2 그리드), CTA, Footer.
- `useScrollAnimation()`: IntersectionObserver로 스크롤 시 CSS 애니메이션 트리거
- `useParallax()`: 스크롤에 따른 배경 블롭 패럴랙스
- `STEPS`, `FEATURES`, `FEATURE_ICONS` 상수는 모듈 레벨에 호이스팅

#### `UserMenu.tsx`
프로필 드롭다운. 아바타 클릭 → 이름/이메일 표시 + 로그아웃 버튼.
`t('auth.signOut')` i18n 적용.

#### `LoginButton.tsx`
`/login` 링크. 텍스트만 표시.

### 6.4 UI 컴포넌트 (`src/components/ui/`)

#### `Icons.tsx`
SVG 아이콘 컬렉션: ArrowRight, ChevronLeft/Right, BookOpen, Check, Search, Download, Trash, Plus, Heart, Comment, Repost, Eye, Share.

#### `Spinner.tsx`
- `Spinner`: 3개 점 펄스 애니메이션 (sm/md/lg)
- `SpinnerSvg`: 회전 스피너 SVG

#### `SpreadViewer.tsx`
책 뷰어 UI 컴포넌트 모음:
- `FlipContainer<T>`: 3D 페이지 플립 애니메이션. `FlipPage` 제네릭 컴포넌트로 앞/뒤 면 렌더링.
- `SpreadViewerContainer`: 메인 뷰어 영역 + 좌우 화살표
- `ZoomTransform`: scale/translate 적용 래퍼
- `SpreadSlider`: 현재 스프레드 범위 슬라이더
- `ZoomControls`: 줌 아웃/리셋(백분율)/줌 인 버튼

---

## 7. 커스텀 훅

### `usePostSelection(posts, bookStructure, initialSelectedIds?)`
포스트 필터링/정렬/선택 로직을 캡슐화.

- **상태**: selectedIds (Set), sortOrder, searchQuery, displayLimit, loadingMore
- **계산값**:
  - `filteredAndSortedPosts`: 검색어 필터 → 날짜 정렬 → displayLimit 슬라이스
  - `selectedPosts`: 선택된 것만 필터 + 정렬
  - `orderedPosts`: bookStructure가 있으면 챕터/소챕터 순서대로, 없으면 selectedPosts 그대로
- **콜백**: togglePost, toggleAll (functional setState 패턴), loadMorePosts (300ms 딜레이)
- `hasMore`: displayLimit < posts.length

### `useBookOrganization(posts, profile, initialBookStructure?)`
AI 책 구조화 상태 관리.

- **상태**: bookStructure, organizing
- **콜백**:
  - `organizeBook()`: `/api/organize-book` POST → BookStructure 반환 (throw on error)
  - `regenerateStructure()`: bookStructure를 null로 리셋

### `usePdfMeasurement(orderedPosts, profile, bookStructure)`
PDF 측정 파이프라인 전체를 캡슐화.

- **상태**: pages (HTML[]), measuring, pageAssignmentsRef, pageMappingRef, spreadTarget
- **핵심 useEffect**: orderedPosts/profile/bookStructure 변경 시 전체 파이프라인 실행 (셋 중 하나라도 없으면 early return)
  - 블록 생성 → 높이 측정 → 분할 → 배치 → TOC 재생성(2-pass) → HTML 변환
  - `cancelled` 플래그로 cleanup 시 진행 중인 비동기 작업 무효화
  - 실패 시 bookStructure가 있으면 `generatePageContents()` 동기 폴백, 없으면 빈 배열
- **계산값**:
  - `spreads`: `calculateSpreads(pages)`
  - `blockToSpread`: 블록 ID → 스프레드 인덱스 (TOCSidebar 네비게이션용)

### `useResizable(initial, min, max)`
드래그 리사이즈 로직.

- **상태**: width, isResizing
- **반환**: `{ width, isResizing, handleMouseDown, containerRef }`
- 마우스 이동 시 containerRef의 rect.right - clientX로 새 너비 계산
- 리사이징 중 `cursor: col-resize`, `user-select: none` 적용

### `useSpreadViewer(totalSpreads, pageWidth, pageHeight, containerRef, resetKey?)`
스프레드 뷰어 제어 — 플립 애니메이션, 줌, 팬.

- **상태**: nav (currentSpread, flipState), scale (0.5~3.0), offset (x,y), isDragging
- **플립 애니메이션**: goToSpread → pending → requestAnimationFrame → animating → 0.6s transition → handleFlipEnd → currentSpread 업데이트
- **줌**: zoomIn/zoomOut (0.25 단위), 휠 스크롤 (0.1 단위), resetZoom
- **팬**: scale > 1일 때만 활성. 마우스 드래그로 오프셋 조정.
- **키보드**: 좌/우 화살표 (이동), +/- (줌), 0 (리셋)
- **resetKey**: 변경 시 `useEffect`로 currentSpread=0, flipState=null 리셋

---

## 8. 유틸리티 & 설정

### `src/lib/supabase/client.ts`
브라우저용 Supabase 클라이언트. `createBrowserClient<Database>()`.

### `src/lib/supabase/server.ts`
서버용 Supabase 클라이언트. 쿠키 기반 세션 관리. 서버 컴포넌트에서 사용.

### `src/lib/supabase/middleware.ts`
모든 요청에서 세션 갱신. 보호된 라우트(`/dashboard`) 접근 시 미로그인이면 `/login`으로 리디렉트.

### `src/lib/i18n/context.tsx`
- `I18nProvider`: locale 상태 관리 + 쿠키 저장 (1년)
- `useI18n()` → `{ locale, setLocale, t }`
- `t(key)`: 현재 locale에서 번역 조회 → 영어 폴백 → key 반환

### `src/lib/i18n/translations.ts`
한국어/영어 번역 데이터. 카테고리: nav, hero, howItWorks, features, cta, footer, login, dashboard, create, auth, setting.

### `src/lib/scraper.ts`
서버에서 loom-worker의 `/scrape`를 호출. `LOOM_WORKER_URL` + `WORKER_API_KEY` 환경변수 사용.

### `src/lib/worker-client.ts`
**클라이언트**에서 직접 loom-worker를 호출 (Vercel 타임아웃 우회).
- `scrapeThreadsDirect(username, limit)`: 포스트 스크래핑
- `createLoomDirect(posts, profile, userId, bookStructure?)`: PDF 생성

### `src/lib/api/auth.ts`
`requireAuth()`: 서버 Supabase로 사용자 확인. 실패 시 `AuthError` throw.

### `src/lib/api/storage.ts`
`getSignedDownloadUrl(supabase, pdfPath)`: `looms-pdf` 버킷에서 1시간 유효 서명 URL 생성.

### `src/lib/api/validation.ts`
`parseLoomInput(body)`: posts와 profile 존재 여부 검증. 실패 시 `ValidationError` throw.

### `src/lib/utils/format.ts`
- `formatNumber(num)`: 1K, 1.5M 형식
- `escapeHtml(text)`: XSS 방지 이스케이프
- `formatDate(date)`: ISO "2026-02-16" 형식

### `src/lib/mockdata.ts`
개발용 목 데이터. `USE_MOCK_DATA = true`일 때 스크래핑 없이 바로 organize 단계로 진입.
- `MOCK_PROFILE`: Sol You 프로필
- `MOCK_POSTS`: 8개 포스트 (일상, 유머, 에세이 등)
- `MOCK_BOOK_STRUCTURE`: 미리 정의된 챕터 구조

### `next.config.ts`
Instagram CDN 이미지(`*.cdninstagram.com`) 허용 설정.

### `middleware.ts` (루트)
`updateSession()` 호출 — 모든 요청에서 세션 갱신 + 보호된 라우트 체크.

### `playwright.config.ts`
Playwright 테스트 설정. localhost:3000 대상.

---

## 파일 간 의존 관계 (핵심)

```
[브라우저]
  UsernameStep → submitUsername()
    → worker-client.ts → loom-worker /scrape
    → /api/organize-book → Gemini AI

  BookPreview → usePdfMeasurement
    → content-blocks.ts → measure.ts → splitting.ts → packing.ts
    → spreads.ts → useSpreadViewer → SpreadViewer.tsx

  TOCSidebar → blockToSpread (from usePdfMeasurement)
    → goToSpread → spreadTarget → useSpreadViewer

  generateLoom()
    → worker-client.ts → loom-worker /create-loom
    → /api/looms POST → Supabase DB + Storage

[서버]
  /api/looms → auth.ts → supabase/server.ts → DB
  /api/looms/[id] → storage.ts → Supabase Storage 서명 URL
  /api/organize-book → @google/generative-ai → Gemini API
  /api/proxy-image → fetch(Instagram CDN) → 바이너리 반환
```
