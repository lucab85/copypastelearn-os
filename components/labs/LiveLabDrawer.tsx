"use client";

import { useEffect, useRef, useState } from "react";
import type { EvidenceEvent } from "@/lib/engine/types";

type ValidationPayload = {
  validated: boolean;
  validators: Record<string, boolean>;
  evidence: Omit<EvidenceEvent, "id" | "missionId" | "timestamp"> | null;
  result?: { stdout?: string; stderr?: string; exitCode?: number };
};

export function LiveLabDrawer({ missionId, validationEnabled = false, onValidated, onReset }: { missionId: string; validationEnabled?: boolean; onValidated?: (payload: ValidationPayload) => void; onReset?: () => void }) {
  const [open, setOpen] = useState(false);
  const [capability, setCapability] = useState<"loading"|"vercel"|"simulated">("loading");
  const [status, setStatus] = useState<"idle"|"starting"|"ready"|"running"|"validating"|"resetting"|"validated"|"stopped"|"error">("idle");
  const [lines, setLines] = useState<string[]>(["Persistent isolated lab. Output is redacted before telemetry is stored."]);
  const [command, setCommand] = useState(validationEnabled ? "ls -la && cat service.log" : "pwd && uname -a");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/health").then(r=>r.json()).then(data=>setCapability(data?.capabilities?.sandbox === "vercel" ? "vercel" : "simulated")).catch(()=>setCapability("simulated"));
  }, []);

  useEffect(() => {
    setStatus("idle");
    setLines([validationEnabled ? "Live mission lab. Start the sandbox, inspect the incident, repair state, then run the server validator." : "Persistent isolated lab. Output is redacted before telemetry is stored."]);
    setCommand(validationEnabled ? "ls -la && cat service.log" : "pwd && uname -a");
  }, [missionId, validationEnabled]);

  const start = async () => {
    setStatus("starting");
    try {
      const r = await fetch("/api/labs/session", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({missionId}) });
      const data = await r.json();
      if (!r.ok || !data.ready) throw new Error(data.error || "lab unavailable");
      setStatus(data.mode === "real" ? "ready" : "idle");
      setLines(prev=>[...prev, data.mode === "real" ? `session ready · ${data.session?.name}${validationEnabled ? " · workdir /vercel/sandbox/cpl-mission" : ""}` : `simulated mode · ${data.reason || "enable Vercel Sandbox"}`]);
    } catch (e) { setStatus("error"); setLines(prev=>[...prev, `error · ${e instanceof Error ? e.message : "lab error"}`]); }
  };

  const exec = async () => {
    if (!command.trim()) return;
    const entered = command; setCommand(""); setStatus("running"); setLines(prev=>[...prev, `$ ${entered}`]);
    try {
      const r = await fetch("/api/labs/exec", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({missionId,command:entered}) });
      const data = await r.json();
      if (!r.ok || !data.executed) throw new Error(data.error || data.message || "execution unavailable");
      const result = data.result || {};
      setLines(prev=>[...prev, ...(result.stdout ? String(result.stdout).split("\n") : []), ...(result.stderr ? String(result.stderr).split("\n").map((x:string)=>`stderr · ${x}`) : []), `exit ${result.exitCode}`].slice(-100));
      setStatus("ready");
    } catch(e){ setStatus("error"); setLines(prev=>[...prev, `error · ${e instanceof Error ? e.message : "execution failed"}`]); }
    requestAnimationFrame(()=>inputRef.current?.focus());
  };

  const validate = async () => {
    setStatus("validating"); setLines(prev=>[...prev,"validator · checking real filesystem state…"]);
    try {
      const r = await fetch("/api/labs/validate", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({missionId}) });
      const data = await r.json() as ValidationPayload & { error?: string };
      if (!r.ok) throw new Error(data.error || "validator unavailable");
      const stdout = data.result?.stdout ? String(data.result.stdout).split("\n").filter(Boolean) : [];
      const stderr = data.result?.stderr ? String(data.result.stderr).split("\n").filter(Boolean).map(x=>`stderr · ${x}`) : [];
      setLines(prev=>[...prev,...stdout,...stderr,data.validated?"✓ LIVE EVIDENCE COMMITTED":"validator failed · repair the remaining state"].slice(-100));
      setStatus(data.validated ? "validated" : "ready");
      if (data.validated) onValidated?.(data);
    } catch(e) { setStatus("error"); setLines(prev=>[...prev,`error · ${e instanceof Error ? e.message : "validation failed"}`]); }
  };

  const resetIncident = async () => {
    setStatus("resetting"); setLines(prev=>[...prev,"reset · recreating incident fixture…"]);
    try {
      const r = await fetch("/api/labs/reset", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({missionId}) });
      const data = await r.json();
      if (!r.ok || !data.reset) throw new Error(data.error || "reset unavailable");
      setStatus("ready");
      setCommand("ls -la && cat service.log");
      setLines(prev=>[...prev,"incident reset · drift and unsafe permissions restored","mastery history retained; this mission run is open again"].slice(-100));
      onReset?.();
    } catch(e) { setStatus("error"); setLines(prev=>[...prev,`error · ${e instanceof Error ? e.message : "reset failed"}`]); }
  };

  const stop = async () => {
    try { await fetch("/api/labs/session", { method:"DELETE", headers:{"content-type":"application/json"}, body:JSON.stringify({missionId}) }); } catch {}
    setStatus("stopped"); setLines(prev=>[...prev,"session stopped · filesystem snapshot retained by provider policy"]);
  };

  return <div className={`live-lab ${open?"open":""}`}>
    <button className="live-lab-toggle" onClick={()=>setOpen(!open)}><i className={capability==="vercel"?"on":""}/><span>LIVE LAB</span><b>{capability==="vercel"?status.toUpperCase():"SIM"}</b></button>
    {open&&<div className="live-lab-body">
      <div className="live-lab-head"><div><small>{validationEnabled?"REAL MISSION / DURABLE":"DURABLE / ISOLATED"}</small><strong>{validationEnabled?"Linux incident environment":"Scratch Linux"}</strong></div><button onClick={()=>setOpen(false)}>×</button></div>
      <p className="live-lab-note">{validationEnabled?"This mission has a deterministic server-side validator. Fix the actual filesystem here; AI never sets mastery directly.":"Scratch execution is separate from deterministic mission grading. User + mission map to one named persistent sandbox."}</p>
      <div className="live-lab-actions"><button onClick={start} disabled={status==="starting"}>{status==="starting"?"Starting…":status==="ready"||status==="validated"?"Resume":"Start session"}</button>{validationEnabled&&<button onClick={validate} disabled={capability!=="vercel"||status==="validating"||status==="resetting"||status==="validated"}>{status==="validating"?"Validating…":status==="validated"?"Validated ✓":"Validate live environment"}</button>}{validationEnabled&&<button onClick={resetIncident} disabled={capability!=="vercel"||status==="resetting"}>{status==="resetting"?"Resetting…":"Reset incident"}</button>}<button onClick={stop}>Stop</button></div>
      <div className="live-lab-terminal">{lines.map((line,i)=><div key={i}>{line || " "}</div>)}</div>
      <div className="live-lab-input"><span>$</span><input ref={inputRef} value={command} onChange={e=>setCommand(e.target.value)} onKeyDown={e=>e.key==="Enter"&&exec()} placeholder="run a shell command"/><button onClick={exec}>↵</button></div>
    </div>}
  </div>;
}
