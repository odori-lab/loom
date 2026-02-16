# CLAUDE.md

## Project Overview

Loom은 Threads 프로필의 포스트를 A5 PDF 책으로 변환하는 웹 서비스입니다.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Auth / DB / Storage**: Supabase (Google OAuth, PostgreSQL, Storage)
- **PDF**: Puppeteer (HTML → PDF 렌더링) + pdf-lib (후처리)
- **Scraping**: Puppeteer 자체 구현 (Threads 로그인 + 무한 스크롤)
- **i18n**: 자체 구현 (ko/en, React Context)
- **Design**: Pencil `.pen` 파일 (`pencil/loom.pen`)

## Project Structure (Monorepo)

pnpm workspace 기반 모노레포. `pnpm-workspace.yaml`로 워크스페이스 관리.

```
loom/                              # repo root
├── package.json                   # 루트 (scripts 없음)
├── pnpm-workspace.yaml            # pnpm workspace 설정
├── tsconfig.base.json             # 공통 TS 설정
├── .gitignore
├── .github/
├── CLAUDE.md
├── supabase/
│
├── loom/                          # Next.js 앱 (@loom/web)
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── postcss.config.mjs
│   ├── tailwind.config.ts
│   ├── eslint.config.mjs
│   ├── vercel.json
│   ├── playwright.config.ts
│   ├── public/
│   ├── src/
│   │   ├── app/                   # Next.js App Router
│   │   ├── components/            # React 컴포넌트
│   │   ├── hooks/                 # Custom hooks
│   │   └── lib/                   # 유틸, PDF, Supabase 등
│   └── tests/
│
├── loom-worker/                   # Railway 워커 (@loom/worker)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts
│
└── packages/                      # 공유 패키지 (@loom/shared)
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts               # barrel export
        └── types/
            ├── threads.ts         # ThreadsPost, ThreadsProfile
            ├── loom.ts            # Loom, CoverData
            ├── book.ts            # BookStructure, BookChapter 등
            └── database.ts        # Database, Json (Supabase)
```

## Commands

```bash
# 루트에서 실행
pnpm install                       # 전체 워크스페이스 의존성 설치
pnpm --filter @loom/web dev        # Next.js 개발 서버
pnpm --filter @loom/web build      # Next.js 프로덕션 빌드
pnpm --filter @loom/web lint       # ESLint 실행
pnpm --filter @loom/worker dev     # Worker 개발 모드
pnpm --filter @loom/worker build   # Worker 빌드

# 또는 각 워크스페이스 디렉토리에서 직접 실행
cd loom && pnpm dev
cd loom-worker && pnpm dev
```

## Environment Variables

`loom/.env.local` 파일에 아래 값 필요:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
THREADS_USERNAME=
THREADS_PASSWORD=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database

- Supabase PostgreSQL, RLS 활성화
- 테이블: `profiles`, `looms`
- 스토리지 버킷: `looms-pdf` (private)
- 스키마: `supabase/schema.sql`

## Conventions

- **언어**: 코드와 커밋 메시지는 영어, 사용자 대면 텍스트는 한/영 i18n
- **컴포넌트**: 서버 컴포넌트 기본, 클라이언트는 `'use client'` 명시
- **임포트**: `@/` 경로 별칭 (`loom/src/` 기준), 공유 타입은 `@loom/shared`
- **스타일**: Tailwind CSS 유틸리티 클래스 직접 사용, 별도 CSS 모듈 없음
- **상태**: React 19 `use()`, Context API 활용
- **타입**: `packages/src/types/`에 인터페이스 정의 → `@loom/shared`로 import
- **패키지 관리**: pnpm workspace (모노레포)

## Design File

- `pencil/loom.pen` — Pencil MCP 도구로만 읽기/수정 가능 (Read/Grep 사용 불가)
- Lunaris 디자인 시스템: 100개 재사용 가능 컴포넌트 (Button, Card, Table, Modal, Input 등)

## Design System (Threads/Instagram Style)

2025-02-14 프론트엔드 디자인 리뉴얼 적용. Threads/Instagram UI Kit 기반.

### Design References

- [Threads UI Kit [+Variables]](https://www.figma.com/community/file/1259155154706439261/threads-ui-kit-variables)
- [Instagram UI Kit](https://www.figma.com/community/file/1056003846779672834/instagram-ui-kit)

### Color Palette

- **Primary**: `#000000` (black), `#ffffff` (white) — 고대비
- **Gray scale**: `#fafafa`, `#f5f5f5`, `#f0f0f0`, `#e0e0e0`, `#999999`, `#737373`, `#333333`
- **Backgrounds**: `#ffffff` (기본), `#fafafa` (컨테이너), `#f5f5f5` (인풋)
- **Borders**: `#e0e0e0` (기본), `#f0f0f0` (디바이더)
- **Accent**: 최소한 — 링크/활성 상태에만 사용

### Interactions & Animations

- **Transitions**: 150ms 기본 (snappy, native-feeling)
- **Press feedback**: `active:scale-[0.96]` (Threads 탭 피드백)
- **Hover**: subtle translateY, background color change
- **Scroll animations**: 350ms, Intersection Observer 기반
- **GPU 가속**: transform/opacity만 사용
- **외부 라이브러리 없음**: 순수 CSS @keyframes + Tailwind @utility

### Global CSS Animations (`globals.css`)

재사용 가능한 @keyframes + @utility 클래스:
- `animate-fade-in-up`, `animate-fade-in`, `animate-slide-in-left`, `animate-slide-in-right`
- `animate-shimmer`, `animate-float`, `animate-gradient-shift`
- `animate-bounce-in`, `animate-confetti`, `animate-shake`, `animate-scale-in`
- `animate-pulse-soft`, `animate-spin-slow`
- `animate-delay-100` ~ `animate-delay-1000` (스태거 딜레이)

### Component Style

- **Buttons**: `rounded-xl` (10-12px), solid black primary, `#f5f5f5` secondary
- **Inputs**: `#f5f5f5` 배경, `focus:border-black`
- **Cards**: 최소 border, white bg, subtle hover
- **Avatars**: `rounded-full`, thin `#e0e0e0` border
- **Shadows**: 최소한 — `rgba(0,0,0,0.08)` 수준만 사용
- **Typography**: Pretendard, 15px body, 14px bold username, 13px secondary

## Design Revamp Team (2025-02-14)

Agent Teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`)를 활용한 병렬 작업.

### Team Structure

| Agent | Role | Scope |
|-------|------|-------|
| **team-lead** | 프론트엔드 팀 리더 | 태스크 분배, 디자인 가이드 전달, 코드 리뷰 |
| **landing-designer** | 랜딩 페이지 전담 | `LandingContent.tsx` — 스크롤 애니메이션, 패럴랙스, 마이크로 인터랙션 |
| **dashboard-designer** | 대시보드 전담 | `Sidebar`, `LoomsTab`, `DashboardShell` — 카드 애니메이션, 탭 전환, 검색 |
| **create-flow-designer** | 생성 플로우 전담 | `UsernameStep`, `PostListSidebar`, `BookPreview`, `CompleteStep` 등 — 스텝 전환, 컨페티 |
| **ui-polisher** | 공통 UI/글로벌 전담 | `globals.css`, `login`, `Spinner`, `UserMenu`, `PreviewModal` — 글로벌 애니메이션, 로그인 |

### Modified Files

```
loom/src/app/globals.css                          # 25+ @keyframes, @utility, 스크롤바, focus-visible
loom/src/app/login/page.tsx                       # 미니멀 화이트 로그인
loom/src/components/landing/LandingContent.tsx    # 스크롤 애니메이션, 680px 피드 폭
loom/src/components/dashboard/Sidebar.tsx         # 탭 전환 애니메이션
loom/src/components/dashboard/LoomsTab.tsx        # 카드 스태거 입장, 셀렉션
loom/src/components/dashboard/DashboardShell.tsx  # 패널 전환 효과
loom/src/components/dashboard/PreviewModal.tsx    # 모달 입장 애니메이션
loom/src/components/create/UsernameStep.tsx       # 인풋 포커스, 에러 셰이크
loom/src/components/create/PostListSidebar.tsx    # 포스트 셀렉션, 스크롤 페이드
loom/src/components/create/BookPreview.tsx        # 페이지 플립, 스파인 섀도
loom/src/components/create/CompleteStep.tsx       # 컨페티 버스트, 축하 효과
loom/src/components/create/ProgressIndicator.tsx  # 스텝 인디케이터 애니메이션
loom/src/components/create/ErrorBanner.tsx        # 셰이크 + 페이드 입장
loom/src/components/dashboard/CreateTab.tsx       # 스텝 전환 애니메이션
loom/src/components/ui/Spinner.tsx                # 3-dot 펄스 스피너
loom/src/components/auth/UserMenu.tsx             # 드롭다운 애니메이션
loom/src/components/LanguageToggle.tsx            # 토글 호버/프레스
```

### Workflow

1. `TeamCreate` → 팀 + 태스크 리스트 생성
2. `TaskCreate` × 4 → 영역별 태스크 정의
3. `Task` (general-purpose, bypassPermissions) × 4 → 팀원 병렬 생성
4. 팀원 메인 태스크 완료 → Threads/Instagram 스타일 리뷰 피드백
5. 리뷰 반영 완료 → `npm run build` 검증 → 팀 종료