import { NextRequest, NextResponse } from "next/server";
import { generateOutreach } from "@/lib/pipeline/outreach";
import { OutreachChannel } from "@/app/generated/prisma/enums";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const channel: OutreachChannel = body.channel ?? OutreachChannel.EMAIL;
  const message = await generateOutreach(id, channel);
  return NextResponse.json({ message });
}
