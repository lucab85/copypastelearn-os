import { NextRequest, NextResponse } from "next/server";
import { evaluateCommand } from "@/lib/engine/planner";
import type { EngineState } from "@/lib/engine/types";
export async function POST(req: NextRequest){try{const body=await req.json() as {command:string;state:EngineState};if(!body.command||!body.state)return NextResponse.json({error:"command and state required"},{status:400});return NextResponse.json(evaluateCommand(body.command,body.state));}catch{return NextResponse.json({error:"invalid request"},{status:400});}}
