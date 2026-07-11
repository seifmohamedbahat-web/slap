import { NextRequest, NextResponse } from "next/server";
import { analyzeBusiness } from "@/lib/pipeline/analyzeBusiness";
import { qualifyLead } from "@/lib/pipeline/qualify";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profile = await analyzeBusiness(id);
  const score = await qualifyLead(id);
  return NextResponse.json({ profile, score });
}
