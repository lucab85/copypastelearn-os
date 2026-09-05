import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/integrations/auth";
import { completeMedusaCart, medusaConfigured } from "@/lib/integrations/commerce";

export async function POST(request: Request) {
  if (!medusaConfigured()) return NextResponse.json({ error: "Medusa is not configured" }, { status: 503 });
  const identity = await getIdentity();
  if (!identity.authenticated) return NextResponse.json({ error: "authentication required" }, { status: 401 });
  const body = await request.json().catch(() => null) as { cartId?: string } | null;
  if (!body?.cartId) return NextResponse.json({ error: "cartId required" }, { status: 400 });
  try {
    const result = await completeMedusaCart(body.cartId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "checkout error" }, { status: 502 });
  }
}
