import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { getPlaylistTracks, getPlaylistDetails } from '../utils/spotifyApi';
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
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toJpeg } from 'html-to-image';
import { Star, StarHalf, Trash2, Crown, Medal, Award } from 'lucide-react';
import type { StoredAlbum } from '@/types/review';



export type InputMode = 'review' | 'rating' | 'both';

interface SpotifyAlbum {
  id: string;
  name: string;
  images: { url: string }[];
  artists: { name: string }[];
  release_date: string;
  external_urls?: { spotify?: string };
}

interface Album extends SpotifyAlbum {
  notes: string;
  rating: number | null;
  spotifyUrl: string | null;
}

interface SortableAlbumItemProps {
  album: Album;
  index: number;
  onNotesChange: (id: string, notes: string) => void;
  onRatingChange: (id: string, rating: number | null) => void;
  inputMode: InputMode;
  onDelete: (id: string) => void;
  showDeleteButton: boolean;
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
  notes: stored.notes ?? '',
  rating: stored.rating ?? null,
  spotifyUrl: stored.spotifyUrl ?? null,
  external_urls: stored.spotifyUrl ? { spotify: stored.spotifyUrl } : undefined,
});

interface RankDecoration {
  containerClass: string;
  containerStyle?: React.CSSProperties;
  badge: {
    label: string;
    className: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    iconClassName: string;
  };
  accentBarClass?: string;
  numberClass?: string;
  titleClass?: string;
  artistClass?: string;
}

const getRankDecoration = (position: number): RankDecoration | null => {
  switch (position) {
    case 0:
      return {
        containerClass:
          'bg-gray-900/80 border border-amber-300/60 shadow-[0_22px_45px_-25px_rgba(234,179,8,0.7)] backdrop-blur-sm',
        containerStyle: {
          backgroundImage: 'linear-gradient(135deg, rgba(253,224,71,0.42) 0%, rgba(17,24,39,0.94) 58%)',
        },
        badge: {
          label: 'Gold Champion',
          className:
            'bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-500 text-gray-900 shadow-lg',
          icon: Crown,
          iconClassName: 'text-amber-600',
        },
        accentBarClass: 'bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500',
        numberClass: 'text-amber-300 drop-shadow-[0_0_10px_rgba(250,204,21,0.85)]',
        titleClass: 'text-amber-100',
        artistClass: 'text-yellow-200/80',
      };
    case 1:
      return {
        containerClass:
          'bg-slate-900/80 border border-slate-300/40 shadow-[0_20px_40px_-28px_rgba(148,163,184,0.6)] backdrop-blur-[2px]',
        containerStyle: {
          backgroundImage: 'linear-gradient(135deg, rgba(203,213,225,0.32) 0%, rgba(15,23,42,0.94) 62%)',
        },
        badge: {
          label: 'Silver Runner-Up',
          className:
            'bg-gradient-to-r from-slate-100 via-slate-300 to-gray-400 text-gray-900 shadow-md',
          icon: Medal,
          iconClassName: 'text-slate-500',
        },
        accentBarClass: 'bg-gradient-to-r from-slate-200 via-slate-400 to-gray-500',
        numberClass: 'text-slate-200',
        titleClass: 'text-slate-100',
        artistClass: 'text-slate-300',
      };
    case 2:
      return {
        containerClass:
          'bg-stone-900/80 border border-orange-400/40 shadow-[0_18px_35px_-26px_rgba(234,88,12,0.6)] backdrop-blur-[1px]',
        containerStyle: {
          backgroundImage: 'linear-gradient(135deg, rgba(248,180,107,0.26) 0%, rgba(15,23,42,0.95) 66%)',
        },
        badge: {
          label: 'Bronze Third',
          className:
            'bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600 text-gray-900 shadow',
          icon: Award,
          iconClassName: 'text-orange-700',
        },
        accentBarClass: 'bg-gradient-to-r from-orange-300 via-amber-500 to-orange-600',
        numberClass: 'text-orange-200',
        titleClass: 'text-orange-100',
        artistClass: 'text-orange-200/80',
      };
    default:
      return null;
  }
};

function SortableAlbumItem({
  album,
  index,
  onNotesChange,
  onRatingChange,
  inputMode,
  onDelete,
  showDeleteButton,
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

  const rankDecoration = getRankDecoration(index);
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
    const nextRating = resolveRatingFromEvent(event, starValue);
    const isSameRating = album.rating != null && Math.abs(album.rating - nextRating) < 0.001;
    onRatingChange(album.id, isSameRating ? null : nextRating);
    setHoverRating(null);
  };

  const handleRatingHover = (event: React.MouseEvent<HTMLButtonElement>, starValue: number) => {
    const nextRating = resolveRatingFromEvent(event, starValue);
    setHoverRating(nextRating);
  };

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
                <div className="flex flex-col gap-2" onMouseLeave={() => setHoverRating(null)}>
                  <div className="flex items-center gap-2">
                    {stars.map((star) => {
                      const displayRating = hoverRating ?? album.rating ?? 0;
                      const isFull = displayRating >= star;
                      const isHalf = !isFull && displayRating >= star - 0.5;
                      const iconClass = isFull || isHalf ? 'text-yellow-400' : 'text-gray-500';
                      const halfValue = Number((star - 0.5).toFixed(1));
                      const label = `Set rating to ${halfValue} or ${star} star${star > 1 ? 's' : ''}`;
                      const title = `Click left half for ${halfValue}, right half for ${star}`;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={(event) => handleRatingClick(event, star)}
                          onMouseMove={(event) => handleRatingHover(event, star)}
                          className={`relative h-8 w-8 transition-colors hover:text-yellow-300 focus:outline-none ${iconClass}`}
                          aria-label={label}
                          title={title}
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
                  <span className="text-sm text-gray-400">{formatRating(hoverRating ?? album.rating)}</span>
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
}

export default function PlaylistAnalyzer({
  playlistId,
  inputMode,
  onInputModeChange,
  initialData,
}: PlaylistAnalyzerProps) {
  const [albums, setAlbums] = useState<Album[]>(() =>
    initialData ? initialData.albums.map(mapStoredAlbumToAlbum) : []
  );
  const [loading, setLoading] = useState(() => !initialData);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [playlistName, setPlaylistName] = useState<string>(initialData?.playlistName ?? '');
  const [playlistOwner, setPlaylistOwner] = useState<string>(initialData?.playlistOwner ?? '');
  const [playlistImage, setPlaylistImage] = useState<string | null>(initialData?.playlistImage ?? null);
  const [isPreparingDownload, setIsPreparingDownload] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

        const uniqueAlbums = tracks.reduce((acc: Album[], item: SpotifyTrack) => {
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
            });
          }
          return acc;
        }, []);
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
  }, [playlistId, initialData]);

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
          {(['review', 'rating', 'both'] as InputMode[]).map((mode) => (
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
      </div>
      <div ref={contentRef} className="p-3 sm:p-4 lg:p-6">
        <div className="mb-4 flex items-center gap-4">
          {playlistImage && (
            <Image
              src={playlistImage}
              alt={`Cover art for ${playlistName}`}
              width={96}
              height={96}
              className="h-16 w-16 rounded-lg object-cover ring-1 ring-white/10 sm:h-20 sm:w-20"
            />
          )}
          <div>
            <h2 className="text-2xl font-bold">{playlistName}</h2>
            <p className="text-gray-400">Created by {playlistOwner || 'Unknown creator'}</p>
          </div>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={albums.map(album => album.id)}
            strategy={verticalListSortingStrategy}
          >

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
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
      <div className="mt-6 flex w-full justify-center">
        <button
          onClick={handleGenerateClick}
          disabled={isPreparingDownload}
          className="w-full px-6 py-3 text-lg font-semibold text-center rounded-lg bg-blue-500 text-white shadow-lg transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-400 disabled:opacity-80 sm:w-auto sm:px-8"
        >
          Generate Image
        </button>
      </div>
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
