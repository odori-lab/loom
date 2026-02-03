# Loom Coding Conventions

**Version**: 2.0
**Level**: Dynamic

---

## 1. Naming Conventions

### Files & Folders

| Target | Rule | Example |
|--------|------|---------|
| Component files | PascalCase.tsx | `LoomCard.tsx` |
| Utility/lib files | kebab-case.ts | `scraper.ts`, `generator.ts` |
| Type files | kebab-case.ts | `threads.ts`, `loom.ts` |
| API routes | route.ts in kebab-case dirs | `api/looms/route.ts` |
| Folders | kebab-case | `create/`, `[id]/` |

### Code

| Target | Rule | Example |
|--------|------|---------|
| Components | PascalCase | `LoomCard`, `UserMenu` |
| Functions | camelCase | `scrapeThreads()`, `generatePdfHtml()` |
| Variables | camelCase | `loomId`, `postCount` |
| Constants | UPPER_SNAKE_CASE | `MAX_PAGE_HEIGHT`, `PDF_STYLES` |
| Types/Interfaces | PascalCase | `ThreadsPost`, `Loom` |

---

## 2. Folder Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/               # API routes
│   │   ├── looms/         # Loom CRUD
│   │   ├── scrape/        # Threads scraping
│   │   └── generate-pdf/  # PDF generation
│   ├── auth/              # Auth callback
│   ├── create/            # Create Loom flow
│   ├── login/             # Login page
│   ├── my/                # My Looms page
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/            # Reusable UI components
│   ├── auth/              # Auth components
│   ├── create/            # Create flow steps
│   └── loom/              # Loom components
├── lib/                   # Server-side utilities
│   ├── supabase/          # Supabase clients
│   ├── pdf/               # PDF generation
│   └── scraper.ts         # Apify scraper
└── types/                 # TypeScript type definitions
```

---

## 3. Import Order

```typescript
// 1. External libraries
import { NextResponse } from 'next/server'
import { useState } from 'react'

// 2. Internal absolute imports (@/)
import { createClient } from '@/lib/supabase/server'
import { ThreadsPost } from '@/types/threads'

// 3. Relative imports
import { LoomCard } from './LoomCard'
```

---

## 4. Environment Variables

| Prefix | Scope | Example |
|--------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_` | Supabase client | `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_` | Supabase server | `SUPABASE_SERVICE_ROLE_KEY` |
| `APIFY_` | Apify API | `APIFY_TOKEN` |
| `NEXT_PUBLIC_` | Client-side config | `NEXT_PUBLIC_APP_URL` |

---

## 5. Code Style

- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: None
- **Max line length**: 120
- **Component pattern**: Named exports (`export function Component()`)
- **Client components**: `'use client'` directive at top
- **API routes**: Export named HTTP method functions (`GET`, `POST`)

---

## 6. Error Response Format

All API errors must follow this structure:

```typescript
{
  error: string  // Human-readable message
}
```

With HTTP status codes:
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

---

## 7. Commit Message

```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Scope: api, ui, lib, types, config
```

Examples:
- `feat(api): add looms CRUD endpoints`
- `fix(pdf): handle empty posts array`
- `docs: update README`
