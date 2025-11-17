'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toJpeg } from 'html-to-image';
import { Share2 } from 'lucide-react';
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
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<'idle' | 'copied' | 'error'>('idle');
  const [copyError, setCopyError] = useState<string | null>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  useEffect(() => {
    if (!showShareMenu) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShareMenu]);

  const handleViewChange = useCallback((nextIsPlain: boolean) => {
    setIsPlainView(nextIsPlain);
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

  const handleCopyLink = useCallback(async () => {
    const targetUrl = shareUrl || window.location.href;
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopyFeedback('copied');
      setCopyError(null);
      setTimeout(() => setCopyFeedback('idle'), 2000);
    } catch {
      setCopyFeedback('error');
      setCopyError('Unable to copy the link. Select and copy it manually.');
    }
  }, [shareUrl]);

  const handleShareToggle = () => {
    setShowShareMenu((prev) => !prev);
    setShowDownloadOptions(false);
    setCopyFeedback('idle');
    setCopyError(null);
  };

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
                onClick={() => {
                  setShowDownloadOptions((prev) => !prev);
                  setShowShareMenu(false);
                }}
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
            <div className="relative" ref={shareMenuRef}>
              <button
                type="button"
                onClick={handleShareToggle}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-700 bg-gray-900 text-gray-200 transition hover:border-gray-500 hover:bg-gray-800"
                aria-label="Share this review"
              >
                <Share2 className="h-4 w-4" />
              </button>
              {showShareMenu && (
                <div className="absolute right-0 z-30 mt-2 w-64 rounded-md border border-gray-700 bg-gray-900 p-4 shadow-lg">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Share link</p>
                  <p className="mt-1 text-sm text-gray-300">Copy this URL to send the review.</p>
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      onFocus={(event) => event.currentTarget.select()}
                      className="flex-1 rounded-md border border-gray-700 bg-gray-950 px-2 py-1 text-xs text-gray-200 focus:border-emerald-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="rounded-md border border-gray-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-100 transition hover:border-emerald-400"
                    >
                      {copyFeedback === 'copied' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  {copyError && <p className="mt-2 text-xs text-red-400">{copyError}</p>}
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
          onViewChange={handleViewChange}
          plainViewRef={plainViewRef}
          detailsViewRef={detailsViewRef}
          hideSpotifyLinks={isDownloading && activeDownloadMode === 'plain'}
        />
      </section>
    </div>
  );
}
