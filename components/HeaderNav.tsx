'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { href: '/blog', label: 'Blog' },
  { href: '/', label: 'Reviews' },
  { href: '/tier-maker', label: 'Tier Maker' },
  { href: '/topster', label: 'Topster' },
  { href: '/review-builder', label: 'Review Builder' },
];

export function HeaderNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        aria-label="Toggle navigation"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center justify-center rounded border border-emerald-500/40 bg-gray-900/70 p-2 text-emerald-200 shadow-md transition-colors hover:border-emerald-400 hover:text-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 md:hidden"
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>
      <nav className="hidden items-center gap-4 text-gray-300 md:flex">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded px-2 py-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400 ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'hover:text-green-300'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      {isOpen && (
        <div className="absolute right-0 top-12 w-52 rounded-lg border border-gray-700 bg-gray-900/95 p-3 shadow-xl md:hidden">
          <ul className="space-y-2 text-sm text-gray-200">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`block rounded px-3 py-2 transition-colors ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-200'
                        : 'hover:bg-emerald-500/10 hover:text-emerald-200'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
