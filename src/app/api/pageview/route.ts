import { NextResponse } from "next/server";
import { recordPageView } from "@/lib/db";

export async function POST() {
  recordPageView();
  return NextResponse.json({ ok: true });
}
