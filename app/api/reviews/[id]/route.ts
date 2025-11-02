import { NextResponse } from 'next/server';
import { getReviewById } from '@/lib/reviews';

type ReviewParams = {
  params: {
    id: string;
  };
};

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: ReviewParams) {
  const review = await getReviewById(params.id);

  if (!review) {
    return NextResponse.json({ message: 'Review not found.' }, { status: 404 });
  }

  return NextResponse.json(review);
}
