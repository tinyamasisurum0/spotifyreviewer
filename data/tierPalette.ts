import type { TierId } from '@/types/tier-list';

export type TierPalette = {
  panel: string;
  border: string;
  text: string;
  subtext: string;
  badgeBg: string;
  badgeText: string;
  lane: string;
};

export const tierPalette: Record<Exclude<TierId, 'unranked'>, TierPalette> = {
  s: {
    panel: '#123624',
    border: '#1f7a46',
    text: '#d4ffe9',
    subtext: '#a4f5cb',
    badgeBg: '#8fffc1',
    badgeText: '#0f2417',
    lane: '#0c2617',
  },
  a: {
    panel: '#0d2138',
    border: '#2563eb',
    text: '#d7e8ff',
    subtext: '#9cc1ff',
    badgeBg: '#9cc8ff',
    badgeText: '#0f1e32',
    lane: '#0a1726',
  },
  b: {
    panel: '#3a320f',
    border: '#eab308',
    text: '#fff4c2',
    subtext: '#f7de79',
    badgeBg: '#fde68a',
    badgeText: '#3b2903',
    lane: '#241f08',
  },
  c: {
    panel: '#2f1c08',
    border: '#f97316',
    text: '#ffe0c2',
    subtext: '#f9b176',
    badgeBg: '#fdba74',
    badgeText: '#3b1b02',
    lane: '#201305',
  },
};

export const defaultTierPalette = tierPalette.s;
