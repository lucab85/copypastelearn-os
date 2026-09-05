import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/integrations/auth";
import { addMedusaLineItem, createMedusaCart, medusaConfigured } from "@/lib/integrations/commerce";

export async function POST(request: Request) {
  if (!medusaConfigured()) return NextResponse.json({ error: "Medusa is not configured" }, { status: 503 });
  const identity = await getIdentity();
  if (!identity.authenticated) return NextResponse.json({ error: "sign in with Clerk before creating a real commerce cart" }, { status: 401 });
  const body = await request.json().catch(() => null) as { cartId?: string; variantId?: string; quantity?: number } | null;
  if (!body?.variantId) return NextResponse.json({ error: "variantId required" }, { status: 400 });
  try {
    const created = body.cartId ? null : await createMedusaCart(identity.id);
    const cartId = body.cartId || String(created?.cart?.id || "");
    if (!cartId) throw new Error("Medusa returned no cart ID");
    const updated = await addMedusaLineItem(cartId, body.variantId, identity.id, Math.max(1, Math.min(body.quantity || 1, 10)));
    return NextResponse.json({ cartId, cart: updated.cart });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "cart error" }, { status: 502 });
  }
}
