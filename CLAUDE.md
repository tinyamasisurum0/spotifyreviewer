# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js 14 app (App Router) that creates visual album reviews and tier lists from Spotify playlists. Users can analyze playlists, add ratings/notes, reorder albums, and export shareable images. Includes OCR-based image import for album lists. Data persists to Vercel Postgres.

**Live Site**: myrating.space

## Development Commands

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Build for production
npm run lint         # Run ESLint
```

Use `npx vercel env pull` to sync environment variables from Vercel deployment.

## Architecture

### Data Flow

1. **Spotify Integration** (`utils/spotifyApi.ts`):
   - Client credentials OAuth flow with in-memory token caching
   - 5-second timeout on all Spotify API calls (prevents serverless function timeout)
   - Album details fetched in batches of 20; playlist tracks limited to 100 per request
   - All Spotify calls happen server-side to protect credentials

2. **OCR Image Import** (`utils/ocrProcessor.ts`, `utils/albumParser.ts`):
   - Users upload images containing album lists (e.g., screenshots of ranked lists)
   - Tesseract.js processes images with preprocessing (grayscale, contrast enhancement)
   - Automatic text column detection (35%-80% range) to extract album names
   - Parsed albums are fuzzy-matched against Spotify search results
   - UI component: `app/review-builder/_components/ImageListImporter.tsx`

3. **Database Layer** (`lib/reviews.ts`, `lib/tierLists.ts`):
   - Auto-creates Postgres tables on first use via `ensureSchema()` (singleton Promise cache)
   - Reviews: `reviews` + `review_albums` tables with CASCADE delete
   - Tier Lists: `tier_lists` + `tier_list_albums` tables with CASCADE delete (JSONB for tier_metadata)
   - Always use `withClient()` wrapper for connection management
   - Transactions wrap multi-row inserts; UUIDs from `crypto.randomUUID()`

4. **API Routes** (`app/api/`):
   - `GET/POST /api/reviews` - List or create reviews
   - `GET /api/reviews/[id]` - Fetch review by ID
   - `GET/POST /api/tier-lists` - List or create tier lists
   - `GET /api/spotify/search` - Album search proxy
   - All routes use `export const dynamic = 'force-dynamic'`

5. **Server Actions** (`app/admin/actions.ts`):
   - Delete operations use Next.js Server Actions, NOT API routes
   - `deleteReview()` and `deleteTierList()` with `revalidatePath()` for cache invalidation
   - Called from admin panel client components

6. **SEO** (`app/robots.ts`, `app/sitemap.ts`, `app/reviews/[id]/og/route.ts`):
   - Dynamic robots.txt and sitemap generation
   - Open Graph images generated on-demand per review via route handlers

### Type System

- `types/review.ts`: `ReviewMode = 'review' | 'plain' | 'rating' | 'both'`
- `types/tier-list.ts`: `TierId = 'unranked' | 's' | 'a' | 'b' | 'c'`
- `data/tierMaker.ts`: Default tier metadata, validation logic
- `data/tierPalette.ts`: Color palettes for each tier

### Key Components

- `PlaylistAnalyzer.tsx` - Main review builder (largest component)
- `ReviewDetailClient.tsx` - Individual review display with mode-dependent rendering
- `TierListDetailClient.tsx` - Tier list with @dnd-kit drag-and-drop
- `components/rankDecorations.ts` - Rank decoration logic

## Common Development Patterns

### Adding a New Review Mode

1. Add mode to `ReviewMode` union in `types/review.ts`
2. Update `VALID_MODES` in `lib/reviews.ts`
3. Implement display logic in `ReviewDetailClient.tsx`
4. Update validation in `app/api/reviews/route.ts`

### Working with Postgres

- Schema auto-initializes on first API call (no migrations needed)
- Always use `withClient()` wrapper for connection management
- Wrap multi-row operations in transactions (`BEGIN/COMMIT/ROLLBACK`)

### Image Export

- Uses `html-to-image` library (toBlob/toPng)
- Renders hidden DOM element, captures to canvas, converts to data URL
- Stored as `image_data_url` in database for static hosting

## Tech Stack

- **Framework**: Next.js 14 (App Router, React Server Components)
- **Database**: Vercel Postgres (`@vercel/postgres`)
- **Styling**: Tailwind CSS with shadcn/ui-style HSL CSS variables, `class-variance-authority`
- **Drag & Drop**: @dnd-kit (tier lists)
- **Image Generation**: html-to-image, html2canvas
- **OCR**: Tesseract.js for image-to-text album import
- **Icons**: lucide-react

## Important Notes

- **Dark mode is forced** at layout level (`<html className="dark">`) - all UI is dark-only
- The `spotifyreviewer/` subdirectory is a legacy duplicate - focus on root-level code only
- Two `next.config` files exist; `next.config.js` is the active one (`.mjs` is unused)
- Next.js image optimization configured for `i.scdn.co` and `mosaic.scdn.co` (Spotify CDN) with avif/webp
- Admin routes use `X-Robots-Tag: noindex, nofollow` header via `next.config.js`
- All client-side state is ephemeral; reviews/tier lists must be explicitly saved via API
