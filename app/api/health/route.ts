import { NextResponse } from "next/server";
import { pingDb } from "@/lib/server/db";
import { clerkConfigured } from "@/lib/integrations/auth";
import { medusaConfigured } from "@/lib/integrations/commerce";

export async function GET() {
  const database = await pingDb();
  return NextResponse.json({
    status: "ok", service: "copypastelearn-os", engine: "alpha-4",
    capabilities: {
      clerk: clerkConfigured(), medusa: medusaConfigured(), database,
      ai: Boolean(process.env.AI_GATEWAY_API_KEY),
      sandbox: process.env.CPL_SANDBOX_MODE === "vercel" ? "vercel" : "simulated",
      durableLabs: process.env.CPL_SANDBOX_MODE === "vercel",
      normalizedEvidence: Boolean(process.env.DATABASE_URL),
    },
  });
}
