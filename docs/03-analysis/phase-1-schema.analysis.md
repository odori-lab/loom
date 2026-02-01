# Phase 1: Schema Gap Analysis

> **Match Rate**: 78% (36/46 items)
> **Date**: 2026-02-01

## Gaps Found

| # | Gap | Severity |
|---|-----|----------|
| 1 | DownloadButton 컴포넌트 미분리 | Low |
| 2 | 구조화된 에러 코드 미구현 | Medium |
| 3 | /api/checkout Rate limiting 없음 | Medium |
| 4 | Username 형식 검증 없음 | Medium |
| 5 | PDF 자동 삭제 미구현 | Low |
| 6 | Order 타입 정의만 있고 미사용 | Low |
| 7 | PdfFile 엔티티 미구현 | Low |
| 8 | NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 미사용 | Low |
| 9 | UI 언어 불일치 (Design: 한국어, Code: 영어) | Low |
| 10 | 스크래핑 실패 시 환불 로직 없음 | High |

## Recommendations

1. DownloadButton 컴포넌트 분리
2. 구조화된 에러 코드 반환 형식 구현
3. Rate limiting 추가
4. Username regex 검증 추가
5. 스크래핑 실패 시 Stripe 환불 호출 추가
6. 미사용 Order 타입 제거 또는 활용
7. UI 한국어로 통일
