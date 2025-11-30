'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
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
import { ExternalLink, Loader2, Search } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import {
  getAlbumsDetails,
  getPlaylistDetails,
  getPlaylistTracks,
  extractPlaylistIdFromUrl,
  type SpotifyAlbumSearchResult,
} from '@/utils/spotifyApi';
import {
  tierDefinitions,
  createDefaultTierMetadata,
  tierColorChoices,
  tierTextColorChoices,
} from '@/data/tierMaker';
import { tierPalette as sharedTierPalette, defaultTierPalette } from '@/data/tierPalette';
import type { RankedTierId, TierId, TierListAlbum, TierMetadataMap } from '@/types/tier-list';

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


function TierRow({
  tier,
  albums,
  metadata,
  onMetadataChange,
  hideColorControls,
}: {
  tier: (typeof tierDefinitions)[number];
  albums: TierListAlbum[];
  metadata: TierMetadataMap[RankedTierId];
  onMetadataChange: (next: TierMetadataMap[RankedTierId]) => void;
  hideColorControls?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: tier.id });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const palette =
    sharedTierPalette[tier.id as keyof typeof sharedTierPalette] ?? defaultTierPalette;
  const customColor = tierColorChoices.includes(metadata.color) ? metadata.color : null;
  const customTextColor = tierTextColorChoices.includes(metadata.textColor) ? metadata.textColor : null;
  const backgroundColor = customColor ?? palette.panel;
  const borderColor = palette.border;
  const textColor = customTextColor ?? palette.text;
  const subTextColor = customTextColor
    ? hexToRgba(customTextColor, 0.75, palette.subtext)
    : palette.subtext;
  const laneBackground = customColor
    ? hexToRgba(customColor, 0.35, palette.lane)
    : palette.lane;
  const laneRing = customColor
    ? `2px solid ${customColor}`
    : `2px solid ${palette.border}`;

  useEffect(() => {
    if (!showColorPicker) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      if (!colorPickerRef.current) {
        return;
      }
      if (!colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [showColorPicker]);

  const handleColorChange = (color: string) => {
    onMetadataChange({ ...metadata, color });
    setShowColorPicker(false);
  };

  const handleTextColorChange = (color: string) => {
    onMetadataChange({ ...metadata, textColor: color });
  };

  const handleResetColors = () => {
    onMetadataChange({
      ...metadata,
      color: palette.panel,
      textColor: palette.text,
    });
    setShowColorPicker(false);
  };

  return (
    <section
      className="relative rounded-2xl"
      style={{ backgroundColor, border: `1px solid ${borderColor}` }}
    >
      {!hideColorControls && (
        <div ref={colorPickerRef} className="absolute right-4 top-4">
          <button
            type="button"
            onClick={() => setShowColorPicker((prev) => !prev)}
            className="relative h-8 w-8 rounded-full border border-white/70 bg-gradient-to-br from-rose-500 via-amber-300 to-emerald-400 shadow-lg shadow-black/30 hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            <span className="sr-only">Change {tier.label} color</span>
          </button>
          {showColorPicker && (
            <div className="absolute right-0 top-10 z-20 w-56 rounded-2xl border border-gray-700 bg-gray-900/95 p-4 shadow-xl shadow-black/40">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">
                Background
              </p>
              <div className="grid grid-cols-5 gap-3">
                {tierColorChoices.map((color) => (
                  <button
                    type="button"
                    key={color}
                    className={`h-8 w-8 rounded-full border-2 ${customColor === color ? 'border-white' : 'border-transparent hover:border-white/60'
                      }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorChange(color)}
                    aria-label={`Set ${tier.label} color to ${color}`}
                  />
                ))}
              </div>
              <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">
                Text Color
              </p>
              <div className="grid grid-cols-4 gap-2">
                {tierTextColorChoices.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleTextColorChange(color)}
                    className={`h-10 w-10 rounded-full border ${customTextColor === color ? 'border-white' : 'border-white/30'
                      }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Set ${tier.label} text color`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleResetColors}
                className="mt-4 w-full rounded-lg border border-gray-700 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-200 hover:border-emerald-400"
              >
                Reset to defaults
              </button>
            </div>
          )}
        </div>
      )}
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 pr-16"
        style={{ borderColor, color: textColor }}
      >
        <div className="space-y-2">
          <EditableText
            value={metadata.title}
            onChange={(value) => onMetadataChange({ ...metadata, title: value })}
            className="block text-xl font-black uppercase tracking-wide"
            placeholder={tier.label}
            ariaLabel={`Edit ${tier.label} tier title`}
          />
          <EditableText
            value={metadata.createdBy}
            onChange={(value) => onMetadataChange({ ...metadata, createdBy: value })}
            className="block text-sm"
            placeholder="Add the curator or vibe"
            ariaLabel={`Edit created by for ${tier.label}`}
          />
        </div>
        <div className="h-6" />
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
              Drag albums here to mark them{' '}
              {(metadata.title.trim() || tier.label).split('–')[0].trim()}.
            </p>
          ) : (
            albums.map((album) => (
              <TierAlbumTile key={album.id} album={{ ...album, tier: tier.id }} variant="tier" />
            ))
          )}
        </SortableContext>
      </div>
    </section>
  );
}

type BenchSearchProps = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchLoading: boolean;
  searchError: string | null;
  searchCooldown: boolean;
  onSearch: (query: string) => void;
  playlistUrl: string;
  setPlaylistUrl: (value: string) => void;
  playlistLoading: boolean;
  playlistError: string | null;
  onLoadPlaylist: (url: string) => void;
};

function AlbumTilePreview({ album }: { album: TierListAlbum }) {
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
    <div className="flex flex-col gap-2 rounded-lg border border-emerald-400 bg-gray-900/90 p-3 text-sm shadow-xl ring-2 ring-emerald-400 w-40">
      <div className="relative aspect-square w-full overflow-hidden rounded-md border border-gray-800 bg-gray-950/80">
        {album.image ? (
          <Image src={album.image} alt={album.name} fill className="object-cover" sizes="160px" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-widest text-gray-500">
            No Image
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="truncate text-sm font-semibold text-white">{album.name}</p>
        <p className="truncate text-xs text-gray-400">{album.artist}</p>
        <p className="text-xs text-gray-500">Released {releaseDate}</p>
        <p className="truncate text-[11px] uppercase tracking-wide text-gray-500">
          {album.label ?? 'No label credit'}
        </p>
      </div>
    </div>
  );
}

function SearchPanel({ search }: { search: BenchSearchProps }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-800 bg-gray-950/80 p-4 shadow-inner shadow-black/40">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Load Playlist</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            search.onLoadPlaylist(search.playlistUrl);
          }}
          className="flex flex-col gap-2"
        >
          <input
            type="text"
            value={search.playlistUrl}
            onChange={(event) => search.setPlaylistUrl(event.target.value)}
            placeholder="Paste Spotify playlist URL"
            className="w-full rounded-xl border border-gray-700/80 bg-gray-950/60 px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:border-emerald-400 focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-gray-900 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 disabled:opacity-70"
            disabled={search.playlistLoading}
          >
            {search.playlistLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>{search.playlistLoading ? 'Loading…' : 'Load Albums'}</span>
          </button>
        </form>
        {search.playlistError && (
          <p className="mt-3 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-100">
            {search.playlistError}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-950/80 p-4 shadow-inner shadow-black/40">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Search Albums</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            search.onSearch(search.searchQuery);
          }}
          className="flex flex-col gap-2"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search.searchQuery}
              onChange={(event) => search.setSearchQuery(event.target.value)}
              placeholder="Search albums or artists to add to bench"
              className="w-full rounded-xl border border-gray-700/80 bg-gray-950/60 px-10 py-3 text-sm text-gray-100 placeholder-gray-500 focus:border-emerald-400 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-gray-900 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 disabled:opacity-70"
            disabled={search.searchLoading || search.searchCooldown}
          >
            {search.searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span>
              {search.searchLoading
                ? 'Searching…'
                : search.searchCooldown
                  ? 'Wait a sec…'
                  : 'Search & add to bench'}
            </span>
          </button>
        </form>
        {search.searchError && (
          <p className="mt-3 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-100">
            {search.searchError}
          </p>
        )}
      </div>
    </div>
  );
}

function UnrankedGrid({ albums }: { albums: TierListAlbum[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unranked' });

  return (
    <section
      className={`rounded-2xl border px-4 py-4 ${isOver ? 'border-emerald-400' : 'border-gray-800'
        } bg-gray-950/60`}
    >

      <div
        ref={setNodeRef}
        className="grid max-h-[70vh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2"
      >
        <SortableContext items={albums.map((album) => album.id)} strategy={rectSortingStrategy}>
          {albums.map((album) => <TierAlbumTile key={album.id} album={album} variant="bench" />)}
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
      className={`cursor-text rounded-sm hover:bg-emerald-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${className ?? ''}`}
      aria-label={ariaLabel}
    >
      {value.trim().length > 0 ? value : placeholder ?? ''}
    </span>
  );
}

function TierAlbumTile({ album, variant }: { album: TierListAlbum; variant: 'bench' | 'tier' }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: album.id,
  });

  // Force hide browser's default drag preview
  const handleNativeDragStart = (e: React.DragEvent) => {
    const img = document.createElement('img');
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

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
    'flex flex-col gap-2 rounded-lg border border-gray-800 bg-gray-900/70 p-3 text-sm shadow',
    variant === 'tier'
      ? 'w-32 sm:w-36 md:w-40 flex-shrink-0'
      : 'w-full sm:w-36 md:w-40',
    'cursor-grab',
  ]
    .filter(Boolean)
    .join(' ');

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 5 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className={`${containerClasses} ${isDragging ? 'ring-2 ring-emerald-400 border-emerald-400' : 'hover:border-gray-700'
        }`}
      onDragStart={handleNativeDragStart}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-md border border-gray-800 bg-gray-950/80">
        {album.image ? (
          <Image src={album.image} alt={album.name} fill className="object-cover" draggable={false} />
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
            draggable={false}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
      <div className="space-y-1">
        <p className="truncate text-sm font-semibold text-white">{album.name}</p>
        <p className="truncate text-xs text-gray-400">{album.artist}</p>
        <p className="text-xs text-gray-500">Released {releaseDate}</p>
        <p className="truncate text-[11px] uppercase tracking-wide text-gray-500">
          {album.label ?? 'No label credit'}
        </p>
      </div>
    </div>
  );
}

export default function TierMakerBoard() {
  const [playlistName, setPlaylistName] = useState('Custom Tier Board');
  const [playlistOwner, setPlaylistOwner] = useState('You');
  const [playlistImage, setPlaylistImage] = useState<string | null>(null);
  const [tiers, setTiers] = useState<TierState>(() => createEmptyTierState());
  const [tierMetadata, setTierMetadata] = useState<TierMetadataMap>(() => createDefaultTierMetadata());
  const [isPreparingDownload, setIsPreparingDownload] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchCooldown, setSearchCooldown] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<{ type: 'album'; data: TierListAlbum } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const loadPlaylistAlbums = async (url: string) => {
    const playlistId = extractPlaylistIdFromUrl(url);
    if (!playlistId) {
      setPlaylistError('Invalid Spotify playlist URL. Make sure you\'re pasting a playlist link.');
      return;
    }

    try {
      setPlaylistLoading(true);
      setPlaylistError(null);

      const tracks = await getPlaylistTracks(playlistId);
      const { name, owner, image } = await getPlaylistDetails(playlistId);

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
          uniqueAlbums = uniqueAlbums.map((album: SpotifyAlbum) => {
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

      const mappedAlbums: TierListAlbum[] = uniqueAlbums.map((album: SpotifyAlbum) => ({
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

      // Append to existing albums, removing duplicates
      setTiers((prev) => {
        const existingIds = new Set(Object.values(prev).flat().map((album) => album.id));
        const uniqueNewAlbums = mappedAlbums.filter((album) => !existingIds.has(album.id));
        return {
          ...prev,
          unranked: [...prev.unranked, ...uniqueNewAlbums],
        };
      });

      setPlaylistUrl(''); // Clear the input after loading
    } catch (err) {
      console.error(err);
      setPlaylistError('Unable to fetch playlist data. Double-check the link and try again.');
    } finally {
      setPlaylistLoading(false);
    }
  };

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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    // Find the album being dragged from tiers
    const activeContainer = findContainerByItemId(active.id);
    if (activeContainer) {
      const album = tiers[activeContainer].find((a) => a.id === active.id);
      if (album) {
        setActiveDragItem({ type: 'album', data: album });
      }
    }
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
    setActiveDragItem(null);
    const { active, over } = event;

    if (!over) {
      const activeContainer = findContainerByItemId(active.id);
      if (!activeContainer) {
        return;
      }
      setTiers((prev) => ({
        ...prev,
        [activeContainer]: prev[activeContainer].filter((album) => album.id !== active.id),
      }));
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

    const tierPlaylistId = 'custom-tier-board';

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch('/api/tier-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playlistId: tierPlaylistId,
          playlistName: playlistName || 'Custom Tier Board',
          playlistOwner: playlistOwner || 'Unknown curator',
          playlistImage,
          imageDataUrl: imageUrl,
          tierMetadata,
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

  const performAlbumSearch = async (query: string) => {
    const term = query.trim();
    if (!term) {
      setSearchError('Type an artist, album, or keyword to search.');
      return;
    }
    try {
      setSearchLoading(true);
      setSearchError(null);
      setSearchCooldown(true);
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(term)}&limit=12`);
      if (!response.ok) {
        throw new Error('Spotify search failed. Check your API keys and try again.');
      }
      const data = await response.json();
      let newAlbums: SpotifyAlbumSearchResult[] = Array.isArray(data.albums) ? data.albums : [];

      // Enrich with album details (including label) like we do for playlists
      const albumIds = newAlbums.map((album) => album.id).filter((id) => id && id.length > 0);
      let albumDetailsMap: Record<string, { label?: string | null }> = {};
      if (albumIds.length > 0) {
        try {
          albumDetailsMap = await getAlbumsDetails(albumIds);
        } catch (detailError) {
          console.error('Failed to enrich search results with album details', detailError);
        }
      }

      // Add search results directly to unranked tier
      setTiers((prev) => {
        const existingIds = new Set(Object.values(prev).flat().map((album) => album.id));
        const uniqueNewAlbums: TierListAlbum[] = newAlbums
          .filter((album) => !existingIds.has(album.id))
          .map((album) => {
            const details = albumDetailsMap[album.id];
            return {
              id: album.id,
              name: album.name,
              artist: album.artists[0] ?? 'Unknown Artist',
              image: album.image,
              releaseDate: album.releaseDate ?? '',
              label: sanitizeLabel(details?.label),
              notes: '',
              rating: null,
              spotifyUrl: album.spotifyUrl,
              tier: 'unranked',
            };
          });

        return {
          ...prev,
          unranked: [...prev.unranked, ...uniqueNewAlbums],
        };
      });

      setSearchQuery(''); // Clear the search input after adding
    } catch (err) {
      console.error(err);
      setSearchError(err instanceof Error ? err.message : 'Unexpected error while searching Spotify.');
    } finally {
      setSearchLoading(false);
      setTimeout(() => setSearchCooldown(false), 600);
    }
  };

  return (
    <div className="space-y-6">
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

        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div
            className={`space-y-6 lg:grid ${isPreparingDownload ? 'lg:grid-cols-1' : 'lg:grid-cols-[2fr_minmax(280px,1fr)]'
              } lg:gap-6 lg:space-y-0`}
          >
            <div className="space-y-4 lg:order-1">
              {tierDefinitions.map((tier) => (
                <TierRow
                  key={tier.id}
                  tier={tier}
                  albums={tiers[tier.id]}
                  metadata={
                    tierMetadata[tier.id] ?? {
                      title: tier.label,
                      createdBy: tier.subheading,
                      color:
                        sharedTierPalette[tier.id as keyof typeof sharedTierPalette]?.panel ?? '#0f172a',
                      textColor:
                        sharedTierPalette[tier.id as keyof typeof sharedTierPalette]?.text ?? '#f8fafc',
                    }
                  }
                  onMetadataChange={(next) =>
                    setTierMetadata((prev) => ({
                      ...prev,
                      [tier.id]: next,
                    }))
                  }
                  hideColorControls={isPreparingDownload}
                />
              ))}
            </div>
            {!isPreparingDownload && (
              <div className="lg:order-2 lg:sticky lg:top-6 self-start">
                <div className="mb-4">
                  <SearchPanel
                    search={{
                      searchQuery,
                      setSearchQuery,
                      searchLoading,
                      searchError,
                      searchCooldown,
                      onSearch: performAlbumSearch,
                      playlistUrl,
                      setPlaylistUrl,
                      playlistLoading,
                      playlistError,
                      onLoadPlaylist: loadPlaylistAlbums,
                    }}
                  />
                </div>
                <UnrankedGrid albums={tiers.unranked} />
              </div>
            )}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeDragItem && (
              <div className="w-40 flex-shrink-0">
                <AlbumTilePreview album={activeDragItem.data} />
              </div>
            )}
          </DragOverlay>
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
