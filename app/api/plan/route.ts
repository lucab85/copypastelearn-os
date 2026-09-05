import { NextResponse } from "next/server";
import { getMission } from "@/lib/engine/catalog";
import { planGoal, type GoalPlanInput } from "@/lib/engine/goal-planner";

export async function POST(request: Request) {
  const body = await request.json().catch(()=>null) as GoalPlanInput | null;
  if (!body?.goal?.trim()) return NextResponse.json({error:"goal required"},{status:400});
  const plan = planGoal(body);
  return NextResponse.json({ ...plan, mission:getMission(plan.missionId) });
}
