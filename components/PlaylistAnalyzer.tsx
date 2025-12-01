import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { getPlaylistTracks, getPlaylistDetails, getAlbumsDetails } from '../utils/spotifyApi';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toJpeg } from 'html-to-image';
import { Star, StarHalf, Trash2, ExternalLink, Sparkles } from 'lucide-react';
import type { StoredAlbum, ReviewMode } from '@/types/review';
import { getRankDecoration } from '@/components/rankDecorations';

const sanitizeLabel = (value?: string | null) =>
  value && value.trim().length > 0 ? value.trim() : null;

export type InputMode = ReviewMode;

interface SpotifyAlbum {
  id: string;
  name: string;
  images: { url: string }[];
  artists: { name: string }[];
  release_date: string;
  external_urls?: { spotify?: string };
  label?: string | null;
}

interface Album extends SpotifyAlbum {
  notes: string;
  rating: number | null;
  spotifyUrl: string | null;
  label?: string | null;
}

interface SortableAlbumItemProps {
  album: Album;
  index: number;
  onNotesChange: (id: string, notes: string) => void;
  onRatingChange: (id: string, rating: number | null) => void;
  inputMode: InputMode;
  onDelete: (id: string) => void;
  showDeleteButton: boolean;
  isRatingLocked: boolean;
  hideSpotifyLinks: boolean;
  hideRankDecorations: boolean;
}

interface InitialReviewData {
  playlistId: string;
  playlistName: string;
  playlistOwner: string;
  playlistImage: string | null;
  albums: StoredAlbum[];
}

const mapStoredAlbumToAlbum = (stored: StoredAlbum): Album => ({
  id: stored.id,
  name: stored.name,
  release_date: stored.releaseDate,
  images: stored.image ? [{ url: stored.image }] : [],
  artists: [{ name: stored.artist || 'Unknown Artist' }],
  label: stored.label && stored.label.trim().length > 0 ? stored.label.trim() : null,
  notes: stored.notes ?? '',
  rating: stored.rating ?? null,
  spotifyUrl: stored.spotifyUrl ?? null,
  external_urls: stored.spotifyUrl ? { spotify: stored.spotifyUrl } : undefined,
});

function SortableAlbumItem({
  album,
  index,
  onNotesChange,
  onRatingChange,
  inputMode,
  onDelete,
  showDeleteButton,
  isRatingLocked,
  hideSpotifyLinks,
  hideRankDecorations,
}: SortableAlbumItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: album.id });
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const rankDecoration = hideRankDecorations ? null : getRankDecoration(index);
  const badge = rankDecoration?.badge;
  const BadgeIcon = badge?.icon;
  const baseStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };
  const combinedStyle = rankDecoration?.containerStyle
    ? { ...baseStyle, ...rankDecoration.containerStyle }
    : baseStyle;
  const baseBackgroundClass = isDragging
    ? 'bg-gray-600'
    : index % 2 === 0
      ? 'bg-gray-800'
      : 'bg-gray-700';
  const cardClassName = `relative rounded-lg ${
    rankDecoration ? `overflow-hidden ${rankDecoration.containerClass}` : baseBackgroundClass
  }`;
  const rankNumberClass = rankDecoration?.numberClass ?? 'text-gray-300';
  const titleClassName = `text-lg font-semibold ${rankDecoration?.titleClass ?? ''}`.trim();
  const artistClassName = `${rankDecoration?.artistClass ?? 'text-gray-400'}`.trim();

  const showNotes = inputMode === 'review' || inputMode === 'both';
  const showRating = inputMode === 'rating' || inputMode === 'both';
  const stars = [1, 2, 3, 4, 5];
  const formatRating = (rating: number | null) => {
    if (rating == null) return 'No rating';
    const display = Number.isInteger(rating) ? rating.toString() : rating.toFixed(1);
    return `${display}/5`;
  };

  const resolveRatingFromEvent = (event: React.MouseEvent<HTMLButtonElement>, starValue: number) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const isHalf = clickX <= rect.width / 2;
    const rawRating = isHalf ? starValue - 0.5 : starValue;
    return Number(Math.max(0.5, rawRating).toFixed(1));
  };

  const handleRatingClick = (event: React.MouseEvent<HTMLButtonElement>, starValue: number) => {
    if (isRatingLocked) {
      return;
    }
    const nextRating = resolveRatingFromEvent(event, starValue);
    const isSameRating = album.rating != null && Math.abs(album.rating - nextRating) < 0.001;
    onRatingChange(album.id, isSameRating ? null : nextRating);
    setHoverRating(null);
  };

  const handleRatingHover = (event: React.MouseEvent<HTMLButtonElement>, starValue: number) => {
    if (isRatingLocked) {
      return;
    }
    const nextRating = resolveRatingFromEvent(event, starValue);
    setHoverRating(nextRating);
  };
  const displayedRating = isRatingLocked ? album.rating ?? 0 : hoverRating ?? album.rating ?? 0;

  return (
    <div
      ref={setNodeRef}
      style={combinedStyle}
      className={cardClassName}
    >
      {badge && (
        <div
          className={`pointer-events-none absolute bottom-0 left-0 flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badge.className}`}
        >
          {BadgeIcon && (
            <BadgeIcon className={`h-4 w-4 ${badge.iconClassName}`} />
          )}
          <span>{badge.label}</span>
        </div>
      )}
      <div className="relative z-10 flex flex-col gap-4 p-4 pb-12 lg:flex-row lg:items-start lg:gap-6">
        {/* Draggable area */}
        <p className={`self-start text-lg font-semibold lg:mt-1 ${rankNumberClass}`}>{index + 1}</p>
        <div
          {...attributes}
          {...listeners}
          className="flex w-full flex-col gap-4 cursor-move sm:flex-row sm:items-start sm:gap-4"
        >
          <div className="relative mx-auto aspect-square w-full max-w-xs flex-shrink-0 overflow-hidden rounded-lg ring-1 ring-white/5 sm:mx-0 sm:w-48 sm:max-w-none lg:w-64">
            <Image
              src={album.images[0]?.url || '/placeholder.svg'}
              alt={album.name}
              fill
              className="rounded-lg object-cover"
            />
          </div>
          <div className="flex-1">
            <h3 className={titleClassName}>{album.name}</h3>
            <p className={artistClassName}>{album.artists[0].name}</p>
            <p className="text-sm text-gray-500">
              Release Date: {new Date(album.release_date).toLocaleDateString()}
            </p>
            {album.spotifyUrl && !hideSpotifyLinks && (
              <a
                href={album.spotifyUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-green-300 transition-colors hover:text-green-200"
              >
                Open in Spotify
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
        {(showNotes || showRating) && (
          <div className={`flex w-full flex-col gap-4 ${showNotes ? 'lg:w-1/2' : 'lg:w-auto'}`}>
            {showRating && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="rounded border border-gray-600 bg-gray-800 p-3"
              >
                <p className="text-sm text-gray-400 mb-2">Rating</p>
                <div
                  className="flex flex-col gap-2"
                  onMouseLeave={() => {
                    if (!isRatingLocked) {
                      setHoverRating(null);
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    {stars.map((star) => {
                      const isFull = displayedRating >= star;
                      const isHalf = !isFull && displayedRating >= star - 0.5;
                      const iconClass = isFull || isHalf ? 'text-yellow-400' : 'text-gray-500';
                      const halfValue = Number((star - 0.5).toFixed(1));
                      const label = `Set rating to ${halfValue} or ${star} star${star > 1 ? 's' : ''}`;
                      const title = `Click left half for ${halfValue}, right half for ${star}`;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={
                            isRatingLocked ? undefined : (event) => handleRatingClick(event, star)
                          }
                          onMouseMove={
                            isRatingLocked ? undefined : (event) => handleRatingHover(event, star)
                          }
                          tabIndex={isRatingLocked ? -1 : 0}
                          aria-disabled={isRatingLocked}
                          aria-label={isRatingLocked ? undefined : label}
                          title={isRatingLocked ? undefined : title}
                          className={`relative h-8 w-8 transition-colors focus:outline-none ${
                            isRatingLocked ? 'cursor-default' : 'hover:text-yellow-300'
                          } ${iconClass} ${isRatingLocked ? 'pointer-events-none' : ''}`}
                        >
                          <span className="pointer-events-none">
                            {isFull ? (
                              <Star className="h-8 w-8" strokeWidth={1.5} fill="currentColor" />
                            ) : isHalf ? (
                              <StarHalf className="h-8 w-8" strokeWidth={1.5} fill="currentColor" />
                            ) : (
                              <Star className="h-8 w-8" strokeWidth={1.5} />
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-sm text-gray-400">
                    {formatRating(isRatingLocked ? album.rating : hoverRating ?? album.rating)}
                  </span>
                </div>
              </div>
            )}
            {showNotes && (
              <div onClick={(e) => e.stopPropagation()}>
                <p className="text-sm text-gray-400 mb-2">Review</p>
                <textarea
                  value={album.notes}
                  onChange={(e) => onNotesChange(album.id, e.target.value)}
                  className="w-full h-48 rounded border border-gray-600 bg-gray-800 p-2 text-base text-white resize-none sm:text-lg"
                  placeholder="Your Review..."
                />
              </div>
            )}
          </div>
        )}
      </div>
      {showDeleteButton && (
        <button
          type="button"
          onClick={() => onDelete(album.id)}
          className="absolute bottom-4 right-4 z-20 text-gray-400 transition-colors hover:text-red-400"
          aria-label={`Remove ${album.name} from the list`}
        >
          <Trash2 className="h-5 w-5" />
        </button>
      )}
      {rankDecoration?.accentBarClass && (
        <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-1 ${rankDecoration.accentBarClass}`} />
      )}
    </div>
  );
}

function SortablePlainAlbumItem({
  album,
  onDelete,
  showDeleteButton,
  hideSpotifyLinks,
}: {
  album: Album;
  onDelete: (id: string) => void;
  showDeleteButton: boolean;
  hideSpotifyLinks: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: album.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };

  const artist = album.artists[0]?.name?.trim() || 'Unknown Artist';
  const label = sanitizeLabel(album.label) ?? 'Unknown Label';
  let releaseDate = 'Unknown date';
  if (album.release_date) {
    try {
      releaseDate = new Date(album.release_date).toLocaleDateString();
    } catch {
      releaseDate = album.release_date;
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        {...attributes}
        {...listeners}
        className={`flex cursor-move flex-col gap-2 rounded-lg border border-gray-800 bg-gray-900/70 p-3 text-sm shadow transition ${
          isDragging ? 'ring-2 ring-green-400' : 'hover:border-gray-700'
        }`}
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-md border border-gray-800 bg-gray-950/80">
          {album.images && album.images.length > 0 && album.images[0]?.url ? (
            <Image src={album.images[0].url} alt={album.name} fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs uppercase tracking-wide text-gray-500">
              No Image
            </div>
          )}
          {album.spotifyUrl && !hideSpotifyLinks && (
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
          <h3 className="truncate text-sm font-semibold text-white">{album.name}</h3>
          <p className="truncate text-xs text-gray-400">{artist}</p>
          <p className="text-xs text-gray-500">Released {releaseDate}</p>
          <p className="truncate text-xs text-gray-500">Label · {label}</p>
        </div>
      </div>
      {showDeleteButton && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(album.id);
          }}
          className="absolute -right-2 -top-2 rounded-full bg-gray-950/90 p-1.5 text-gray-400 shadow-lg ring-1 ring-gray-700 transition hover:text-red-400"
          aria-label={`Remove ${album.name} from the list`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

interface EditableTextProps {
  value: string;
  onChange: (nextValue: string) => void;
  className?: string;
  placeholder?: string;
  ariaLabel: string;
  fullWidth?: boolean;
}

function EditableText({
  value,
  onChange,
  className,
  placeholder,
  ariaLabel,
  fullWidth,
}: EditableTextProps) {
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
    const nextValue = draft.trim();
    onChange(nextValue);
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
        className={`rounded border border-gray-600 bg-gray-900 px-2 py-1 text-inherit focus:border-green-400 focus:outline-none ${
          fullWidth ? 'w-full' : ''
        } ${className ?? ''}`}
      />
    );
  }

  const hasValue = value.trim().length > 0;
  const displayValue = hasValue ? value : placeholder ?? '';
  const labelClasses = [
    fullWidth ? 'block' : 'inline-flex items-center',
    'cursor-text rounded-sm transition-colors hover:bg-green-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400',
    className ?? '',
    hasValue ? '' : 'text-gray-500 italic',
  ]
    .filter(Boolean)
    .join(' ');

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
      className={labelClasses}
      aria-label={ariaLabel}
    >
      {displayValue || '\u00A0'}
    </span>
  );
}

interface SpotifyTrack {
  track: {
    album: SpotifyAlbum;
  };
}

interface PlaylistAnalyzerProps {
  playlistId: string;
  inputMode: InputMode;
  onInputModeChange: (mode: InputMode) => void;
  initialData?: InitialReviewData;
  importedAlbums?: SpotifyAlbum[];
}

export default function PlaylistAnalyzer({
  playlistId,
  inputMode,
  onInputModeChange,
  initialData,
  importedAlbums,
}: PlaylistAnalyzerProps) {
  const isRatingLocked = Boolean(initialData);
  const [albums, setAlbums] = useState<Album[]>(() => {
    if (initialData) {
      return initialData.albums.map(mapStoredAlbumToAlbum);
    }
    if (importedAlbums) {
      return importedAlbums.map((album) => ({
        ...album,
        images: album.images || [],
        artists: album.artists || [{ name: 'Unknown Artist' }],
        notes: '',
        rating: null,
        spotifyUrl: album.external_urls?.spotify ?? null,
        label: album.label && album.label.trim().length > 0 ? album.label.trim() : null,
      }));
    }
    return [];
  });
  const [loading, setLoading] = useState(() => !initialData && !importedAlbums);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [playlistName, setPlaylistName] = useState<string>(
    initialData?.playlistName ?? (importedAlbums ? 'Imported Album List' : '')
  );
  const [playlistOwner, setPlaylistOwner] = useState<string>(
    initialData?.playlistOwner ?? (importedAlbums ? 'You' : '')
  );
  const [playlistImage, setPlaylistImage] = useState<string | null>(initialData?.playlistImage ?? null);
  const [isPreparingDownload, setIsPreparingDownload] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hideRankDecorations, setHideRankDecorations] = useState(importedAlbums ? true : false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px hareket etmeden sürükleme başlamaz
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!initialData) {
      return;
    }
    setAlbums(initialData.albums.map(mapStoredAlbumToAlbum));
    setPlaylistName(initialData.playlistName);
    setPlaylistOwner(initialData.playlistOwner);
    setPlaylistImage(initialData.playlistImage ?? null);
    setLoading(false);
    setError(null);
    setGeneratedImageUrl(null);
    setShowDownloadModal(false);
    setSaveSuccess(false);
    setSaveError(null);
    setIsSavingReview(false);
    setIsPreparingDownload(false);
  }, [initialData]);

  useEffect(() => {
    if (!playlistId) {
      return;
    }
    if (initialData && initialData.playlistId === playlistId) {
      return;
    }
    if (importedAlbums) {
      return;
    }

    let isCancelled = false;

    async function fetchPlaylistData() {
      try {
        setLoading(true);
        setError(null);
        setPlaylistImage(null);
        setGeneratedImageUrl(null);
        setShowDownloadModal(false);
        setSaveSuccess(false);
        setSaveError(null);
        setIsSavingReview(false);
        setIsPreparingDownload(false);

        const tracks = await getPlaylistTracks(playlistId);
        const { name, owner, image } = await getPlaylistDetails(playlistId);

        if (isCancelled) {
          return;
        }

        setPlaylistName(name);
        setPlaylistOwner(owner);
        setPlaylistImage(image ?? null);

        let uniqueAlbums = tracks.reduce((acc: Album[], item: SpotifyTrack) => {
          const spotifyAlbum = item.track.album;
          const albumId = spotifyAlbum.id || spotifyAlbum.name || `album-${acc.length}`;
          const alreadyExists = acc.some((existing) => existing.id === albumId);
          if (!alreadyExists) {
            acc.push({
              ...spotifyAlbum,
              id: albumId,
              notes: '',
              rating: null,
              spotifyUrl: spotifyAlbum.external_urls?.spotify ?? null,
              label: sanitizeLabel(spotifyAlbum.label),
            });
          }
          return acc;
        }, []);

        const albumIdsForDetails = uniqueAlbums
          .map((album: Album) => album.id ?? '')
          .filter((albumId: string) => albumId.length > 0 && !albumId.startsWith('album-'));

        if (albumIdsForDetails.length > 0) {
          try {
            const albumDetails = await getAlbumsDetails(albumIdsForDetails);
            uniqueAlbums = uniqueAlbums.map((album: Album) => {
              const details = albumDetails[album.id];
              if (!details) {
                return album;
              }
              const mergedImages =
                album.images && album.images.length > 0
                  ? album.images
                  : Array.isArray(details.images)
                    ? details.images
                    : [];
              const mergedLabel =
                sanitizeLabel(album.label) ?? sanitizeLabel(details.label) ?? null;
              const mergedReleaseDate =
                album.release_date || details.release_date || album.release_date;
              const mergedSpotifyUrl =
                album.spotifyUrl ?? details.external_urls?.spotify ?? null;
              return {
                ...album,
                label: mergedLabel,
                images: mergedImages,
                release_date: mergedReleaseDate,
                spotifyUrl: mergedSpotifyUrl,
                external_urls: album.external_urls ?? details.external_urls,
              };
            });
          } catch (detailError) {
            console.error('Failed to enrich album details', detailError);
          }
        }

        setAlbums(uniqueAlbums);
      } catch {
        if (!isCancelled) {
          setError('Wrong playlist URL. Please ensure to paste a playlist URL');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchPlaylistData();

    return () => {
      isCancelled = true;
    };
  }, [playlistId, initialData, importedAlbums]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setAlbums((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleNotesChange = (albumId: string, notes: string) => {
    setAlbums(prevAlbums =>
      prevAlbums.map(album =>
        album.id === albumId ? { ...album, notes } : album
      )
    );
  };

  const handleRatingChange = (albumId: string, rating: number | null) => {
    if (isRatingLocked) {
      return;
    }
    setAlbums(prevAlbums =>
      prevAlbums.map(album =>
        album.id === albumId ? { ...album, rating } : album
      )
    );
  };

  const handleDeleteAlbum = (albumId: string) => {
    setAlbums(prevAlbums => prevAlbums.filter(album => album.id !== albumId));
  };

  const generateImage = async () => {
    const node = contentRef.current;
    if (!node) return;

    setIsPreparingDownload(true);
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const dataUrl = await toJpeg(node, {
        backgroundColor: '#1A202C',
        cacheBust: true,
        quality: 0.95,
      });
      setGeneratedImageUrl(dataUrl);
      setSaveError(null);
      setSaveSuccess(false);
      setShowDownloadModal(true);
    } catch (error) {
      console.error('Failed to generate image', error);
    } finally {
      setIsPreparingDownload(false);
    }
  };

  const handleDownloadJpeg = () => {
    if (!generatedImageUrl) return;

    const link = document.createElement('a');
    link.download = 'playlist-review.jpeg';
    link.href = generatedImageUrl;
    link.click();
  };

  const handleCloseModal = () => {
    setShowDownloadModal(false);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleGenerateClick = async () => {
    await generateImage();
  };

  const handleSaveReview = async () => {
    if (isSavingReview || saveSuccess) {
      return;
    }
    if (!generatedImageUrl) {
      setSaveError('Generate the image before saving your review.');
      return;
    }

    setIsSavingReview(true);
    setSaveError(null);

    const serializedAlbums = albums.map((album) => ({
      id: album.id,
      name: album.name,
      artist: album.artists?.[0]?.name ?? '',
      image: album.images?.[0]?.url ?? null,
      releaseDate: album.release_date,
      label: album.label && album.label.trim().length > 0 ? album.label.trim() : null,
      notes: album.notes,
      rating: album.rating,
      spotifyUrl: album.spotifyUrl,
    }));

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playlistId,
          playlistName,
          playlistOwner,
          playlistImage,
          albums: serializedAlbums,
          imageDataUrl: generatedImageUrl,
          reviewMode: inputMode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save review.');
      }

      setSaveSuccess(true);
    } catch (error) {
      console.error('Failed to save review', error);
      setSaveError('Failed to save review. Please try again.');
    } finally {
      setIsSavingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="mt-8 bg-gray-900 text-white">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-wide text-gray-400 mb-2">Review Mode</p>
        <div className="flex flex-wrap gap-3">
          {(['review', 'plain', 'rating', 'both'] as InputMode[]).map((mode) => (
            <label
              key={mode}
              className={`flex items-center space-x-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                inputMode === mode ? 'border-green-400 bg-gray-800' : 'border-gray-700 bg-gray-900'
              }`}
            >
              <input
                type="radio"
                name="input-mode"
                value={mode}
                checked={inputMode === mode}
                onChange={() => onInputModeChange(mode)}
                className="accent-green-500"
              />
              <span className="capitalize">{mode}</span>
            </label>
          ))}
        </div>
        <div className="mt-4">
          <label className="inline-flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={hideRankDecorations}
              onChange={(event) => setHideRankDecorations(event.target.checked)}
              className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-green-500 focus:ring-green-400"
            />
            <span>Unordered List</span>
          </label>
        </div>
      </div>
      <div ref={contentRef} className="p-3 sm:p-4 lg:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {playlistImage && (
              <Image
                src={playlistImage}
                alt={`Cover art for ${playlistName}`}
                width={96}
                height={96}
                className="h-16 w-16 rounded-lg object-cover ring-1 ring-white/10 sm:h-20 sm:w-20"
              />
            )}
            <div className="space-y-1">
              <EditableText
                value={playlistName}
                onChange={setPlaylistName}
                className="text-2xl font-bold text-white"
                placeholder="Untitled playlist"
                ariaLabel="Edit playlist name"
                fullWidth
              />
              <p className="text-gray-400">
                Created by{' '}
                <EditableText
                  value={playlistOwner}
                  onChange={setPlaylistOwner}
                  className="font-medium text-gray-300"
                  placeholder="Unknown creator"
                  ariaLabel="Edit playlist owner"
                />
              </p>
            </div>
          </div>
          {hideRankDecorations && (
            <span className="rounded border border-gray-700 bg-gray-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-300">
              Unordered List
            </span>
          )}
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={albums.map(album => album.id)}
            strategy={inputMode === 'plain' ? rectSortingStrategy : verticalListSortingStrategy}
          >

            {inputMode === 'plain' ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {albums.map((album) => (
                  <SortablePlainAlbumItem
                    key={album.id}
                    album={album}
                    onDelete={handleDeleteAlbum}
                    showDeleteButton={!isPreparingDownload}
                    hideSpotifyLinks={isPreparingDownload}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {albums.map((album, index) => (
                  <SortableAlbumItem
                    key={album.id}
                    album={album}
                    index={index}
                    onNotesChange={handleNotesChange}
                    onRatingChange={handleRatingChange}
                    inputMode={inputMode}
                    onDelete={handleDeleteAlbum}
                    showDeleteButton={!isPreparingDownload}
                    isRatingLocked={isRatingLocked}
                    hideSpotifyLinks={isPreparingDownload}
                    hideRankDecorations={hideRankDecorations}
                  />
              ))}
            </div>
          )}
          </SortableContext>
        </DndContext>
      </div>
      <div className="mt-12 mb-8 flex w-full justify-center">
        <button
          onClick={handleGenerateClick}
          disabled={isPreparingDownload}
          className="group relative inline-flex items-center gap-3 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-emerald-500/50 transition-all hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/60 disabled:cursor-not-allowed disabled:opacity-75 disabled:hover:scale-100"
        >
          <Sparkles className="h-6 w-6" />
          <span>{isPreparingDownload ? 'Preparing…' : 'Generate Review'}</span>
        </button>
      </div>
      <div className="h-6"></div>
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md space-y-6 rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-xl">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-white">Your image is ready</h3>
              <p className="text-sm text-gray-400">
                Download the generated JPEG whenever you&apos;re ready.
              </p>
            </div>
            <div className="flex h-32 w-full items-center justify-center rounded-lg border border-dashed border-gray-600 bg-gray-800 text-sm uppercase tracking-wide text-gray-500">
              Advertisement Placeholder
            </div>
            {saveSuccess && (
              <div className="rounded border border-green-500 bg-green-500/10 px-3 py-2 text-sm text-green-200">
                Review saved. Visit the{' '}
                <a href="/reviews" className="font-semibold text-green-300 underline underline-offset-2">
                  Review Listing
                </a>{' '}
                to share it.
              </div>
            )}
            {saveError && (
              <div className="rounded border border-red-500 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {saveError}
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded border border-gray-600 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-gray-400 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveReview}
                disabled={isSavingReview || saveSuccess || albums.length === 0}
                className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-80"
              >
                {saveSuccess ? 'Saved' : isSavingReview ? 'Saving…' : 'Save & Share'}
              </button>
              <button
                type="button"
                onClick={handleDownloadJpeg}
                className="rounded bg-green-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-600"
              >
                Download JPEG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
