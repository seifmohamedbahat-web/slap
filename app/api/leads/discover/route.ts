import { NextRequest, NextResponse } from "next/server";
import { runDiscovery } from "@/lib/pipeline/discover";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await runDiscovery({
    industryKeyword: body.industryKeyword,
    locationKeyword: body.locationKeyword,
  });
  return NextResponse.json(result);
}
