'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toJpeg } from 'html-to-image';
import type { StoredReview } from '@/types/review';
import ReviewAlbumsDisplay from '@/components/ReviewAlbumsDisplay';

interface ReviewDetailClientProps {
  review: StoredReview;
}

const formatDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const waitForNextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

const waitForRender = async () => {
  await waitForNextFrame();
  await waitForNextFrame();
};

export default function ReviewDetailClient({ review }: ReviewDetailClientProps) {
  const plainViewRef = useRef<HTMLDivElement>(null);
  const detailsViewRef = useRef<HTMLDivElement>(null);
  const [isPlainView, setIsPlainView] = useState(review.reviewMode === 'plain');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [activeDownloadMode, setActiveDownloadMode] = useState<'plain' | 'detailed' | null>(null);

  const handleTogglePlainView = useCallback(() => {
    setIsPlainView((prev) => !prev);
  }, []);

  const handleDownload = useCallback(
    async (mode: 'plain' | 'detailed') => {
      const targetNode =
        mode === 'plain' ? plainViewRef.current : detailsViewRef.current;
      if (!targetNode) {
        setShowDownloadOptions(false);
        return;
      }

      const targetIsPlain = mode === 'plain';
      const previousPlainState = isPlainView;

      try {
        setShowDownloadOptions(false);
        setIsDownloading(true);
        setActiveDownloadMode(mode);
        setDownloadError(null);

        if (previousPlainState !== targetIsPlain) {
          setIsPlainView(targetIsPlain);
          await waitForRender();
        } else {
          await waitForRender();
        }

        const dataUrl = await toJpeg(targetNode, {
          backgroundColor: '#111827',
          cacheBust: true,
          quality: 0.95,
        });

        const safeName =
          review.playlistName?.trim().replace(/[^\w\s-]+/g, '').replace(/\s+/g, '-') ||
          'review';
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download =
          mode === 'plain' ? `${safeName}-plain.jpeg` : `${safeName}-detailed.jpeg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        setDownloadError(
          error instanceof Error
            ? error.message
            : 'Failed to download image.'
        );
      } finally {
        if (previousPlainState !== targetIsPlain) {
          setIsPlainView(previousPlainState);
        }
        setActiveDownloadMode(null);
        setIsDownloading(false);
      }
    },
    [isPlainView, review.playlistName]
  );

  return (
    <div className="mx-auto min-h-screen max-w-6xl bg-gray-900 px-4 py-10 text-gray-100 sm:px-6 lg:px-10">
      <header className="mb-10 rounded-lg border border-gray-800 bg-gray-950/60 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {review.playlistImage && (
              <Image
                src={review.playlistImage}
                alt={`Cover art for ${review.playlistName}`}
                width={160}
                height={160}
                className="h-28 w-28 flex-shrink-0 rounded-lg object-cover ring-1 ring-white/10 sm:h-32 sm:w-32"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-white">{review.playlistName}</h1>
              <p className="text-sm text-gray-400">
                Curated by {review.playlistOwner || 'Unknown creator'} • Shared {formatDate(review.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            {review.playlistId && (
              <Link
                href={`/review-builder?reviewId=${encodeURIComponent(review.id)}${
                  review.playlistId ? `&playlistId=${encodeURIComponent(review.playlistId)}` : ''
                }`}
                className="inline-flex items-center gap-2 rounded-md bg-green-500 px-3 py-2 text-sm font-semibold text-gray-900 transition hover:bg-green-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-200"
              >
                Fork This Review
              </Link>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDownloadOptions((prev) => !prev)}
                disabled={isDownloading}
                className="inline-flex items-center gap-2 rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-semibold text-gray-200 transition hover:border-gray-500 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDownloading ? 'Preparing…' : 'Download as JPEG'}
              </button>
              {showDownloadOptions && (
                <div className="absolute right-0 z-20 mt-2 w-48 rounded-md border border-gray-700 bg-gray-900 shadow-lg">
                  <button
                    type="button"
                    onClick={() => handleDownload('plain')}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-200 transition hover:bg-gray-800"
                  >
                    Plain View
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload('detailed')}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-200 transition hover:bg-gray-800"
                  >
                    Detailed View
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {downloadError && (
          <p className="mt-3 text-sm text-red-400" role="status" aria-live="polite">
            {downloadError}
          </p>
        )}
      </header>

      <section className="space-y-4">
        <ReviewAlbumsDisplay
          albums={review.albums}
          isPlainView={isPlainView}
          onTogglePlainView={handleTogglePlainView}
          plainViewRef={plainViewRef}
          detailsViewRef={detailsViewRef}
          hideSpotifyLinks={isDownloading && activeDownloadMode === 'plain'}
        />
      </section>
    </div>
  );
}
