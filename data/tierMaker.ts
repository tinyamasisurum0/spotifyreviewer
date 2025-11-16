import type { RankedTierId, TierId, TierMetadataMap } from '@/types/tier-list';
import { tierPalette } from '@/data/tierPalette';

export type TierDefinition = {
  id: RankedTierId;
  label: string;
  subheading: string;
};

export const rankedTierIds: RankedTierId[] = ['s', 'a', 'b', 'c'];

export const tierDefinitions: TierDefinition[] = [
  {
    id: 's',
    label: 'S Tier – Essentials',
    subheading:
      'Keep your absolute must-hear picks at the top and let the bold gradients do the bragging.',
  },
  {
    id: 'a',
    label: 'A Tier – Heavy Rotation',
    subheading: 'Use the notes panel to mark why these albums never leave your queue.',
  },
  {
    id: 'b',
    label: 'B Tier – Solid Finds',
    subheading:
      'Perfect home for niche mood boosters. Mention the mood so friends know when to spin them.',
  },
  {
    id: 'c',
    label: 'C Tier – Revisit Later',
    subheading:
      'Toggle off decorations for a clean checklist and leave yourself 2025 listening reminders.',
  },
];

export const unrankedDefinition = {
  id: 'unranked' as const,
  label: 'Unsorted Bench',
  subheading: 'Every album starts here. Drag them into any tier when you are ready.',
  accentClass: 'from-stone-700 via-gray-700 to-stone-800',
};

export const tierColorChoices: string[] = [
  '#F6E05E', // Pantone-style radiant yellow
  '#F4C542',
  '#F2A541',
  '#FFB347',
  '#FF6F61', // coral red
  '#E63946',
  '#B91C1C',
  '#7F1D1D',
  '#0B3954', // deep blue
  '#1D4ED8',
  '#3B82F6',
  '#1E3A8A',
  '#22D3EE', // aqua
  '#10B981',
  '#0D9488',
  '#14532D',
  '#F8F7F4', // warm white
  '#E2E8F0',
  '#94A3B8',
  '#111827', // near-black
];

export const tierTextColorChoices: string[] = ['#f8fafc', '#e2e8f0', '#475569', '#0f172a'];

export const createDefaultTierMetadata = (): TierMetadataMap =>
  rankedTierIds.reduce((acc, tierId) => {
    const definition = tierDefinitions.find((tier) => tier.id === tierId);
    const palette = tierPalette[tierId];
    acc[tierId] = {
      title: definition?.label ?? tierId.toUpperCase(),
      createdBy: definition?.subheading ?? '',
      color: palette?.panel ?? '#0f172a',
      textColor: palette?.text ?? '#f8fafc',
    };
    return acc;
  }, {} as TierMetadataMap);

export const mergeTierMetadata = (
  metadata:
    | Partial<
        Record<
          RankedTierId,
          Partial<{ title: unknown; createdBy: unknown; color: unknown; textColor: unknown }>
        >
      >
    | null
    | undefined
): TierMetadataMap => {
  const base = createDefaultTierMetadata();
  if (!metadata) {
    return base;
  }

  for (const tierId of rankedTierIds) {
    const entry = metadata[tierId];
    if (entry && typeof entry === 'object') {
      base[tierId] = {
        title:
          typeof entry.title === 'string' && entry.title.trim().length > 0
            ? entry.title
            : base[tierId].title,
        createdBy:
          typeof entry.createdBy === 'string' && entry.createdBy.trim().length > 0
            ? entry.createdBy
            : base[tierId].createdBy,
        color:
          typeof entry.color === 'string' && tierColorChoices.includes(entry.color)
            ? entry.color
            : base[tierId].color,
        textColor:
          typeof entry.textColor === 'string' && tierTextColorChoices.includes(entry.textColor)
            ? entry.textColor
            : base[tierId].textColor,
      };
    }
  }

  return base;
};
