import type { TierId } from '@/types/tier-list';

export type TierDefinition = {
  id: Exclude<TierId, 'unranked'>;
  label: string;
  subheading: string;
};

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
