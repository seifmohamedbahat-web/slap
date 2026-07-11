import { prisma } from "@/lib/db/client";
import { askClaude, hasAnthropicKey } from "@/lib/integrations/anthropic";
import { OutreachChannel } from "@/app/generated/prisma/enums";
import type { Lead } from "@/app/generated/prisma/client";

const NAME_TITLES = new Set(["dr.", "dr", "mr.", "mr", "mrs.", "mrs", "ms.", "ms"]);

function firstName(ownerName: string | null): string {
  if (!ownerName) return "there";
  const parts = ownerName.split(" ").filter(Boolean);
  const first = parts.find((p) => !NAME_TITLES.has(p.toLowerCase()));
  return first ?? "there";
}

function templateEmail(lead: Lead, previewPath: string | null): { subject: string; body: string } {
  const first = firstName(lead.ownerName);
  const site = previewPath ? `https://preview.avexa.ai${previewPath}` : "the link below";
  return {
    subject: `A website for ${lead.businessName} — built, no cost to look`,
    body: `Hi ${first},

I noticed ${lead.businessName} doesn't have a website yet, even with${
      lead.googleRating ? ` a ${lead.googleRating}★ rating and` : ""
    } a strong reputation in ${lead.city ?? "the area"}. That's costing you customers who search online before they call.

So I went ahead and built one — free to look at, no obligation: ${site}

It includes your services, reviews, and a way for customers to reach you directly. If you like it, we can have it live on your own domain this week. If not, no worries at all.

Worth a quick look?

— AVEXA`,
  };
}

function templateSms(lead: Lead, previewPath: string | null): string {
  const site = previewPath ? `https://preview.avexa.ai${previewPath}` : "";
  return `Hi, this is AVEXA — we noticed ${lead.businessName} doesn't have a website, so we built you one free to check out: ${site} Reply STOP to opt out.`;
}

function templateDm(lead: Lead, previewPath: string | null): string {
  const site = previewPath ? `https://preview.avexa.ai${previewPath}` : "the preview";
  return `Hey! Love what you're doing at ${lead.businessName} 👋 Noticed you don't have a website yet, so we mocked one up for you: ${site} — no strings attached, just let us know what you think!`;
}

async function claudeOutreach(
  lead: Lead,
  channel: OutreachChannel,
  previewPath: string | null
): Promise<{ subject?: string; body: string } | null> {
  try {
    const text = await askClaude({
      system:
        "You write short, warm, non-salesy outreach messages for AVEXA, a web agency that builds free preview websites for businesses that don't have one yet. Never sound like a mass blast. Return ONLY the message body (and a Subject: line first if it's an email), no explanations.",
      prompt: `Channel: ${channel}
Business: ${lead.businessName}
Category: ${lead.category}
City: ${lead.city ?? "unknown"}
Rating: ${lead.googleRating ?? "unknown"} (${lead.reviewCount ?? 0} reviews)
Preview URL: ${previewPath ? `https://preview.avexa.ai${previewPath}` : "N/A"}`,
      maxTokens: 400,
    });
    if (channel === OutreachChannel.EMAIL) {
      const [subjectLine, ...rest] = text.split("\n");
      const subject = subjectLine.replace(/^Subject:\s*/i, "").trim();
      return { subject, body: rest.join("\n").trim() };
    }
    return { body: text.trim() };
  } catch {
    return null;
  }
}

export async function generateOutreach(
  leadId: string,
  channel: OutreachChannel = OutreachChannel.EMAIL
) {
  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: leadId },
    include: { website: true },
  });
  const previewPath = lead.website?.previewPath ?? null;

  let subject: string | undefined;
  let body: string;

  if (hasAnthropicKey()) {
    const ai = await claudeOutreach(lead, channel, previewPath);
    if (ai) {
      subject = ai.subject;
      body = ai.body;
    } else {
      ({ subject, body } = fallback());
    }
  } else {
    ({ subject, body } = fallback());
  }

  function fallback(): { subject?: string; body: string } {
    if (channel === OutreachChannel.EMAIL) return templateEmail(lead, previewPath);
    if (channel === OutreachChannel.SMS) return { body: templateSms(lead, previewPath) };
    return { body: templateDm(lead, previewPath) };
  }

  const message = await prisma.outreachMessage.create({
    data: {
      leadId,
      channel,
      subject,
      body,
      status: "DRAFT",
    },
  });

  await prisma.lead.update({ where: { id: leadId }, data: { status: "OUTREACH_READY" } });

  await prisma.activityEvent.create({
    data: {
      leadId,
      type: "outreach_drafted",
      message: `Drafted ${channel.toLowerCase()} outreach for ${lead.businessName} — awaiting approval`,
    },
  });

  return message;
}
