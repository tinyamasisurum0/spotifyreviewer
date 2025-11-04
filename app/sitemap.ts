import type { MetadataRoute } from 'next';
import { readReviews } from '@/lib/reviews';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://myrating.space';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const reviews = await readReviews();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      changeFrequency: 'daily',
      priority: 1,
      lastModified: new Date(),
    },
    {
      url: `${siteUrl}/review-builder`,
      changeFrequency: 'weekly',
      priority: 0.8,
      lastModified: new Date(),
    },
    {
      url: `${siteUrl}/reviews`,
      changeFrequency: 'hourly',
      priority: 0.9,
      lastModified: new Date(),
    },
  ];

  const reviewEntries: MetadataRoute.Sitemap = reviews.map((review) => ({
    url: `${siteUrl}/reviews/${review.id}`,
    lastModified: new Date(review.createdAt),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...reviewEntries];
}
