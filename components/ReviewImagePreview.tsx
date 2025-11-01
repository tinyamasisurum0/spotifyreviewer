'use client';

import NextImage from 'next/image';
import { useCallback, useState } from 'react';

type ReviewImagePreviewProps = {
  imageDataUrl: string;
  playlistName?: string | null;
};

const imageLoadingErrorMessage = 'Unable to download image preview.';

const toJpegDataUrl = (dataUrl: string) =>
  new Promise<string>((resolve, reject) => {
    const imageElement = document.createElement('img');
    imageElement.crossOrigin = 'anonymous';
    imageElement.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = imageElement.naturalWidth || imageElement.width;
      canvas.height = imageElement.naturalHeight || imageElement.height;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Canvas unsupported'));
        return;
      }
      context.drawImage(imageElement, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    imageElement.onerror = () => reject(new Error(imageLoadingErrorMessage));
    imageElement.src = dataUrl;
  });

export function ReviewImagePreview({ imageDataUrl, playlistName }: ReviewImagePreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = useCallback(async () => {
    try {
      setIsDownloading(true);
      setError(null);
      const jpegDataUrl = await toJpegDataUrl(imageDataUrl);
      const link = document.createElement('a');
      const safeName =
        playlistName?.trim().replace(/[^\w\s-]+/g, '').replace(/\s+/g, '-') || 'review-image';
      link.href = jpegDataUrl;
      link.download = `${safeName}.jpeg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(imageLoadingErrorMessage);
      }
    } finally {
      setIsDownloading(false);
    }
  }, [imageDataUrl, playlistName]);

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4 shadow-sm">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative h-40 w-40 flex-shrink-0 overflow-hidden rounded-md border border-gray-800 bg-black/40">
          <NextImage
            src={imageDataUrl}
            alt={`Generated review for ${playlistName ?? 'playlist'}`}
            fill
            sizes="160px"
            unoptimized
            className="object-cover"
          />
        </div>
        <div className="flex-1 space-y-3">
          <p className="text-sm text-gray-300">
            Download the generated review graphic as a JPEG to save or share later.
          </p>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="inline-flex items-center rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDownloading ? 'Preparing…' : 'Download JPEG'}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export default ReviewImagePreview;
