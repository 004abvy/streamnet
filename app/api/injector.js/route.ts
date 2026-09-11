import { NextResponse } from 'next/server';
import { GET_INJECTABLE_UBLOCK_BUNDLE } from '../../../utils/javascriptInjector';

export const dynamic = 'force-static';

export async function GET() {
  const js = GET_INJECTABLE_UBLOCK_BUNDLE();
  return new NextResponse(js, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
