# CLAUDE.md

## Project Overview

Loom은 Threads 프로필의 포스트를 A5 PDF 책으로 변환하는 웹 서비스입니다.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Auth / DB / Storage**: Supabase (Google OAuth, PostgreSQL, Storage)
- **PDF**: Puppeteer (HTML → PDF 렌더링) + pdf-lib (후처리)
- **Scraping**: Apify API (Threads 포스트 수집)
- **i18n**: 자체 구현 (ko/en, React Context)
- **Design**: Pencil `.pen` 파일 (`pencil/loom.pen`)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # 랜딩 페이지 (서버 컴포넌트)
│   ├── layout.tsx          # 루트 레이아웃 (Geist 폰트, Providers)
│   ├── login/              # 로그인 페이지
│   ├── auth/callback/      # OAuth 콜백 처리
│   ├── create/             # Loom 생성 플로우
│   ├── my/                 # 내 Loom 목록 + 관리
│   └── api/
│       ├── scrape/         # Threads 스크래핑 API
│       ├── looms/          # Loom CRUD API
│       ├── generate-pdf/   # PDF 생성 API
│       └── proxy-image/    # 이미지 프록시 API
├── components/
│   ├── auth/               # LoginButton, UserMenu
│   ├── create/             # 생성 플로우 (UsernameStep, BookPreview, PostListSidebar 등)
│   ├── landing/            # LandingContent
│   ├── ui/                 # 공통 UI (Icons, Spinner)
│   ├── Providers.tsx       # 클라이언트 프로바이더 래퍼
│   └── LanguageToggle.tsx  # 언어 전환
├── lib/
│   ├── api/                # API 유틸 (auth, storage, validation)
│   ├── i18n/               # 번역 (translations.ts, context.tsx)
│   ├── pdf/                # PDF 생성 (generator, layout, render, spreads, templates/)
│   ├── supabase/           # Supabase 클라이언트 (client, server, middleware)
│   ├── scraper.ts          # Apify 스크래퍼
│   ├── mockdata.ts         # 목 데이터
│   └── utils/format.ts     # 날짜 포맷
├── types/
│   ├── database.ts         # Supabase DB 타입
│   ├── loom.ts             # Loom, CoverData 인터페이스
│   └── threads.ts          # ThreadsPost, ThreadsProfile 인터페이스
└── proxy.ts                 # Supabase 세션 갱신 (Next.js proxy)
```

## Commands

```bash
npm run dev       # 개발 서버 (localhost:3000)
npm run build     # 프로덕션 빌드
npm run start     # 프로덕션 서버
npm run lint      # ESLint 실행
```

## Environment Variables

`.env.local` 파일에 아래 값 필요:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
APIFY_TOKEN=
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
- **임포트**: `@/` 경로 별칭 사용 (`src/` 기준)
- **스타일**: Tailwind CSS 유틸리티 클래스 직접 사용, 별도 CSS 모듈 없음
- **상태**: React 19 `use()`, Context API 활용
- **타입**: `src/types/`에 인터페이스 정의, Supabase DB 타입은 `database.ts`

## Design File

- `pencil/loom.pen` — Pencil MCP 도구로만 읽기/수정 가능 (Read/Grep 사용 불가)
- Lunaris 디자인 시스템: 100개 재사용 가능 컴포넌트 (Button, Card, Table, Modal, Input 등)