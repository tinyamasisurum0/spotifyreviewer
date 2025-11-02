import type React from 'react';
import { Award, Crown, Medal } from 'lucide-react';

export interface RankDecoration {
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

export const getRankDecoration = (position: number): RankDecoration | null => {
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
