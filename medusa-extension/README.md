# Medusa → CPL entitlement bridge

Copy `src/subscribers/order-placed.ts` into the Medusa v2 backend.

Set on Medusa:

- `CPL_URL=https://your-cpl-app`
- `CPL_WEBHOOK_SECRET=<same value as CPL MEDUSA_WEBHOOK_SECRET>`

For each Medusa product, set product metadata `cpl_entitlement` to an access key such as `mission:k8s-recovery`.

CPL's `/api/commerce/cart` route creates/adds items for a Clerk-authenticated user and writes `cpl_identity_id` into each line item's metadata. Medusa copies line-item metadata to the order item on placement. The subscriber listens to `order.placed`, reads that identity plus the product entitlement metadata, and sends a normalized idempotent grant event to CPL Core.
