import { NextRequest, NextResponse } from "next/server";

const HIANIME_BASE = process.env.NEXT_PUBLIC_HIANIME_URL || "http://localhost:4002";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await context.params;
  const path = resolvedParams.path?.join("/") ?? "";
  const search = req.nextUrl.search ?? "";
  const url = `${HIANIME_BASE}/api/v2/${path}${search}`;

  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, error: error.message || "HiAnime proxy error" },
      { status: 500 }
    );
  }
}