# Unthread Coding Conventions

**Version**: 1.0
**Level**: Dynamic

---

## 1. Naming Conventions

### Files & Folders

| Target | Rule | Example |
|--------|------|---------|
| Component files | PascalCase.tsx | `UsernameForm.tsx` |
| Utility/lib files | kebab-case.ts | `job-store.ts`, `pdf-generator.ts` |
| Type files | kebab-case.ts | `scrape-job.ts` |
| API routes | route.ts in kebab-case dirs | `api/checkout/route.ts` |
| Folders | kebab-case | `scrape-job/`, `[sessionId]/` |

### Code

| Target | Rule | Example |
|--------|------|---------|
| Components | PascalCase | `UsernameForm`, `StatusTracker` |
| Functions | camelCase | `createJob()`, `scrapeThreads()` |
| Variables | camelCase | `sessionId`, `postCount` |
| Constants | UPPER_SNAKE_CASE | `RATE_LIMIT_MAX`, `USERNAME_REGEX` |
| Types/Interfaces | PascalCase | `ScrapeJob`, `ThreadsPost` |
| Type unions | PascalCase + "Status" suffix | `ScrapeJobStatus`, `OrderStatus` |

---

## 2. Folder Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/               # API routes (server-side)
│   ├── success/           # Success page
│   ├── cancel/            # Cancel page
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable UI components
├── lib/                   # Server-side utilities & business logic
└── types/                 # TypeScript type definitions
```

---

## 3. Import Order

```typescript
// 1. External libraries
import { NextRequest, NextResponse } from 'next/server'
import { useState } from 'react'

// 2. Internal absolute imports (@/)
import { stripe } from '@/lib/stripe'
import { ScrapeJob } from '@/types/scrape-job'

// 3. Relative imports
import { DownloadButton } from './DownloadButton'
```

---

## 4. Environment Variables

| Prefix | Scope | Example |
|--------|-------|---------|
| `STRIPE_` | Stripe server keys | `STRIPE_SECRET_KEY` |
| `NEXT_PUBLIC_STRIPE_` | Stripe client keys | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| `NEXT_PUBLIC_` | Client-side config | `NEXT_PUBLIC_BASE_URL` |

---

## 5. Code Style

- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: None
- **Max line length**: 120
- **Trailing commas**: ES5
- **Component pattern**: Named exports (`export function Component()`)
- **Client components**: `'use client'` directive at top
- **API routes**: Export named HTTP method functions (`GET`, `POST`)

---

## 6. Error Response Format

All API errors must follow this structure:

```typescript
{
  error: {
    code: string    // UPPER_SNAKE_CASE error code
    message: string // Human-readable message (English)
  }
}
```

---

## 7. Commit Message

```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Scope: api, ui, lib, types, config
```

Examples:
- `feat(api): add checkout endpoint`
- `fix(lib): handle empty scrape results`
- `docs: update CONVENTIONS.md`
