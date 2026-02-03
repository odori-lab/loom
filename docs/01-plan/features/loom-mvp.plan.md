# Loom MVP Plan

> Threads to PDF 변환 서비스 MVP 계획서

## 1. Overview

| 항목 | 내용 |
|------|------|
| **Feature Name** | Loom MVP |
| **Project Level** | Dynamic (로그인/BaaS 필요) |
| **Priority** | High |
| **Status** | ✅ Implemented |
| **Created** | 2026-02-03 |

### 1.1 Vision
스레드(Threads) 포스트를 아름다운 책 형태의 PDF로 변환하여 디지털 아카이브 및 인쇄물로 제공하는 서비스

### 1.2 Target Users
- 자신의 스레드 콘텐츠를 책으로 보존하고 싶은 크리에이터
- 디지털 콘텐츠를 물리적 형태로 소장하고 싶은 사용자

---

## 2. Current State Analysis

### 2.1 기존 구현 (완료)
| 기능 | 상태 | 파일 |
|------|------|------|
| 스레드 ID 입력 | ✅ | `UsernameForm.tsx` |
| Apify API 스크래핑 | ✅ | `scraper.ts` |
| 포스트 선택 | ✅ | `PostSelector.tsx` |
| 기본 PDF 생성 | ✅ | `generate-pdf/route.ts` |
| Stripe 결제 연동 | ✅ (미사용) | `stripe.ts`, `checkout/route.ts` |

### 2.2 현재 제한사항
- **텍스트만 가져옴**: 좋아요, 댓글 수, 이미지 미포함
- **PDF 디자인 미흡**: A4 포맷, 책 느낌 없음
- **로그인 미구현**: 히스토리 관리 불가
- **랜딩 페이지 없음**: 서비스 소개 페이지 부재

---

## 3. MVP Scope Definition

### 3.1 MVP 핵심 기능 (Must Have)

#### F1. 랜딩 페이지
- 서비스 소개 (스레드 → PDF 변환 과정 시각화)
- CTA 버튼 → Loom 만들기로 이동
- 반응형 디자인 (모바일 지원)

#### F2. 로그인/회원가입
- OAuth 소셜 로그인 (Google/Apple)
- 마이페이지 접근 권한 관리

#### F3. 마이페이지
- 과거 생성한 Loom(PDF) 목록 조회
- PDF 다시 다운로드 기능
- Loom 새로 만들기 버튼

#### F4. Loom 생성 플로우 개선
1. **스레드 아이디 입력**
2. **결제** (MVP에서는 스킵 - 무료)
3. **포스트 선택**
   - 정렬: 최신순/역순
   - 기간 필터링
   - 좋아요/댓글 수 표시
   - 이미지 썸네일 표시
4. **PDF 생성 및 다운로드**

#### F5. PDF 디자인 개선 (디자인 가이드 기반)
- **포맷**: A5 (148mm x 210mm)
- **마진**: 상하 22mm, 좌우 20mm
- **페이지 구성**:
  - 커버 페이지: 이름, 아이디, Bio, Interests, Links, 프로필 사진
  - 콘텐츠 페이지: 프로필 썸네일 + 아이디 + 본문 + 좋아요/댓글 수 + 날짜
  - 마지막 페이지: Loom 로고
- **레이아웃 규칙**:
  - 긴 글: 페이지당 1개 포스트
  - 짧은 글(사진 없음): 페이지당 2개 가능
  - 이미지: 최대 2장까지 표시
  - 줄바꿈 정확히 적용
- **테마**: 화이트 배경 (인쇄 최적화) - 추후 다크모드 옵션 추가

#### F6. 스크래퍼 데이터 확장
- 좋아요 수 (`like_count`)
- 댓글 수 (`direct_reply_count`)
- 이미지 URL (`medias`)
- 프로필 정보 (Bio, 팔로워 수 등)

### 3.2 MVP 제외 기능 (Out of Scope)
| 기능 | 이유 | 향후 계획 |
|------|------|----------|
| 결제 시스템 | MVP 검증 우선 | v1.1 |
| 댓글 포함 | 복잡도 높음 | v1.2 |
| 다크모드 PDF | 디자인 우선순위 | v1.1 |
| 다국어 지원 | MVP 범위 초과 | v1.2 |

---

## 4. Technical Architecture

### 4.1 기술 스택
| 영역 | 기술 | 비고 |
|------|------|------|
| Frontend | Next.js 16, React 19, TailwindCSS 4 | 기존 유지 |
| Backend | Next.js API Routes | 기존 유지 |
| Auth | NextAuth.js / Supabase Auth | 신규 추가 |
| Database | Supabase PostgreSQL | 신규 추가 |
| PDF Generation | Puppeteer (HTML → PDF) | 기존 유지, 템플릿 개선 |
| Scraping | Apify API | 기존 유지, 데이터 확장 |
| Storage | Supabase Storage | PDF 파일 저장 |
| Deployment | Vercel | 기존 유지 |

### 4.2 데이터 모델

```
┌─────────────────┐       ┌─────────────────┐
│     users       │       │     looms       │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │──────<│ user_id (FK)    │
│ email           │       │ id (PK)         │
│ name            │       │ thread_username │
│ avatar_url      │       │ pdf_url         │
│ created_at      │       │ post_count      │
└─────────────────┘       │ created_at      │
                          └─────────────────┘
```

### 4.3 페이지 구조

```
/                    → 랜딩 페이지
/login               → 로그인/회원가입
/my                  → 마이페이지 (Loom 목록)
/create              → Loom 생성 플로우
  /create/username   → Step 1: 스레드 ID 입력
  /create/select     → Step 2: 포스트 선택
  /create/complete   → Step 3: 완료 및 다운로드
```

---

## 5. Implementation Phases

### Phase 1: 인프라 세팅 ✅
- [x] Supabase 프로젝트 생성
- [x] DB 테이블 생성 (profiles, looms)
- [x] Supabase Auth 설정 (Google OAuth)
- [x] 환경변수 설정

### Phase 2: 인증 시스템 ✅
- [x] 로그인/로그아웃 페이지 (`/login`)
- [x] 세션 관리 (Supabase Auth)
- [x] 보호된 라우트 설정 (`middleware.ts`)

### Phase 3: 스크래퍼 개선 ✅
- [x] Apify 응답에서 추가 데이터 추출
  - like_count, direct_reply_count
  - medias (이미지 URL)
  - 프로필 정보
- [x] ThreadsPost, ThreadsProfile 타입 확장 (`types/threads.ts`)

### Phase 4: PDF 디자인 개선 ✅
- [x] A5 포맷 적용
- [x] 커버 페이지 템플릿 (`pdf/templates/cover.ts`)
- [x] 콘텐츠 페이지 템플릿 (`pdf/templates/content.ts`)
- [x] 마지막 페이지 (로고) (`pdf/templates/last.ts`)
- [x] 레이아웃 알고리즘 (`pdf/layout.ts`)

### Phase 5: 마이페이지 ✅
- [x] Loom 목록 API (`/api/looms`)
- [x] Loom 상세/다운로드 API (`/api/looms/[id]`)
- [x] 마이페이지 UI (`/my`)

### Phase 6: 랜딩 페이지 ✅
- [x] 서비스 소개 섹션
- [x] 변환 과정 시각화
- [x] CTA 버튼

### Phase 7: 추가 기능 ✅
- [x] i18n 다국어 지원 (한국어/영어)
- [x] 언어 토글 컴포넌트
- [x] Create Flow 3단계 구현

---

## 6. Risks & Mitigations

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| Apify API 비용 증가 | 운영비 증가 | 사용량 모니터링, 캐싱 도입 |
| PDF 생성 시간 | UX 저하 | 로딩 UI, 백그라운드 처리 |
| 이미지 URL 만료 | PDF 이미지 깨짐 | 이미지 사전 다운로드 후 임베드 |
| 스레드 API 변경 | 스크래핑 실패 | Apify actor 모니터링 |

---

## 7. Success Metrics

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| PDF 생성 완료율 | > 95% | 에러 로그 분석 |
| 평균 PDF 생성 시간 | < 30초 | APM 모니터링 |
| 재방문율 | > 30% | Analytics |
| 사용자 피드백 | 긍정 > 80% | 설문조사 |

---

## 8. Open Questions

1. **Auth Provider**: Supabase Auth vs NextAuth.js - 어떤 것을 사용할지?
2. **PDF 저장 기간**: 영구 저장 vs 7일 후 삭제?
3. **로고 파일**: Google Drive 링크의 로고 파일 다운로드 필요
4. **프로필 정보 스크래핑**: Apify actor가 프로필 데이터도 제공하는지 확인 필요

---

## 9. References

- [디자인 가이드 PDF](/Users/ohdoyoel/Downloads/Threads to book design guide.pdf)
- [로고 파일](https://drive.google.com/drive/folders/1kgBM_ZaDk3o9A_nWsGj2TMbsQh9Ow4SW?usp=drive_link)

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-03 | 초안 작성 |
| 2026-02-04 | MVP 구현 완료 - 모든 Phase 완료 |
