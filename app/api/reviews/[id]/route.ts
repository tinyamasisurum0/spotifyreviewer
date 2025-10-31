import { NextResponse } from 'next/server';
import { deleteReviewById, getReviewById } from '@/lib/reviews';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: {
    id: string;
  };
};

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ message: 'Missing review id.' }, { status: 400 });
  }
  const deleted = await deleteReviewById(id);
  if (!deleted) {
    return NextResponse.json({ message: 'Review not found.' }, { status: 404 });
  }
  return NextResponse.json({ message: 'Review deleted.' }, { status: 200 });
}

export async function GET(_request: Request, { params }: RouteContext) {
  const review = await getReviewById(params.id);
  if (!review) {
    return NextResponse.json({ message: 'Review not found.' }, { status: 404 });
  }
  return NextResponse.json(review);
}
