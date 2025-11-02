import { notFound } from 'next/navigation';
import { getReviewById } from '@/lib/reviews';
import ReviewDetailClient from '@/components/ReviewDetailClient';

export const dynamic = 'force-dynamic';

type ReviewDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function ReviewDetailPage({ params }: ReviewDetailPageProps) {
  const review = await getReviewById(params.id);

  if (!review) {
    notFound();
  }

  return <ReviewDetailClient review={review} />;
}
