# Phase 1: Schema/Terminology Planning Document

> **Summary**: Unthread 서비스의 데이터 구조 및 도메인 용어 정의
>
> **Project**: Unthread
> **Version**: 0.1.0
> **Date**: 2026-02-01
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

Unthread 서비스의 핵심 도메인 용어와 데이터 모델을 정의한다.
유저 아이디 입력 → Stripe 결제 → Threads 스크래핑 → PDF 생성 → 다운로드 플로우에 필요한 모든 엔티티를 설계한다.

### 1.2 Background

Threads(Meta) 게시물을 PDF로 변환해주는 유료 서비스. 사용자가 Threads 유저 아이디를 입력하면 해당 유저의 전체 글을 스크래핑하여 PDF로 만들어 다운로드할 수 있다.

---

## 2. Scope

### 2.1 In Scope

- [ ] 도메인 용어 정의
- [ ] 핵심 엔티티 설계 (Order, ScrapeJob, ThreadsPost, PDF)
- [ ] 엔티티 관계 정의
- [ ] TypeScript 타입 정의
- [ ] 에러 코드 정의

### 2.2 Out of Scope

- 유저 회원가입/로그인 (익명 결제 방식)
- 관리자 대시보드
- 스크래핑 이력 조회 (v2)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Threads 유저 아이디 입력 및 검증 | High | Pending |
| FR-02 | Stripe Checkout으로 결제 처리 | High | Pending |
| FR-03 | 결제 완료 후 Threads 글 스크래핑 | High | Pending |
| FR-04 | 스크래핑된 글을 PDF로 변환 | High | Pending |
| FR-05 | PDF 다운로드 링크 제공 | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 스크래핑 완료 시간 < 60s (100개 글 기준) | 서버 로그 |
| Security | Stripe Webhook 서명 검증 | Stripe SDK |
| Reliability | 스크래핑 실패 시 재시도 (최대 3회) | 서버 로그 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 모든 엔티티 TypeScript 타입 정의 완료
- [ ] 용어 사전 작성 완료
- [ ] 엔티티 관계도 작성 완료
- [ ] Schema 문서 리뷰 완료

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Threads 스크래핑 차단 | High | Medium | Rate limiting, User-Agent 로테이션 |
| 대량 게시물 시 PDF 생성 지연 | Medium | Medium | 비동기 처리 + 진행률 표시 |
| Stripe Webhook 유실 | High | Low | 멱등성 키 활용, 수동 확인 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Selected |
|-------|:--------:|
| **Dynamic** | ✅ |

### 6.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| Framework | Next.js 15 (App Router) | Vercel 배포, API Routes 활용 |
| Styling | Tailwind CSS | 빠른 UI 구현 |
| Payment | Stripe Checkout | 글로벌 결제, 간편 연동 |
| Scraping | Puppeteer | Threads 동적 페이지 렌더링 필요 |
| PDF | jsPDF | 서버사이드 PDF 생성 |

---

## 7. Convention Prerequisites

### 7.1 Environment Variables Needed

| Variable | Purpose | Scope |
|----------|---------|-------|
| `STRIPE_SECRET_KEY` | Stripe API 비밀키 | Server |
| `STRIPE_PUBLISHABLE_KEY` | Stripe 공개키 | Client |
| `STRIPE_WEBHOOK_SECRET` | Webhook 서명 검증 | Server |
| `NEXT_PUBLIC_BASE_URL` | 사이트 URL | Client |

---

## 8. Next Steps

1. [ ] Schema 문서 작성 (`phase-1-schema.design.md`)
2. [ ] 리뷰 및 승인
3. [ ] Phase 2 Convention 진행

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-02-01 | Initial draft |
