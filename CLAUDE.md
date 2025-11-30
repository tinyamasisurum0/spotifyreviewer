# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js 14 app (App Router) that creates visual album reviews and tier lists from Spotify playlists. Users can analyze playlists, add ratings/notes, reorder albums, and export shareable images. Data persists to Vercel Postgres.

**Live Site**: myrating.space
**Key Features**: Spotify playlist analysis, album reviews with multiple display modes, tier list maker with drag-and-drop, image export (HTML canvas)

## Development Commands

```bash
# Development
npm run dev          # Start dev server at http://localhost:3000

# Production
npm run build        # Build for production
npm start            # Start production server

# Linting
npm run lint         # Run ESLint
```

## Environment Variables

Required variables (add to `.env.local`):

```bash
# Spotify API (required for playlist fetching and album search)
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=***
NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET=***

# Vercel Postgres (required for reviews and tier lists)
POSTGRES_URL=***
# OR for connection pooling:
POSTGRES_URL_NON_POOLING=***
```

**Note**: Use `npx vercel env pull` to sync from Vercel deployment.

## Architecture

### Data Flow

1. **Spotify Integration** (`utils/spotifyApi.ts`):
   - Client credentials OAuth flow with token caching
   - Fetches playlist tracks and metadata via Spotify Web API
   - Album search for manual additions
   - All Spotify calls happen server-side to protect credentials

2. **Database Layer** (`lib/reviews.ts`, `lib/tierLists.ts`):
   - Auto-creates Postgres tables on first use (`ensureSchema()`)
   - Reviews: Two tables (`reviews` + `review_albums`) with CASCADE delete
   - Tier Lists: Two tables (`tier_lists` + `tier_list_albums`) with CASCADE delete
   - Uses `@vercel/postgres` with connection pooling via `withClient()`
   - Transactions wrap multi-row inserts

3. **API Routes** (`app/api/`):
   - `GET/POST /api/reviews` - List all reviews or create new
   - `GET/DELETE /api/reviews/[id]` - Fetch/delete by ID
   - `GET/POST /api/tier-lists` - List all tier lists or create new
   - `GET /api/spotify/search` - Album search proxy
   - All routes use `export const dynamic = 'force-dynamic'` to prevent static optimization

4. **Client Components**:
   - `ReviewDetailClient.tsx` - Displays individual review with albums
   - `TierListDetailClient.tsx` - Tier list with drag-and-drop (@dnd-kit)
   - `PlaylistAnalyzer.tsx` - Main review builder interface
   - Image export uses `html-to-image` library (canvas rendering)

### Type System

- `types/review.ts`: Review types and 4 display modes (`review | plain | rating | both`)
- `types/tier-list.ts`: Tier list types with 5 tiers (`unranked | s | a | b | c`)
- `data/tierMaker.ts`: Default tier metadata (colors, labels) and validation logic

### Routing Structure

```
app/
├── page.tsx                    # Landing page
├── review-builder/page.tsx     # Interactive review creation tool
├── reviews/
│   ├── page.tsx                # Gallery of all reviews
│   └── [id]/
│       ├── page.tsx            # Individual review display
│       └── og/route.ts         # Open Graph image generation
├── tier-maker/page.tsx         # Tier list creation interface
├── tier-lists/[id]/page.tsx    # Individual tier list display
├── spotify-search/page.tsx     # Album search interface
├── admin/page.tsx              # Admin panel (noindex)
└── blog/page.tsx               # Blog/about page
```

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
- UUIDs generated with `randomUUID()` from `crypto` module

### Image Export

- Uses `html-to-image` library (toBlob/toPng methods)
- Renders hidden DOM element, captures to canvas, converts to data URL
- Stored as `image_data_url` in database for static hosting
- Open Graph images generated on-demand via route handlers

### Spotify API Patterns

- Token cached in-memory with expiration check
- Album details fetched in batches of 20 (API limit)
- Playlist tracks limited to 100 items per request
- Extract playlist ID from URL with `extractPlaylistIdFromUrl()`

## Tech Stack

- **Framework**: Next.js 14 (App Router, React Server Components)
- **Database**: Vercel Postgres (`@vercel/postgres`)
- **Styling**: Tailwind CSS with custom theme, `class-variance-authority` for component variants
- **UI Components**: Custom components built on Tailwind, lucide-react icons
- **Drag & Drop**: @dnd-kit (tier lists only)
- **Image Generation**: html-to-image, html2canvas
- **Analytics**: Vercel Analytics

## Important Notes

- The `spotifyreviewer/` subdirectory appears to be a duplicate/old version - focus on root-level code
- Admin routes use `X-Robots-Tag: noindex, nofollow` header (see `next.config.js`)
- Next.js image optimization configured for `i.scdn.co` and `mosaic.scdn.co` (Spotify CDN)
- All client-side state is ephemeral; reviews/tier lists must be explicitly saved via API
- Review modes control what metadata displays (notes, ratings, labels, release dates)
