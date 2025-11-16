'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { tierDefinitions, mergeTierMetadata } from '@/data/tierMaker';
import { tierPalette, defaultTierPalette } from '@/data/tierPalette';
import type { StoredTierList, TierId, TierListAlbum } from '@/types/tier-list';

interface TierListDetailClientProps {
  tierList: StoredTierList;
}

const buildTierGroups = (albums: TierListAlbum[]) => {
  const groups: Record<TierId, TierListAlbum[]> = {
    unranked: [],
    s: [],
    a: [],
    b: [],
    c: [],
  };

  for (const album of albums) {
    const tier = ['s', 'a', 'b', 'c', 'unranked'].includes(album.tier)
      ? (album.tier as TierId)
      : 'unranked';
    groups[tier].push(album);
  }

  return groups;
};

const hexToRgba = (hex: string, alpha: number, fallback: string): string => {
  if (!hex) {
    return fallback;
  }
  let normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((char) => char + char)
      .join('');
  }
  if (normalized.length !== 6) {
    return fallback;
  }
  const bigint = Number.parseInt(normalized, 16);
  if (Number.isNaN(bigint)) {
    return fallback;
  }
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

function TierAlbumTileStatic({ album, hideDecorations }: { album: TierListAlbum; hideDecorations: boolean }) {
  const releaseDate = album.releaseDate
    ? (() => {
        try {
          return new Date(album.releaseDate).toLocaleDateString();
        } catch {
          return album.releaseDate;
        }
      })()
    : 'Unknown date';

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/70 p-3 text-sm shadow">
      <div className="relative aspect-square w-full overflow-hidden rounded-md border border-gray-800 bg-gray-950/80">
        {album.image ? (
          <Image src={album.image} alt={album.name} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-widest text-gray-500">
            No Image
          </div>
        )}
        {album.spotifyUrl && (
          <a
            href={album.spotifyUrl}
            target="_blank"
            rel="noreferrer"
            className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-gray-200 transition hover:bg-black/90"
            aria-label={`Open ${album.name} in Spotify`}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
      <div className="mt-2 space-y-1">
        <p className="truncate text-sm font-semibold text-white">{album.name}</p>
        <p className="truncate text-xs text-gray-400">{album.artist}</p>
        <p className="text-xs text-gray-500">Released {releaseDate}</p>
        {!hideDecorations && (
          <p className="truncate text-[11px] uppercase tracking-wide text-gray-500">
            {album.label ?? 'No label credit'}
          </p>
        )}
      </div>
    </div>
  );
}

export default function TierListDetailClient({ tierList }: TierListDetailClientProps) {
  const tierGroups = useMemo(() => buildTierGroups(tierList.albums), [tierList.albums]);
  const tierMetadata = useMemo(() => mergeTierMetadata(tierList.tierMetadata), [tierList.tierMetadata]);
  const boardRef = useRef<HTMLDivElement>(null);
  const [hideDecorations, setHideDecorations] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!boardRef.current || isDownloading) {
      return;
    }
    try {
      setIsDownloading(true);
      setDownloadError(null);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const dataUrl = await toJpeg(boardRef.current, {
        backgroundColor: '#050709',
        cacheBust: true,
        quality: 0.95,
      });
      const safeName =
        tierList.playlistName?.trim().replace(/[^\w\s-]+/g, '').replace(/\s+/g, '-') || 'tier-list';
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${safeName}.jpeg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      setDownloadError('Unable to download tier board. Refresh and try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-6xl bg-gray-900 px-4 py-10 text-gray-100 sm:px-6 lg:px-10">
      <header className="mb-8 rounded-2xl border border-gray-800 bg-gray-950/80 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {tierList.playlistImage && (
              <Image
                src={tierList.playlistImage}
                alt={`Cover art for ${tierList.playlistName}`}
                width={160}
                height={160}
                className="h-28 w-28 rounded-2xl object-cover ring-1 ring-white/10 sm:h-32 sm:w-32"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-white">{tierList.playlistName}</h1>
              <p className="text-sm text-gray-400">
                Built by {tierList.playlistOwner} • Shared{' '}
                {new Date(tierList.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {tierList.playlistId && (
              <Link
                href={`/tier-maker?playlistId=${encodeURIComponent(tierList.playlistId)}`}
                className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-emerald-400"
              >
                Fork This Tier List
              </Link>
            )}
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="rounded-md border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-gray-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isDownloading ? 'Preparing…' : 'Download JPEG'}
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-300">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={hideDecorations}
              onChange={(event) => setHideDecorations(event.target.checked)}
              className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-emerald-500 focus:ring-emerald-400"
            />
            <span>Hide decorations</span>
          </label>
          {downloadError && <span className="text-red-400">{downloadError}</span>}
        </div>
      </header>

      <section
        ref={boardRef}
        className="rounded-3xl border border-gray-800 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-5 shadow-2xl shadow-black/50"
      >
        <div className="space-y-4">
          {tierDefinitions.map((tier) => {
            const palette = tierPalette[tier.id as keyof typeof tierPalette] ?? defaultTierPalette;
            const metadata = tierMetadata[tier.id];
            const customColor = metadata?.color;
            const panelBg = customColor ?? (hideDecorations ? '#0f172a' : palette.panel);
            const panelBorder = hideDecorations ? '#374151' : palette.border;
            const textColorValue = metadata?.textColor;
            const textColor = hideDecorations
              ? '#e5e7eb'
              : textColorValue ?? palette.text;
            const subTextColor = hideDecorations
              ? '#9ca3af'
              : textColorValue
                ? hexToRgba(textColorValue, 0.75, palette.subtext)
                : palette.subtext;
            const badgeStyle = hideDecorations
              ? { border: '1px solid #4b5563', color: '#d1d5db', backgroundColor: 'transparent' }
              : { backgroundColor: palette.badgeBg, color: palette.badgeText };
            const displayTitle = metadata?.title?.trim().length ? metadata.title : tier.label;
            const displayCreator =
              metadata?.createdBy?.trim().length ? metadata.createdBy : tier.subheading;
            const laneBackground = customColor
              ? hexToRgba(
                  customColor,
                  hideDecorations ? 0.18 : 0.35,
                  hideDecorations ? 'transparent' : palette.lane
                )
              : hideDecorations
                ? 'transparent'
                : palette.lane;

            return (
              <article
                key={tier.id}
                className="rounded-2xl px-4 py-4"
                style={{ backgroundColor: panelBg, border: `1px solid ${panelBorder}` }}
              >
                <div className="mb-4 flex items-center justify-between" style={{ color: textColor }}>
                  <div className="space-y-2">
                    <p className="text-xl font-black uppercase tracking-wide">{displayTitle}</p>
                    <p className="text-sm" style={{ color: subTextColor }}>
                      {displayCreator}
                    </p>
                  </div>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold" style={badgeStyle}>
                    {tierGroups[tier.id].length} albums
                  </span>
                </div>
                <div
                  className="grid grid-cols-2 gap-3 rounded-2xl px-4 py-4 sm:grid-cols-3 lg:grid-cols-4"
                  style={{
                    backgroundColor: laneBackground,
                  }}
                >
                  {tierGroups[tier.id].length === 0 ? (
                    <p
                      className="rounded-xl border border-dashed px-3 py-6 text-center text-sm"
                      style={{
                        borderColor: panelBorder,
                        color: subTextColor,
                        backgroundColor: laneBackground,
                      }}
                    >
                      Nothing in this lane yet.
                    </p>
                  ) : (
                    tierGroups[tier.id].map((album) => (
                    <TierAlbumTileStatic
                      key={`${tier.id}-${album.id}`}
                      album={{ ...album, tier: tier.id }}
                      hideDecorations={hideDecorations}
                    />
                    ))
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
