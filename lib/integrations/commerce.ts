export type Entitlement = { key: string; source: "medusa" | "subscription" | "admin" };
export type CommerceProduct = { id: string; title: string; handle?: string; subtitle?: string; thumbnail?: string; entitlement?: string; price?: number; currency?: string; variantId?: string };

export function medusaConfigured() {
  return Boolean(process.env.MEDUSA_BACKEND_URL && process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY);
}

function backend() { return (process.env.MEDUSA_BACKEND_URL || "http://localhost:9000").replace(/\/$/, ""); }
function headers() { return { "content-type": "application/json", "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY! }; }

export async function listMedusaProducts(): Promise<CommerceProduct[]> {
  if (!medusaConfigured()) return [];
  const res = await fetch(`${backend()}/store/products?limit=50&fields=*variants.calculated_price`, { headers: headers(), next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`Medusa products failed: ${res.status}`);
  const data = await res.json() as { products?: Array<Record<string, any>> };
  return (data.products || []).map((product) => {
    const variant = product.variants?.[0];
    const calculated = variant?.calculated_price;
    return {
      id: String(product.id), title: String(product.title), handle: product.handle, subtitle: product.subtitle,
      thumbnail: product.thumbnail, entitlement: product.metadata?.cpl_entitlement, variantId: variant?.id,
      price: calculated?.calculated_amount, currency: calculated?.currency_code,
    };
  });
}

export async function createMedusaCart(identityId: string) {
  if (!medusaConfigured()) throw new Error("Medusa is not configured");
  if (!process.env.MEDUSA_REGION_ID) throw new Error("MEDUSA_REGION_ID is required");
  const res = await fetch(`${backend()}/store/carts`, {
    method: "POST", headers: headers(),
    body: JSON.stringify({ region_id: process.env.MEDUSA_REGION_ID, metadata: { cpl_identity_id: identityId } }),
  });
  if (!res.ok) throw new Error(`Medusa create cart failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{ cart: Record<string, any> }>;
}

export async function addMedusaLineItem(cartId: string, variantId: string, identityId: string, quantity = 1) {
  const res = await fetch(`${backend()}/store/carts/${encodeURIComponent(cartId)}/line-items`, {
    method: "POST", headers: headers(),
    body: JSON.stringify({ variant_id: variantId, quantity, metadata: { cpl_identity_id: identityId } }),
  });
  if (!res.ok) throw new Error(`Medusa add line item failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{ cart: Record<string, any> }>;
}

export async function completeMedusaCart(cartId: string) {
  const res = await fetch(`${backend()}/store/carts/${encodeURIComponent(cartId)}/complete`, { method: "POST", headers: headers() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Medusa complete cart failed: ${res.status}`);
  return data as Record<string, any>;
}
