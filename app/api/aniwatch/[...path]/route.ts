import { NextRequest, NextResponse } from "next/server";

const ANIWATCH_BASE = process.env.NEXT_PUBLIC_ANIWATCH_URL || "http://localhost:4001";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await context.params;
  const path = resolvedParams.path?.join("/") ?? "";
  const search = req.nextUrl.search ?? "";
  const url = `${ANIWATCH_BASE}/api/${path}${search}`;

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
      { success: false, error: error.message || "AniWatch proxy error" },
      { status: 500 }
    );
  }
}