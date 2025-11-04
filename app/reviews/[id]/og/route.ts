import { NextResponse } from 'next/server';
import { getReviewById } from '@/lib/reviews';

const sanitize = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const parseDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) {
    return null;
  }
  const [, mimeType, base64Data] = match;
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    return { mimeType, buffer };
  } catch {
    return null;
  }
};

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const review = await getReviewById(params.id);

  if (!review) {
    return new NextResponse('Not Found', { status: 404 });
  }

  if (review.imageDataUrl) {
    const parsed = parseDataUrl(review.imageDataUrl);
    if (parsed) {
      return new NextResponse(parsed.buffer, {
        headers: {
          'Content-Type': parsed.mimeType,
          'Cache-Control': 'public, max-age=86400, immutable',
        },
      });
    }
  }

  const playlistName = sanitize(review.playlistName);
  const curator = sanitize(review.playlistOwner || 'Unknown curator');
  const albumLines = review.albums.slice(0, 3).map((album, index) => {
    const artist = album.artist && album.artist.trim().length > 0 ? album.artist : 'Unknown Artist';
    return `${index + 1}. ${album.name} — ${artist}`;
  });
  const albumText =
    albumLines.length > 0
      ? sanitize(albumLines.join('\n'))
      : 'Ratings, notes, and rankings for every album in this Spotify playlist.';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#0b1120" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)" />
      <g transform="translate(80, 120)">
        <rect width="1040" height="390" rx="28" fill="rgba(15, 118, 110, 0.18)" stroke="rgba(45, 212, 191, 0.5)" stroke-width="2"/>
        <text x="100" y="80" font-family="Inter, Arial, sans-serif" font-size="64" fill="#ecfeff">
          ${playlistName}
        </text>
        <text x="100" y="140" font-family="Inter, Arial, sans-serif" font-size="28" fill="#99f6e4">
          Curated by ${curator}
        </text>
        <text x="100" y="220" font-family="Inter, Arial, sans-serif" font-size="32" fill="#e2e8f0">
          Featured Albums
        </text>
        <text x="100" y="270" font-family="Inter, Arial, sans-serif" font-size="26" fill="#cbd5f5" xml:space="preserve">
${albumText}
        </text>
        <text x="100" y="380" font-family="Inter, Arial, sans-serif" font-size="22" fill="#34d399">
          See notes, ratings, and artist details on myrating.space
        </text>
      </g>
    </svg>
  `.trim();

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=600',
    },
  });
}
