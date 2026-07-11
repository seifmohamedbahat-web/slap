import { NextRequest, NextResponse } from "next/server";
import { generateAdminDashboard } from "@/lib/pipeline/generateDashboard";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dashboard = await generateAdminDashboard(id);
  return NextResponse.json({ dashboard });
}
