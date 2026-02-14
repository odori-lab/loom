export type Locale = 'ko' | 'en'

export const translations = {
  ko: {
    // Header
    'nav.myLooms': '내 Loom',
    'nav.signIn': '로그인',

    // Hero
    'hero.title1': '당신의 Threads를',
    'hero.title2': '아름다운 책으로',
    'hero.description': 'Threads 포스트를 전문적으로 포맷된 PDF로 변환하세요. 생각을 저장하고, 이야기를 공유하고, 나만의 책을 만드세요.',
    'hero.cta': 'Loom 만들기',

    // How it works
    'howItWorks.title': '이용 방법',
    'howItWorks.step1.title': '사용자명 입력',
    'howItWorks.step1.description': 'Threads 사용자명을 입력해서 포스트를 가져오세요',
    'howItWorks.step2.title': '포스트 선택',
    'howItWorks.step2.description': '포함할 포스트를 선택하고, 날짜로 필터링하고, 순서를 정하세요',
    'howItWorks.step3.title': 'PDF 다운로드',
    'howItWorks.step3.description': '아름답게 포맷된 A5 PDF를 받아 읽거나 인쇄하세요',

    // Features
    'features.title': '기능',
    'features.bookFormat.title': '책 형식',
    'features.bookFormat.description': '편안한 독서를 위해 적절한 마진과 타이포그래피로 디자인된 A5 사이즈',
    'features.images.title': '이미지 포함',
    'features.images.description': '포스트의 사진이 PDF에 자동으로 포함됩니다',
    'features.filter.title': '필터 & 정렬',
    'features.filter.description': '날짜 범위로 필터링하고, 포스트를 검색하고, 최신순 또는 오래된순으로 정렬',
    'features.engagement.title': '참여 통계',
    'features.engagement.description': '전체 맥락을 담기 위해 좋아요와 답글 수가 보존됩니다',

    // CTA
    'cta.title': 'Loom을 만들 준비가 되셨나요?',
    'cta.description': '오늘부터 Threads 포스트를 아름다운 책으로 변환하세요.',
    'cta.button': '무료로 시작하기',

    // Footer
    'footer.copyright': '© 2026 Loom. All rights reserved.',
    'footer.madeWith': '사랑을 담아',

    // Login
    'login.title': 'Loom',
    'login.description': 'Threads를 아름다운 책으로',
    'login.google': 'Google로 계속하기',
    'login.terms': '계속하면 서비스 약관 및 개인정보 처리방침에 동의하는 것입니다',

    // Dashboard
    'dashboard.looms': '내 Loom',
    'dashboard.create': '만들기',
    'dashboard.search': '검색...',
    'dashboard.newest': '최신순',
    'dashboard.oldest': '오래된순',
    'dashboard.empty.title': '아직 Loom이 없습니다',
    'dashboard.empty.description': 'Threads 포스트를 아름다운 PDF로 변환하세요',
    'dashboard.empty.cta': '첫 Loom 만들기',
    'dashboard.preview.select': 'Loom을 선택해서 미리보기',
    'dashboard.preview.hint': '그리드에서 항목을 클릭하세요',
    'dashboard.preview.loading': '미리보기 로딩 중...',
    'dashboard.preview.error': '미리보기를 불러오지 못했습니다',

    // My Page
    'my.title': '내 Looms',
    'my.createNew': '새로 만들기',
    'my.empty': '아직 만든 Loom이 없습니다',
    'my.emptyDescription': '첫 번째 Loom을 만들어보세요!',
    'my.posts': '개 포스트',
    'my.download': '다운로드',
    'my.delete': '삭제',

    // Create Page
    'create.title': 'Loom 만들기',
    'create.step1': '사용자명',
    'create.step2': '선택',
    'create.step3': '완료',
    'create.username.title': 'Threads 사용자명을 입력하세요',
    'create.username.description': 'Threads 사용자명을 입력해서 시작하세요',
    'create.username.placeholder': '예: zuck',
    'create.username.button': '포스트 가져오기',
    'create.username.continue': '계속',
    'create.username.loading': '포스트 가져오는 중...',
    'create.username.helper': '이 Threads 프로필의 최근 포스트를 가져옵니다',
    'create.select.title': '포함할 포스트를 선택하세요',
    'create.select.selectAll': '전체 선택',
    'create.select.deselectAll': '전체 해제',
    'create.select.selected': '개 선택됨',
    'create.select.generate': 'Loom 생성',
    'create.select.generating': '생성 중...',
    'create.complete.title': 'Loom이 준비되었습니다!',
    'create.complete.description': 'PDF가 생성되어 라이브러리에 저장되었습니다',
    'create.complete.download': 'PDF 다운로드',
    'create.complete.another': '다른 Loom 만들기',
    'create.complete.viewAll': '내 Looms 보기',
  },
  en: {
    // Header
    'nav.myLooms': 'My Looms',
    'nav.signIn': 'Sign in',

    // Hero
    'hero.title1': 'Turn your Threads',
    'hero.title2': 'into a beautiful book',
    'hero.description': 'Transform your Threads posts into a professionally formatted PDF. Save your thoughts, share your stories, or print your own book.',
    'hero.cta': 'Create Your Loom',

    // How it works
    'howItWorks.title': 'How it works',
    'howItWorks.step1.title': 'Enter Username',
    'howItWorks.step1.description': 'Enter any Threads username to fetch their posts',
    'howItWorks.step2.title': 'Select Posts',
    'howItWorks.step2.description': 'Choose which posts to include, filter by date, and arrange the order',
    'howItWorks.step3.title': 'Download PDF',
    'howItWorks.step3.description': 'Get a beautifully formatted A5 PDF, ready to read or print',

    // Features
    'features.title': 'Features',
    'features.bookFormat.title': 'Book-like Format',
    'features.bookFormat.description': 'A5 size with proper margins and typography designed for comfortable reading',
    'features.images.title': 'Images Included',
    'features.images.description': 'Photos from your posts are automatically included in the PDF',
    'features.filter.title': 'Filter & Sort',
    'features.filter.description': 'Filter by date range, search posts, and sort newest or oldest first',
    'features.engagement.title': 'Engagement Stats',
    'features.engagement.description': 'Likes and reply counts are preserved to capture the full context',

    // CTA
    'cta.title': 'Ready to create your Loom?',
    'cta.description': 'Start transforming your Threads posts into a beautiful book today.',
    'cta.button': 'Get Started Free',

    // Footer
    'footer.copyright': '© 2026 Loom. All rights reserved.',
    'footer.madeWith': 'Made with love',

    // Login
    'login.title': 'Loom',
    'login.description': 'Turn your Threads into a beautiful book',
    'login.google': 'Continue with Google',
    'login.terms': 'By continuing, you agree to our Terms of Service and Privacy Policy',

    // Dashboard
    'dashboard.looms': 'Looms',
    'dashboard.create': 'Create',
    'dashboard.search': 'Search...',
    'dashboard.newest': 'Newest',
    'dashboard.oldest': 'Oldest',
    'dashboard.empty.title': 'No Looms yet',
    'dashboard.empty.description': 'Transform your Threads posts into beautiful PDFs',
    'dashboard.empty.cta': 'Create Your First Loom',
    'dashboard.preview.select': 'Select a Loom to preview',
    'dashboard.preview.hint': 'Click on any item from the grid',
    'dashboard.preview.loading': 'Loading preview...',
    'dashboard.preview.error': 'Failed to load preview',

    // My Page
    'my.title': 'My Looms',
    'my.createNew': 'Create New',
    'my.empty': 'No Looms yet',
    'my.emptyDescription': 'Create your first Loom!',
    'my.posts': 'posts',
    'my.download': 'Download',
    'my.delete': 'Delete',

    // Create Page
    'create.title': 'Create a Loom',
    'create.step1': 'Username',
    'create.step2': 'Select',
    'create.step3': 'Complete',
    'create.username.title': 'Enter a Threads username',
    'create.username.description': 'Enter a Threads username to get started',
    'create.username.placeholder': 'e.g. zuck',
    'create.username.button': 'Fetch Posts',
    'create.username.continue': 'Continue',
    'create.username.loading': 'Fetching posts...',
    'create.username.helper': "We'll fetch the latest posts from this Threads profile",
    'create.select.title': 'Select posts to include',
    'create.select.selectAll': 'Select All',
    'create.select.deselectAll': 'Deselect All',
    'create.select.selected': 'selected',
    'create.select.generate': 'Generate Loom',
    'create.select.generating': 'Generating...',
    'create.complete.title': 'Your Loom is ready!',
    'create.complete.description': 'Your PDF has been generated and saved to your library',
    'create.complete.download': 'Download PDF',
    'create.complete.another': 'Create Another',
    'create.complete.viewAll': 'View My Looms',
  }
} as const

export type TranslationKey = keyof typeof translations.ko

export function getTranslation(locale: Locale, key: TranslationKey): string {
  return translations[locale][key] || translations.en[key] || key
}
