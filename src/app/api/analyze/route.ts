import { NextResponse } from "next/server";

import { analyzeBusiness } from "@/lib/ai/analyze";
import { TrustedAnalyzeRequestSchema } from "@/lib/ai/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

export async function POST(request: Request): Promise<NextResponse> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 16_384) {
    return NextResponse.json(
      { status: "error", error: "REQUEST_TOO_LARGE" },
      { status: 413, headers: noStoreHeaders },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: "error", error: "INVALID_JSON" },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const parsed = TrustedAnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { status: "error", error: "INVALID_REQUEST" },
      { status: 400, headers: noStoreHeaders },
    );
  }

  try {
    const analysis = await analyzeBusiness(parsed.data, {
      oidcToken: request.headers.get("x-vercel-oidc-token") ?? undefined,
    });
    return NextResponse.json(analysis, {
      status: 200,
      headers: noStoreHeaders,
    });
  } catch {
    return NextResponse.json(
      { status: "error", error: "ANALYSIS_UNAVAILABLE" },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
