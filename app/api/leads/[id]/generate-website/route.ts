import { NextRequest, NextResponse } from "next/server";
import { generateWebsite } from "@/lib/pipeline/generateWebsite";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const site = await generateWebsite(id);
  return NextResponse.json({ site });
}
