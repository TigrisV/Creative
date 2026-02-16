import { NextRequest, NextResponse } from "next/server";
import {
  getChannelPartners,
  upsertChannelPartner,
  updatePartnerStatus,
  togglePartnerEnabled,
  deleteChannelPartner,
} from "@/lib/channel-manager";

// GET: Tüm channel partner'ları getir
export async function GET() {
  try {
    const partners = await getChannelPartners();
    return NextResponse.json({ data: partners });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Yeni partner ekle veya güncelle
export async function POST(req: NextRequest) {
  try {
    const { agencyId, name, credentials, commissionRate } = await req.json();

    if (!agencyId || !name || !credentials) {
      return NextResponse.json(
        { error: "agencyId, name ve credentials gerekli" },
        { status: 400 }
      );
    }

    const partner = await upsertChannelPartner(agencyId, name, credentials, commissionRate);
    return NextResponse.json({ data: partner });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: Partner durumunu veya enabled'ını güncelle
export async function PATCH(req: NextRequest) {
  try {
    const { partnerId, action, ...rest } = await req.json();

    if (!partnerId || !action) {
      return NextResponse.json(
        { error: "partnerId ve action gerekli" },
        { status: 400 }
      );
    }

    let partner;
    switch (action) {
      case "toggle":
        partner = await togglePartnerEnabled(partnerId, rest.enabled ?? false);
        break;
      case "status":
        partner = await updatePartnerStatus(partnerId, rest.status, rest.extra);
        break;
      default:
        return NextResponse.json({ error: `Bilinmeyen action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ data: partner });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Partner sil
export async function DELETE(req: NextRequest) {
  try {
    const { partnerId } = await req.json();

    if (!partnerId) {
      return NextResponse.json({ error: "partnerId gerekli" }, { status: 400 });
    }

    await deleteChannelPartner(partnerId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
