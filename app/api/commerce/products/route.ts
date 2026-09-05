import { NextResponse } from "next/server";
import { listMedusaProducts, medusaConfigured } from "@/lib/integrations/commerce";

export async function GET() {
  try { return NextResponse.json({ configured: medusaConfigured(), products: await listMedusaProducts() }); }
  catch (error) { return NextResponse.json({ configured: true, products: [], error: error instanceof Error ? error.message : "Medusa error" }, { status: 502 }); }
}
