# Vercel Deployment Strategy with Playwright

## 현재 상태

✅ **Playwright로 PDF 생성 전환 완료**
- Puppeteer → Playwright 마이그레이션 완료
- Scraper도 Playwright로 전환
- 로컬 개발 환경에서 정상 작동

## Vercel 배포 전략

### 옵션 1: Playwright 그대로 배포 (추천 ⭐)

**장점:**
- 코드 변경 없음
- Playwright가 Chromium 자동 포함
- Vercel에서 공식 지원

**설정 방법:**

1. **vercel.json 설정**
```json
{
  "functions": {
    "src/app/api/looms/route.ts": {
      "maxDuration": 60,  // Pro 플랜 필요
      "memory": 3008      // Pro 플랜 필요
    },
    "src/app/api/scrape/route.ts": {
      "maxDuration": 60,
      "memory": 3008
    }
  },
  "build": {
    "env": {
      "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD": "0"
    }
  }
}
```

2. **package.json에 postinstall 스크립트 추가**
```json
{
  "scripts": {
    "postinstall": "playwright install chromium --with-deps"
  }
}
```

3. **Vercel 환경 변수 설정**
```
PLAYWRIGHT_BROWSERS_PATH=0
```

**제한사항:**
- ❌ Hobby 플랜: 10초 타임아웃, 1024MB 메모리 (부족할 수 있음)
- ✅ Pro 플랜: 60초 타임아웃, 3008MB 메모리 (작동 가능)

---

### 옵션 2: Browserless.io 사용 (Hobby 플랜 가능)

외부 Chrome 인스턴스를 사용하여 Vercel 서버리스 제약 우회

**장점:**
- ✅ Hobby 플랜에서 작동
- ✅ 안정적이고 빠름
- ✅ 메모리/타임아웃 걱정 없음

**단점:**
- 💰 월 $25 (무료 티어: 6시간/월)

**코드 변경:**
```typescript
// src/lib/pdf/render.ts
async function getBrowser() {
  if (process.env.BROWSERLESS_TOKEN) {
    // Vercel에서 외부 Chrome 사용
    return chromium.connectOverCDP(
      `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`
    )
  }

  // 로컬 개발
  return chromium.launch({ ... })
}
```

---

### 옵션 3: 다른 배포 플랫폼 사용

**Railway / Render / Fly.io:**
- ✅ 더 많은 메모리/타임아웃
- ✅ Docker 컨테이너 사용 가능
- ✅ Playwright 완벽 지원
- ❌ Vercel보다 복잡한 설정

---

## 추천 로드맵

### 1단계: 먼저 Vercel Pro로 시도 (1주일)
- Pro 플랜 무료 체험 사용
- Playwright 그대로 배포
- 작동하면 Pro 유지 또는 다음 단계로

### 2단계: Hobby 플랜으로 최적화
- PDF 생성만 Browserless.io 사용
- Scraper는 Apify API 사용 (이미 준비됨)
- 월 비용: Vercel Hobby ($0) + Browserless ($25)

### 3단계: 완전 무료 (선택)
- Railway/Render로 이전
- 또는 PDF 생성 기능만 별도 서비스로 분리

---

## 현재 설정 체크리스트

- [x] Playwright 설치
- [x] render.ts Playwright로 전환
- [x] scraper.ts Playwright로 전환
- [x] next.config.ts 업데이트
- [x] 로컬 빌드 성공
- [x] vercel.json 최종 설정
- [x] package.json postinstall 스크립트 추가
- [ ] Vercel 배포 테스트
- [ ] PDF 생성 테스트
- [ ] 성능 모니터링

---

## 다음 단계

**지금 바로:**
1. `vercel.json` 업데이트 (아래 참고)
2. Git commit & push
3. Vercel 배포
4. PDF 생성 테스트

**만약 실패하면:**
1. Browserless.io 가입 (무료 티어 시작)
2. `BROWSERLESS_TOKEN` 환경 변수 추가
3. `render.ts` 수정 (위 코드 참고)
4. 재배포

---

## 참고 자료

- [Playwright on Vercel](https://playwright.dev/docs/browsers#install-system-dependencies)
- [Browserless.io](https://www.browserless.io/)
- [Vercel Functions Limits](https://vercel.com/docs/functions/serverless-functions/runtimes#limits)
