"use client";
import { useEffect, useState } from "react";

type Health = { capabilities?: { clerk:boolean; medusa:boolean; database:{configured:boolean;ok:boolean}; ai:boolean; sandbox:string } };
export function SystemStatus(){
  const [health,setHealth]=useState<Health|null>(null);
  useEffect(()=>{fetch('/api/health').then(r=>r.json()).then(setHealth).catch(()=>{});},[]);
  const caps=health?.capabilities;
  const rows=[
    ["Identity / Clerk",caps?.clerk?"LIVE":"DEMO"],
    ["CPL Postgres",caps?.database?.ok?"LIVE":caps?.database?.configured?"ERROR":"LOCAL"],
    ["Commerce / Medusa",caps?.medusa?"LIVE":"ADAPTER"],
    ["AI Coach",caps?.ai?"LIVE*":"DETERMINISTIC"],
    ["Sandbox",caps?.sandbox==="vercel"?"VERCEL":"SIMULATED"],
  ];
  return <div className="capability-grid">{rows.map(([name,state])=><div key={name}><span>{name}</span><b className={state==="LIVE"||state==="VERCEL"?"live":"fallback"}>{state}</b></div>)}<small>* AI spends only for authenticated Clerk users.</small></div>;
}
