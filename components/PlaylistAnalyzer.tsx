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



interface Album {
  id: string;
  name: string;
  images: { url: string }[];
  artists: { name: string }[];
  release_date: string;
  notes: string;
}

interface SortableAlbumItemProps {
  album: Album;
  index: number;
  onNotesChange: (id: string, notes: string) => void;
}

function SortableAlbumItem({ album, index, onNotesChange }: SortableAlbumItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: album.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start space-x-4 p-4 rounded-lg ${
        isDragging ? 'bg-gray-600' : index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700'
      }`}
    >
      {/* Draggable area */}
      <p className={`text-lg`}>{index + 1}</p>
      <div
        {...attributes}
        {...listeners}
        className="flex items-start space-x-4 flex-grow cursor-move"
      >
        <div className="w-64 h-64 relative flex-shrink-0">
          <Image
            src={album.images[0]?.url || '/placeholder.svg'}
            alt={album.name}
            fill
            className="rounded-lg object-cover"
          />
        </div>
        <div className="flex-grow">
          <h3 className="font-semibold text-lg">{album.name}</h3>
          <p className="text-gray-400">{album.artists[0].name}</p>
          <p className="text-sm text-gray-500">
            Release Date: {new Date(album.release_date).toLocaleDateString()}
          </p>
        </div>
      </div>
      
      {/* Non-draggable textarea */}
      <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0 w-1/2">
        <textarea
          value={album.notes}
          onChange={(e) => onNotesChange(album.id, e.target.value)}
          className="w-full h-48 p-2 border border-gray-600 bg-gray-800 text-white text-lg rounded resize-none"
          placeholder="Your Review..."
        />
      </div>
    </div>
  );
}

interface SpotifyTrack {
  track: {
    album: Album;
  };
}

export default function PlaylistAnalyzer({ playlistId }: { playlistId: string }) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [playlistName, setPlaylistName] = useState<string>('');
  const [playlistOwner, setPlaylistOwner] = useState<string>('');

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

  const downloadAsJpeg = async () => {
    if (contentRef.current) {
      const dataUrl = await toJpeg(contentRef.current, {
        backgroundColor: '#1A202C',
        cacheBust: true,
        quality: 0.95,
      });
      const link = document.createElement('a');
      link.download = 'playlist-review.jpeg';
      link.href = dataUrl;
      link.click();
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
      <div ref={contentRef} className="p-4">
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
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
      <button
        onClick={downloadAsJpeg}
        className="m-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Download as JPEG
      </button>
      <p>Made by <a className='font-extrabold	' target='_blank' href="https://x.com/tinyamasisurum0">tinyamasisurum0</a> </p>
    </div>
  );
}