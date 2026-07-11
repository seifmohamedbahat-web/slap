import { NextRequest, NextResponse } from "next/server";
import { generateBookingSystem } from "@/lib/pipeline/generateBooking";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const booking = await generateBookingSystem(id);
  return NextResponse.json({ booking });
}
