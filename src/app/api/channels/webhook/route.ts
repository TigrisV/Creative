import { NextRequest, NextResponse } from "next/server";
import { processWebhook, type WebhookPayload } from "@/lib/channel-manager";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate payload
    if (!body.event || !body.agencyId || !body.externalId || !body.data) {
      return NextResponse.json(
        { error: "Eksik alanlar: event, agencyId, externalId, data gerekli" },
        { status: 400 }
      );
    }

    const payload: WebhookPayload = {
      event: body.event,
      agencyId: body.agencyId,
      externalId: body.externalId,
      data: {
        guestName: body.data.guestName,
        roomType: body.data.roomType,
        checkIn: body.data.checkIn,
        checkOut: body.data.checkOut,
        adults: body.data.adults,
        children: body.data.children,
        totalAmount: body.data.totalAmount,
        currency: body.data.currency,
        status: body.data.status,
      },
    };

    const result = await processWebhook(payload);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("[Channel Webhook Error]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
