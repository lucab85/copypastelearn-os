import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";

/**
 * Copy into the Medusa v2 backend.
 * Product metadata: cpl_entitlement = "mission:docker-production"
 * CPL's add-to-cart route writes cpl_identity_id into line-item metadata. Medusa copies
 * line-item metadata to the resulting order item, so the entitlement bridge doesn't depend
 * on Medusa customer authentication or guessed order-level metadata propagation.
 */
export default async function orderPlacedHandler({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const query = container.resolve("query");
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "items.*", "items.metadata", "items.variant.product.metadata"],
    filters: { id: data.id },
  });
  const order = orders[0];
  const identityId = (order?.items || []).map((item: any) => item.metadata?.cpl_identity_id).find(Boolean);
  if (!identityId) return;
  const entitlements = Array.from(new Set((order.items || []).map((item: any) => item.variant?.product?.metadata?.cpl_entitlement).filter(Boolean)));
  if (!entitlements.length) return;
  const eventId = `medusa:${data.id}:order.placed`;
  const response = await fetch(`${process.env.CPL_URL}/api/webhooks/medusa`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-cpl-webhook-secret": process.env.CPL_WEBHOOK_SECRET! },
    body: JSON.stringify({ event_id: eventId, event_type: "order.placed", order_id: data.id, identity_id: identityId, entitlements }),
  });
  if (!response.ok) throw new Error(`CPL entitlement bridge failed: ${response.status}`);
}

export const config: SubscriberConfig = { event: "order.placed" };
