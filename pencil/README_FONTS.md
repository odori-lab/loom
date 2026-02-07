# loom.pen 폰트 (Pretendard)

`loom.pen`의 `--font-primary`, `--font-secondary`는 **Pretendard**로 설정되어 있습니다.

## Pencil 확장 설정에서 확인할 것

**확장 쪽에 폰트 관련 설정이 있을 수 있으니 먼저 확인해 보세요.**

1. **Cursor / VS Code 설정**
   - `Cmd + ,` (Mac) 또는 `Ctrl + ,` (Windows) → 설정 열기
   - 검색창에 **`Pencil`** 입력 → Pencil 확장에서 노출하는 설정이 있으면 여기 나옵니다.
   - 또는 **`font`** 로 검색해서 Pencil 전용 폰트/경로 항목이 있는지 봅니다.

2. **확장 상세 페이지**
   - 확장(Extensions) 탭에서 **Pencil** 선택
   - **기여(Contributions)** 또는 **설정(Extension Settings)** 섹션 확인
   - "Font", "Custom font", "Font path" 같은 항목이 있으면, 여기서 프로젝트의 `public/fonts` 또는 Pretendard가 설치된 경로를 지정해 봅니다.

3. **공식 문서**
   - [docs.pencil.dev](https://docs.pencil.dev) 에서 설정/폰트 관련 문서가 추가되었는지 확인해 보세요.

(공식 문서에는 현재 Pencil 전용 폰트 설정이 명시되어 있지 않지만, 확장 업데이트로 추가되었을 수 있습니다.)

## Pencil에서 Pretendard가 안 보일 때

**Pencil은 시스템에 설치된 폰트만 사용합니다.**  
프로젝트의 `public/fonts/` 또는 `src/app/fonts/` 안에 있는 woff2 파일은 **웹(Next.js) 전용**이라 Pencil에서는 자동으로 적용되지 않습니다.

### 해결 방법: Pretendard 시스템 설치

1. **설치용 폰트 다운로드**
   - [Pretendard GitHub Releases](https://github.com/orioncactus/pretendard/releases) 에서 최신 릴리스 선택
   - **Assets**에서 `Pretendard-1.3.9.zip`(또는 해당 버전) 다운로드
   - 압축 해제 후 `.otf` 또는 `.ttf` 파일 사용

2. **시스템에 설치**
   - **macOS**: `.otf`/`.ttf` 더블클릭 → "폰트 설치" (또는 Font Book에서 설치)
   - **Windows**: 파일 더블클릭 → "설치"

3. **Pencil 재시작**  
   설치 후 Pencil을 **완전히 종료**했다가 다시 실행하면 loom.pen에서 Pretendard가 적용됩니다.

### 이미 TTF/OTF 설치했는데도 Pencil에서 안 나올 때

1. **시스템에 등록된 폰트 이름 확인**
   - **macOS**: `Font Book`(폰트책) 앱 실행 → Pretendard 선택 → 우측 정보에서 **이름** 확인.  
     예: `Pretendard`, `Pretendard Variable`, `Pretendard Std` 등으로 나올 수 있음.
   - **Windows**: 설정 → 개인 설정 → 글꼴 → Pretendard 항목 이름 확인.
   - loom.pen 변수(`--font-primary` / `--font-secondary`)는 이 **이름과 정확히 같아야** 합니다.

2. **변수 값을 설치된 이름으로 맞추기**
   - Font Book에 `Pretendard Variable`로만 보이면, .pen 파일의 폰트 변수 값을 `Pretendard Variable`로 바꿔야 Pencil이 인식할 수 있습니다.  
   - (MCP나 Pencil 변수 패널에서 `--font-primary`, `--font-secondary` 값을 해당 이름으로 수정)

3. **Pencil 완전 종료 후 재실행**
   - 창만 닿는 게 아니라 **앱 종료**(macOS: Cmd+Q, Windows: Alt+F4 또는 트레이에서 종료).
   - 다시 Pencil을 연 뒤 loom.pen을 엽니다.

4. **폰트 설치 순서**
   - 가능하면 **폰트를 먼저 설치한 다음** Pencil을 실행해 보세요.  
     일부 앱은 실행 시점의 시스템 폰트 목록만 쓰는 경우가 있습니다.
   - 그래도 안 되면 Mac의 경우 **재부팅** 후 Pencil을 다시 실행해 보세요.

## 요약

| 용도              | 폰트 위치              | 적용 방식                    |
|-------------------|------------------------|-----------------------------|
| 웹 앱 (Next.js)   | `src/app/fonts/*.woff2`| `next/font/local`로 자동 로드 |
| Pencil (loom.pen) | 시스템 설치 (OTF/TTF)  | 시스템 폰트로만 표시         |
