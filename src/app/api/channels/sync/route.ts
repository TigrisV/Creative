import { NextRequest, NextResponse } from "next/server";
import {
  getChannelPartners,
  getChannelReservations,
  syncChannelReservationToPMS,
  getSyncLogs,
} from "@/lib/channel-manager";

// GET: Sync loglarını ve channel reservation'ları getir
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "logs";
    const partnerId = searchParams.get("partnerId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (type === "reservations") {
      const data = await getChannelReservations(partnerId);
      return NextResponse.json({ data });
    }

    if (type === "partners") {
      const data = await getChannelPartners();
      return NextResponse.json({ data });
    }

    // Default: sync logs
    const data = await getSyncLogs(partnerId, limit);
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Bekleyen channel reservation'ı PMS'e senkronize et
export async function POST(req: NextRequest) {
  try {
    const { channelReservationId } = await req.json();

    if (!channelReservationId) {
      return NextResponse.json(
        { error: "channelReservationId gerekli" },
        { status: 400 }
      );
    }

    const pmsResId = await syncChannelReservationToPMS(channelReservationId);

    return NextResponse.json({
      success: true,
      pmsReservationId: pmsResId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("[Channel Sync Error]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
