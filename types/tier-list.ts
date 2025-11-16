export type TierId = 'unranked' | 's' | 'a' | 'b' | 'c';
export type RankedTierId = Exclude<TierId, 'unranked'>;

export interface TierListAlbum {
  id: string;
  name: string;
  artist: string;
  image: string | null;
  releaseDate: string;
  label: string | null;
  notes: string;
  rating: number | null;
  spotifyUrl: string | null;
  tier: TierId;
}

export interface TierMetadataEntry {
  title: string;
  createdBy: string;
  color: string;
  textColor: string;
}

export type TierMetadataMap = Record<RankedTierId, TierMetadataEntry>;

export interface StoredTierList {
  id: string;
  playlistId: string;
  playlistName: string;
  playlistOwner: string;
  playlistImage: string | null;
  imageDataUrl: string | null;
  createdAt: string;
  albums: TierListAlbum[];
  tierMetadata: TierMetadataMap;
}

export interface TierListInput {
  playlistId: string;
  playlistName: string;
  playlistOwner: string;
  playlistImage: string | null;
  imageDataUrl: string | null;
  albums: TierListAlbum[];
  tierMetadata: TierMetadataMap;
}
