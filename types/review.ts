export type ReviewMode = 'review' | 'plain' | 'rating' | 'both';

export interface StoredAlbum {
  id: string;
  name: string;
  artist: string;
  image: string | null;
  releaseDate: string;
  label: string | null;
  notes: string;
  rating: number | null;
  spotifyUrl: string | null;
}

export interface StoredReview {
  id: string;
  playlistId: string;
  playlistName: string;
  playlistOwner: string;
  playlistImage: string | null;
  albums: StoredAlbum[];
  imageDataUrl: string | null;
  reviewMode: ReviewMode;
  createdAt: string;
}

export interface ReviewInput {
  playlistId: string;
  playlistName: string;
  playlistOwner: string;
  playlistImage: string | null;
  albums: StoredAlbum[];
  imageDataUrl: string | null;
  reviewMode: ReviewMode;
}
