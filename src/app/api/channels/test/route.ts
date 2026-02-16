import { NextRequest, NextResponse } from "next/server";
import {
  getChannelPartnerByAgencyId,
  testChannelConnection,
} from "@/lib/channel-manager";

export async function POST(req: NextRequest) {
  try {
    const { agencyId } = await req.json();

    if (!agencyId) {
      return NextResponse.json(
        { error: "agencyId gerekli" },
        { status: 400 }
      );
    }

    const partner = await getChannelPartnerByAgencyId(agencyId);
    if (!partner) {
      return NextResponse.json(
        { error: `Partner bulunamadı: ${agencyId}` },
        { status: 404 }
      );
    }

    const result = await testChannelConnection(partner);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("[Channel Test Error]", message);
    return NextResponse.json(
      { success: false, message, latencyMs: 0 },
      { status: 500 }
    );
  }
}
