# Phase 1: Schema/Terminology Design Document

> **Summary**: Unthread 서비스의 데이터 모델, 용어, API 설계
>
> **Project**: Unthread
> **Version**: 0.1.0
> **Date**: 2026-02-01
> **Status**: Draft
> **Planning Doc**: [phase-1-schema.plan.md](../../01-plan/features/phase-1-schema.plan.md)

---

## 1. Terminology (용어 정의)

| Term | Definition | Original | Notes |
|------|------------|----------|-------|
| ThreadsUser | 스크래핑 대상 Threads 계정 | Threads 유저 | username으로 식별 |
| Order | 결제 건 | 주문 | Stripe Checkout Session과 1:1 |
| ScrapeJob | 스크래핑 작업 단위 | 스크래핑 작업 | 결제 완료 후 생성 |
| ThreadsPost | 스크래핑된 개별 게시물 | 스레드 글 | 텍스트 + 이미지 URL |
| PdfFile | 생성된 PDF 파일 정보 | PDF 파일 | 다운로드 URL 포함 |

---

## 2. Architecture

### 2.1 System Flow

```
┌──────────┐    ┌───────────────┐    ┌──────────────┐    ┌───────────┐    ┌──────────┐
│  Client  │───▶│ POST /api/    │───▶│   Stripe     │───▶│  Webhook  │───▶│ Scraper  │
│ (Input   │    │ checkout      │    │  Checkout    │    │ /api/     │    │ (Puppteer│
│  Form)   │    │               │    │  Session     │    │ webhook   │    │  + PDF)  │
└──────────┘    └───────────────┘    └──────────────┘    └───────────┘    └──────────┘
                                                                               │
                                                                               ▼
                                                                         ┌──────────┐
                                                                         │ Download  │
                                                                         │ /api/     │
                                                                         │ download  │
                                                                         └──────────┘
```

### 2.2 Data Flow

```
1. User inputs Threads username
2. POST /api/checkout → creates Stripe Checkout Session
3. User completes payment on Stripe
4. Stripe sends webhook → POST /api/webhook
5. Webhook creates ScrapeJob (status: pending)
6. Server scrapes Threads posts (status: scraping)
7. Server generates PDF (status: generating_pdf)
8. PDF ready → (status: completed) → download URL available
9. User redirected to /success?session_id=xxx → download link shown
```

---

## 3. Data Model

### 3.1 Entity Definitions

```typescript
// types/order.ts
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface Order {
  id: string
  stripeSessionId: string
  stripePaymentIntentId?: string
  threadsUsername: string
  email: string
  amount: number            // cents
  currency: string          // 'usd'
  status: OrderStatus
  createdAt: Date
  updatedAt: Date
}
```

```typescript
// types/scrape-job.ts
export type ScrapeJobStatus = 'pending' | 'scraping' | 'generating_pdf' | 'completed' | 'failed'

export interface ScrapeJob {
  id: string
  orderId: string
  threadsUsername: string
  status: ScrapeJobStatus
  postCount: number         // 스크래핑된 글 수
  pdfUrl?: string           // 생성된 PDF 경로
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
}
```

```typescript
// types/threads-post.ts
export interface ThreadsPost {
  id: string
  jobId: string
  content: string
  imageUrls: string[]
  likeCount?: number
  replyCount?: number
  postedAt: Date
  scrapedAt: Date
}
```

### 3.2 Entity Relationships

```
┌─────────┐      1:1      ┌────────────┐      1:N      ┌──────────────┐
│  Order  │──────────────▶│  ScrapeJob │──────────────▶│ ThreadsPost  │
└─────────┘               └────────────┘               └──────────────┘
     │                          │
     │ stripeSessionId          │ pdfUrl
     ▼                          ▼
  [Stripe]                  [PDF File]
```

### 3.3 Storage Strategy

이 프로젝트는 **DB 없이** 동작한다. 모든 상태는:
- **Stripe**: 결제 정보 (source of truth)
- **파일시스템**: PDF 파일 (`/tmp` 또는 `/public/downloads/`)
- **메모리/JSON**: 스크래핑 작업 상태 (서버 재시작 시 유실 허용)

> v2에서 DB 추가 가능 (SQLite 또는 Supabase)

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/checkout` | Stripe Checkout Session 생성 | None |
| POST | `/api/webhook` | Stripe Webhook 처리 | Stripe Signature |
| GET | `/api/status/[sessionId]` | 작업 상태 조회 | None |
| GET | `/api/download/[sessionId]` | PDF 다운로드 | None (session ID가 인증 역할) |

### 4.2 Detailed Specification

#### `POST /api/checkout`

**Request:**
```json
{
  "threadsUsername": "zuck",
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/c/pay_xxx"
}
```

#### `POST /api/webhook`

Stripe가 호출. `checkout.session.completed` 이벤트 처리.

#### `GET /api/status/[sessionId]`

**Response (200):**
```json
{
  "status": "scraping",
  "postCount": 42,
  "pdfUrl": null
}
```

#### `GET /api/download/[sessionId]`

**Response**: PDF 파일 바이너리 (Content-Type: application/pdf)

---

## 5. UI/UX Design

### 5.1 Pages

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | 유저 아이디 입력 + 결제 버튼 |
| Success | `/success` | 결제 완료 + 진행 상태 + 다운로드 |
| Cancel | `/cancel` | 결제 취소 안내 |

### 5.2 User Flow

```
[Home Page]
  │  Input: Threads username + email
  │  Click: "PDF 만들기 (₩X,XXX)"
  ▼
[Stripe Checkout]
  │  결제 완료
  ▼
[Success Page]
  │  진행 상태 표시 (polling)
  │  "스크래핑 중... (42개 글 발견)"
  │  "PDF 생성 중..."
  ▼
[Download Ready]
     "다운로드" 버튼 활성화
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `UsernameForm` | `src/components/UsernameForm.tsx` | username + email 입력 폼 |
| `StatusTracker` | `src/components/StatusTracker.tsx` | 작업 진행 상태 표시 |
| `DownloadButton` | `src/components/DownloadButton.tsx` | PDF 다운로드 버튼 |

---

## 6. Error Handling

| Code | Situation | User Message |
|------|-----------|-------------|
| `INVALID_USERNAME` | Threads 유저를 찾을 수 없음 | "존재하지 않는 Threads 계정입니다" |
| `PAYMENT_FAILED` | Stripe 결제 실패 | "결제에 실패했습니다. 다시 시도해주세요" |
| `SCRAPE_FAILED` | 스크래핑 실패/차단 | "스크래핑에 실패했습니다. 환불 처리됩니다" |
| `PDF_GENERATION_FAILED` | PDF 생성 오류 | "PDF 생성 중 오류가 발생했습니다" |
| `SESSION_NOT_FOUND` | 잘못된 session ID | "유효하지 않은 세션입니다" |

---

## 7. Security Considerations

- [x] Stripe Webhook 서명 검증 (STRIPE_WEBHOOK_SECRET)
- [x] Session ID를 통한 다운로드 접근 제어 (추측 불가능한 ID)
- [x] Rate limiting on `/api/checkout` (abuse 방지)
- [x] 입력값 검증 (username 형식)
- [x] PDF 파일 일정 시간 후 자동 삭제

---

## 8. Implementation Order

1. [ ] TypeScript 타입 정의 (`src/types/`)
2. [ ] Stripe Checkout API (`src/app/api/checkout/`)
3. [ ] Stripe Webhook API (`src/app/api/webhook/`)
4. [ ] Threads 스크래핑 로직 (`src/lib/scraper.ts`)
5. [ ] PDF 생성 로직 (`src/lib/pdf-generator.ts`)
6. [ ] Status API (`src/app/api/status/`)
7. [ ] Download API (`src/app/api/download/`)
8. [ ] Home 페이지 UI (`src/app/page.tsx`)
9. [ ] Success 페이지 UI (`src/app/success/page.tsx`)
10. [ ] Cancel 페이지 UI (`src/app/cancel/page.tsx`)

---

## 9. File Structure

```
src/
├── app/
│   ├── page.tsx                      # Home (입력 폼)
│   ├── success/page.tsx              # 결제 완료 + 다운로드
│   ├── cancel/page.tsx               # 결제 취소
│   ├── layout.tsx
│   └── api/
│       ├── checkout/route.ts         # Stripe Checkout
│       ├── webhook/route.ts          # Stripe Webhook
│       ├── status/[sessionId]/route.ts  # 상태 조회
│       └── download/[sessionId]/route.ts # PDF 다운로드
├── components/
│   ├── UsernameForm.tsx
│   ├── StatusTracker.tsx
│   └── DownloadButton.tsx
├── lib/
│   ├── stripe.ts                     # Stripe client
│   ├── scraper.ts                    # Threads scraper
│   ├── pdf-generator.ts             # PDF 생성
│   └── job-store.ts                  # 인메모리 작업 상태 관리
└── types/
    ├── order.ts
    ├── scrape-job.ts
    └── threads-post.ts
```

---

## 10. Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `STRIPE_SECRET_KEY` | Stripe API 비밀키 | `sk_test_xxx` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe 공개키 | `pk_test_xxx` |
| `STRIPE_WEBHOOK_SECRET` | Webhook 서명 검증 | `whsec_xxx` |
| `NEXT_PUBLIC_BASE_URL` | 사이트 URL | `http://localhost:3000` |
| `STRIPE_PRICE_AMOUNT` | 결제 금액 (cents) | `9900` |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-02-01 | Initial draft |
