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
import { Star, StarHalf, Trash2 } from 'lucide-react';



export type InputMode = 'review' | 'rating' | 'both';

interface Album {
  id: string;
  name: string;
  images: { url: string }[];
  artists: { name: string }[];
  release_date: string;
  notes: string;
  rating: number | null;
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };
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
      style={style}
      className={`relative flex flex-col gap-4 rounded-lg p-4 pb-12 lg:flex-row lg:items-start lg:gap-6 ${
        isDragging ? 'bg-gray-600' : index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700'
      }`}
    >
      {showDeleteButton && (
        <button
          type="button"
          onClick={() => onDelete(album.id)}
          className="absolute bottom-4 right-4 text-gray-400 hover:text-red-400 transition-colors"
          aria-label={`Remove ${album.name} from the list`}
        >
          <Trash2 className="h-5 w-5" />
        </button>
      )}
      {/* Draggable area */}
      <p className="self-start text-lg font-semibold text-gray-300 lg:mt-1">{index + 1}</p>
      <div
        {...attributes}
        {...listeners}
        className="flex w-full flex-col gap-4 cursor-move sm:flex-row sm:items-start sm:gap-4"
      >
        <div className="relative mx-auto aspect-square w-full max-w-xs flex-shrink-0 overflow-hidden rounded-lg sm:mx-0 sm:w-48 sm:max-w-none lg:w-64">
          <Image
            src={album.images[0]?.url || '/placeholder.svg'}
            alt={album.name}
            fill
            className="rounded-lg object-cover"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{album.name}</h3>
          <p className="text-gray-400">{album.artists[0].name}</p>
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
  );
}

interface SpotifyTrack {
  track: {
    album: Album;
  };
}

interface PlaylistAnalyzerProps {
  playlistId: string;
  inputMode: InputMode;
  onInputModeChange: (mode: InputMode) => void;
}

export default function PlaylistAnalyzer({ playlistId, inputMode, onInputModeChange }: PlaylistAnalyzerProps) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [playlistName, setPlaylistName] = useState<string>('');
  const [playlistOwner, setPlaylistOwner] = useState<string>('');
  const [isPreparingDownload, setIsPreparingDownload] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

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
    async function fetchPlaylistData() {
      try {
        setLoading(true);
        setError(null);
        const tracks = await getPlaylistTracks(playlistId);
        const { name, owner } = await getPlaylistDetails(playlistId); 
        setPlaylistName(name);
        setPlaylistOwner(owner);

        const uniqueAlbums = tracks.reduce((acc: Album[], item: SpotifyTrack) => {
          const album = item.track.album;
          if (!acc.find((a) => a.name === album.name)) {
            acc.push({
              ...album,
              id: `album-${acc.length}`,
              notes: '',
              rating: null,
            });
          }
          return acc;
        }, []);
        setAlbums(uniqueAlbums);
      } catch {
        setError('Wrong playlist URL. Please ensure to paste a playlist URL');
      } finally {
        setLoading(false);
      }
    }

    fetchPlaylistData();
  }, [playlistId]);

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
  };

  const handleGenerateClick = async () => {
    await generateImage();
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
        <h2 className="text-2xl font-bold mb-2">{playlistName}</h2>
        <p className="text-gray-400 mb-4">Created by {playlistOwner}</p>
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
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded border border-gray-600 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-gray-400 hover:text-white"
              >
                Close
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
