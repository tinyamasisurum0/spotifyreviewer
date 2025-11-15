'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ExternalLink } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { getAlbumsDetails, getPlaylistDetails, getPlaylistTracks } from '@/utils/spotifyApi';
import { tierDefinitions, unrankedDefinition } from '@/data/tierMaker';
import { tierPalette as sharedTierPalette, defaultTierPalette } from '@/data/tierPalette';
import type { TierId, TierListAlbum } from '@/types/tier-list';

type SpotifyAlbum = {
  id: string;
  name: string;
  images: { url: string }[];
  artists: { name: string }[];
  release_date: string;
  label?: string | null;
  external_urls?: { spotify?: string };
};

type SpotifyTrack = {
  track: {
    album: SpotifyAlbum;
  };
};

type TierMakerBoardProps = {
  playlistId: string;
};

const sanitizeLabel = (value?: string | null) =>
  value && value.trim().length > 0 ? value.trim() : null;

const tierOrder: TierId[] = ['s', 'a', 'b', 'c'];

type TierState = Record<TierId, TierListAlbum[]>;

const createEmptyTierState = (): TierState => ({
  unranked: [],
  s: [],
  a: [],
  b: [],
  c: [],
});

function TierRow({
  tier,
  albums,
  hideDecorations,
}: {
  tier: (typeof tierDefinitions)[number];
  albums: TierListAlbum[];
  hideDecorations: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: tier.id });
  const palette =
    sharedTierPalette[tier.id as keyof typeof sharedTierPalette] ?? defaultTierPalette;
  const backgroundColor = hideDecorations ? '#0f172a' : palette.panel;
  const borderColor = hideDecorations ? '#374151' : palette.border;
  const textColor = hideDecorations ? '#e5e7eb' : palette.text;
  const subTextColor = hideDecorations ? '#9ca3af' : palette.subtext;
  const badgeStyles = hideDecorations
    ? { border: '1px solid #4b5563', color: '#d1d5db', backgroundColor: 'transparent' }
    : { backgroundColor: palette.badgeBg, color: palette.badgeText };
  const laneBackground = hideDecorations ? 'transparent' : palette.lane;
  const laneRing = hideDecorations ? '2px solid rgba(16,185,129,0.4)' : `2px solid ${palette.border}`;

  return (
    <section
      className="rounded-2xl"
      style={{ backgroundColor, border: `1px solid ${borderColor}` }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"
        style={{ borderColor, color: textColor }}
      >
        <div>
          <p className="text-xl font-black uppercase tracking-wide">{tier.label}</p>
          <p className="text-sm" style={{ color: subTextColor }}>
            {tier.subheading}
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={badgeStyles}
        >
          {albums.length} album{albums.length === 1 ? '' : 's'}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className="grid grid-cols-2 gap-3 px-4 py-4 min-h-[150px] sm:grid-cols-3 lg:grid-cols-4"
        style={{
          backgroundColor: laneBackground,
          borderRadius: '0 0 1rem 1rem',
          outline: isOver ? laneRing : 'none',
        }}
      >
        <SortableContext items={albums.map((album) => album.id)} strategy={rectSortingStrategy}>
          {albums.length === 0 ? (
            <p className="text-sm" style={{ color: subTextColor }}>
              Drag albums here to mark them {tier.label.split('–')[0].trim()}.
            </p>
          ) : (
            albums.map((album) => (
              <TierAlbumTile
                key={album.id}
                album={{ ...album, tier: tier.id }}
                variant="tier"
                hideDecorations={hideDecorations}
              />
            ))
          )}
        </SortableContext>
      </div>
    </section>
  );
}

function UnrankedGrid({
  albums,
  hideDecorations,
}: {
  albums: TierListAlbum[];
  hideDecorations: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unranked' });

  return (
    <section
      className={`rounded-2xl border px-4 py-4 transition ${
        isOver ? 'border-emerald-400' : 'border-gray-800'
      } bg-gray-950/60`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 min-h-[58px]">
        <div>
          <p className="text-lg font-semibold text-white">{unrankedDefinition.label}</p>
          <p className="text-sm text-gray-400">{unrankedDefinition.subheading}</p>
        </div>
        <span className="rounded-full border border-gray-700 px-3 py-1 text-xs uppercase tracking-wide text-gray-300">
          {albums.length} album{albums.length === 1 ? '' : 's'}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className="grid max-h-[70vh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2"
      >
        <SortableContext items={albums.map((album) => album.id)} strategy={rectSortingStrategy}>
          {albums.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-700/80 px-4 py-6 text-center text-sm text-gray-400">
              Drop any album here to keep it off the tier board for now.
            </div>
          ) : (
            albums.map((album) => (
              <TierAlbumTile key={album.id} album={album} variant="bench" hideDecorations={hideDecorations} />
            ))
          )}
        </SortableContext>
      </div>
    </section>
  );
}

function EditableText({
  value,
  onChange,
  className,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (nextValue: string) => void;
  className?: string;
  placeholder?: string;
  ariaLabel: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(value);
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commit = useCallback(() => {
    onChange(draft.trim());
    setIsEditing(false);
  }, [draft, onChange]);

  const cancel = useCallback(() => {
    setDraft(value);
    setIsEditing(false);
  }, [value]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
      }
    },
    [commit, cancel]
  );

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className={`rounded border border-gray-600 bg-gray-900 px-2 py-1 text-inherit focus:border-emerald-400 focus:outline-none ${className ?? ''}`}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => setIsEditing(true)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setIsEditing(true);
        }
      }}
      className={`cursor-text rounded-sm transition hover:bg-emerald-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${className ?? ''}`}
      aria-label={ariaLabel}
    >
      {value.trim().length > 0 ? value : placeholder ?? ''}
    </span>
  );
}

function TierAlbumTile({
  album,
  variant,
  hideDecorations,
}: {
  album: TierListAlbum;
  variant: 'bench' | 'tier';
  hideDecorations: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: album.id,
  });
  const releaseDate = album.releaseDate
    ? (() => {
        try {
          return new Date(album.releaseDate).toLocaleDateString();
        } catch {
          return album.releaseDate;
        }
      })()
    : 'Unknown date';

  const containerClasses = [
    'flex flex-col gap-2 rounded-lg border border-gray-800 bg-gray-900/70 p-3 text-sm shadow transition',
    variant === 'tier' ? 'w-32 sm:w-36 md:w-40 flex-shrink-0' : '',
    'cursor-grab',
  ]
    .filter(Boolean)
    .join(' ');

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 5 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className={`${containerClasses} ${
        isDragging ? 'ring-2 ring-emerald-400 border-emerald-400' : 'hover:border-gray-700'
      }`}
>
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
            onClick={(event) => event.stopPropagation()}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
      <div className="space-y-1">
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

export default function TierMakerBoard({ playlistId }: TierMakerBoardProps) {
  const [playlistName, setPlaylistName] = useState('');
  const [playlistOwner, setPlaylistOwner] = useState('');
  const [playlistImage, setPlaylistImage] = useState<string | null>(null);
  const [tiers, setTiers] = useState<TierState>(() => createEmptyTierState());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hideDecorations, setHideDecorations] = useState(false);
  const [isPreparingDownload, setIsPreparingDownload] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadPlaylist() {
      try {
        setLoading(true);
        setError(null);
        setGeneratedImageUrl(null);
        setSaveSuccess(false);
        setSaveError(null);
        setTiers(createEmptyTierState());

        const tracks = await getPlaylistTracks(playlistId);
        const { name, owner, image } = await getPlaylistDetails(playlistId);

        if (isCancelled) {
          return;
        }

        setPlaylistName(name);
        setPlaylistOwner(owner);
        setPlaylistImage(image ?? null);

        let uniqueAlbums = tracks.reduce((acc: SpotifyAlbum[], item: SpotifyTrack) => {
          const spotifyAlbum = item.track.album;
          const albumId = spotifyAlbum.id || spotifyAlbum.name || `album-${acc.length}`;
          if (!acc.some((existing) => existing.id === albumId)) {
            acc.push({
              ...spotifyAlbum,
              id: albumId,
            });
          }
          return acc;
        }, []);

        const albumIds = uniqueAlbums
          .map((album: SpotifyAlbum) => album.id ?? '')
          .filter((albumId: string) => albumId.length > 0 && !albumId.startsWith('album-'));
        if (albumIds.length > 0) {
          try {
            const extraDetails = await getAlbumsDetails(albumIds);
            uniqueAlbums = uniqueAlbums.map((album) => {
              const details = extraDetails[album.id];
              if (!details) {
                return album;
              }
              return {
                ...album,
                label: sanitizeLabel(album.label) ?? sanitizeLabel(details.label),
                images:
                  album.images && album.images.length > 0
                    ? album.images
                    : Array.isArray(details.images)
                      ? details.images
                      : [],
                release_date: album.release_date ?? details.release_date ?? album.release_date,
                external_urls: album.external_urls ?? details.external_urls,
              };
            });
          } catch (detailError) {
            console.error('Failed to enrich albums for tier maker', detailError);
          }
        }

        const mappedAlbums: TierListAlbum[] = uniqueAlbums.map((album) => ({
          id: album.id,
          name: album.name,
          artist: album.artists?.[0]?.name ?? 'Unknown Artist',
          image: album.images?.[0]?.url ?? null,
          releaseDate: album.release_date ?? '',
          label: sanitizeLabel(album.label),
          notes: '',
          rating: null,
          spotifyUrl: album.external_urls?.spotify ?? null,
          tier: 'unranked',
        }));

        setTiers({
          unranked: mappedAlbums,
          s: [],
          a: [],
          b: [],
          c: [],
        });
      } catch {
        if (!isCancelled) {
          setError('Unable to fetch playlist data. Double-check the link and try again.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadPlaylist();

    return () => {
      isCancelled = true;
    };
  }, [playlistId]);

  const findContainerByItemId = (itemId: string | number | symbol): TierId | null => {
    const idString = String(itemId);
    if (idString in tiers) {
      return idString as TierId;
    }
    for (const key of Object.keys(tiers) as TierId[]) {
      if (tiers[key].some((album) => album.id === idString)) {
        return key;
      }
    }
    return null;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      return;
    }
    const activeContainer = findContainerByItemId(active.id);
    const overContainer = findContainerByItemId(over.id);
    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setTiers((prev) => {
      const activeItems = [...prev[activeContainer]];
      const overItems = [...prev[overContainer]];
      const activeIndex = activeItems.findIndex((album) => album.id === active.id);
      if (activeIndex < 0) {
        return prev;
      }
      const [moved] = activeItems.splice(activeIndex, 1);
      const overIndex = overItems.findIndex((album) => album.id === over.id);
      const insertionIndex = overIndex >= 0 ? overIndex : overItems.length;
      overItems.splice(insertionIndex, 0, { ...moved, tier: overContainer });

      return {
        ...prev,
        [activeContainer]: activeItems,
        [overContainer]: overItems,
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      return;
    }
    const activeContainer = findContainerByItemId(active.id);
    const overContainer = findContainerByItemId(over.id);
    if (!activeContainer || !overContainer) {
      return;
    }

    if (activeContainer === overContainer) {
      const activeIndex = tiers[activeContainer].findIndex((album) => album.id === active.id);
      const overIndex = tiers[overContainer].findIndex((album) => album.id === over.id);
      if (activeIndex !== overIndex && activeIndex >= 0 && overIndex >= 0) {
        setTiers((prev) => ({
          ...prev,
          [activeContainer]: arrayMove(prev[activeContainer], activeIndex, overIndex),
        }));
      }
    }
  };

  const flattenedAlbums = useMemo(() => {
    const orderedTiers: TierId[] = [...tierOrder, 'unranked'];
    return orderedTiers.flatMap((tierId) =>
      tiers[tierId].map((album, index) => ({
        ...album,
        tier: tierId,
        position: index,
      }))
    );
  }, [tiers]);

  const generateImage = useCallback(async () => {
    const node = boardRef.current;
    if (!node) {
      return null;
    }
    setIsPreparingDownload(true);
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const dataUrl = await toJpeg(node, {
        backgroundColor: '#050709',
        cacheBust: true,
        quality: 0.95,
      });
      setGeneratedImageUrl(dataUrl);
      setSaveError(null);
      setSaveSuccess(false);
      return dataUrl;
    } catch (err) {
      console.error('Failed to generate tier maker JPEG', err);
      setSaveError('Unable to generate the tier image. Please retry.');
      return null;
    } finally {
      setIsPreparingDownload(false);
    }
  }, []);

  const handleDownload = async () => {
    const imageUrl = generatedImageUrl ?? (await generateImage());
    if (!imageUrl) {
      return;
    }

    const link = document.createElement('a');
    link.download = 'playlist-tier-list.jpeg';
    link.href = imageUrl;
    link.click();
  };

  const handleSave = async () => {
    if (isSaving) {
      return;
    }
    const hasRankedAlbum = tierOrder.some((tierId) => tiers[tierId].length > 0);
    if (!hasRankedAlbum) {
      setSaveError('Drag at least one album into S, A, B, or C before sharing.');
      return;
    }
    const imageUrl = generatedImageUrl ?? (await generateImage());
    if (!imageUrl) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch('/api/tier-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playlistId,
          playlistName,
          playlistOwner,
          playlistImage,
          imageDataUrl: imageUrl,
          albums: flattenedAlbums.map((album) => ({
            id: album.id,
            name: album.name,
            artist: album.artist,
            image: album.image,
            releaseDate: album.releaseDate,
            label: album.label,
            notes: album.notes,
            rating: album.rating,
            spotifyUrl: album.spotifyUrl,
            tier: album.tier,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save tier list');
      }

      setSaveSuccess(true);
    } catch (err) {
      console.error('Failed to save tier list', err);
      setSaveError('Unable to save tier list. Try again in a moment.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-100">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4">
        <label className="inline-flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={hideDecorations}
            onChange={(event) => setHideDecorations(event.target.checked)}
            className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-emerald-500 focus:ring-emerald-400"
          />
          <span>Hide tier gradients & decorations</span>
        </label>
      </div>

      <div
        ref={boardRef}
        className="rounded-3xl border border-gray-800 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-5 shadow-xl shadow-black/40"
      >
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          {playlistImage && (
            <Image
              src={playlistImage}
              alt={`Cover art for ${playlistName}`}
              width={128}
              height={128}
              className="h-28 w-28 rounded-2xl object-cover ring-2 ring-emerald-500/40"
            />
          )}
          <div className="space-y-1">
            <EditableText
              value={playlistName}
              onChange={setPlaylistName}
              className="text-3xl font-bold text-white"
              placeholder="Untitled playlist"
              ariaLabel="Edit playlist title"
            />
            <p className="text-sm text-gray-400">
              Curated by{' '}
              <EditableText
                value={playlistOwner}
                onChange={setPlaylistOwner}
                className="font-semibold text-emerald-200"
                placeholder="Unknown curator"
                ariaLabel="Edit playlist owner"
              />
            </p>
          </div>
        </div>

        <DndContext sensors={sensors} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div className="space-y-6 lg:grid lg:grid-cols-[2fr_minmax(280px,1fr)] lg:gap-6 lg:space-y-0">
            <div className="space-y-4 lg:order-1">
              {tierDefinitions.map((tier) => (
                <TierRow
                  key={tier.id}
                  tier={tier}
                  albums={tiers[tier.id]}
                  hideDecorations={hideDecorations}
                />
              ))}
            </div>
            <div className="lg:order-2 lg:sticky lg:top-6 self-start">
              <UnrankedGrid albums={tiers.unranked} hideDecorations={hideDecorations} />
            </div>
          </div>
        </DndContext>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-950/70 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Export or Share</h2>
            <p className="text-sm text-gray-400">
              Generate the JPEG first, then download or send it to the shared tier wall.
            </p>
          </div>
          <button
            type="button"
            onClick={generateImage}
            disabled={isPreparingDownload}
            className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-gray-900 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-75"
          >
            {isPreparingDownload ? 'Preparing…' : 'Generate Tier Graphic'}
          </button>
        </div>
        {generatedImageUrl && (
          <div className="mt-4 rounded-xl border border-gray-800 bg-black/40 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-gray-400">Preview</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={generatedImageUrl}
              alt="Tier maker preview"
              className="mx-auto mt-3 max-h-96 rounded-lg border border-gray-800 object-contain"
            />
          </div>
        )}
        {saveError && (
          <p className="mt-4 rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {saveError}
          </p>
        )}
        {saveSuccess && (
          <p className="mt-4 rounded border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            Tier list saved. Visit the{' '}
            <a href="/reviews#tier-lists" className="font-semibold underline">
              shared wall
            </a>{' '}
            to grab the link.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-md border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-gray-500"
          >
            Download JPEG
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md border border-transparent bg-emerald-500 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? 'Saving…' : 'Save & Share'}
          </button>
        </div>
      </div>
    </div>
  );
}
