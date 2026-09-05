"use client";

import { useEffect, useRef, useState } from "react";

export function LiveLabDrawer({ missionId }: { missionId: string }) {
  const [open, setOpen] = useState(false);
  const [capability, setCapability] = useState<"loading"|"vercel"|"simulated">("loading");
  const [status, setStatus] = useState<"idle"|"starting"|"ready"|"running"|"stopped"|"error">("idle");
  const [lines, setLines] = useState<string[]>(["Persistent scratch lab. Real output is redacted before telemetry is stored."]);
  const [command, setCommand] = useState("pwd && uname -a");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/health").then(r=>r.json()).then(data=>setCapability(data?.capabilities?.sandbox === "vercel" ? "vercel" : "simulated")).catch(()=>setCapability("simulated"));
  }, []);

  const start = async () => {
    setStatus("starting");
    try {
      const r = await fetch("/api/labs/session", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({missionId}) });
      const data = await r.json();
      if (!r.ok || !data.ready) throw new Error(data.error || "lab unavailable");
      setStatus(data.mode === "real" ? "ready" : "idle");
      setLines(prev=>[...prev, data.mode === "real" ? `session ready · ${data.session?.name}` : `simulated mode · ${data.reason || "enable Vercel Sandbox"}`]);
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
      setLines(prev=>[...prev, ...(result.stdout ? String(result.stdout).split("\n") : []), ...(result.stderr ? String(result.stderr).split("\n").map((x:string)=>`stderr · ${x}`) : []), `exit ${result.exitCode}`].slice(-80));
      setStatus("ready");
    } catch(e){ setStatus("error"); setLines(prev=>[...prev, `error · ${e instanceof Error ? e.message : "execution failed"}`]); }
    requestAnimationFrame(()=>inputRef.current?.focus());
  };

  const stop = async () => {
    try { await fetch("/api/labs/session", { method:"DELETE", headers:{"content-type":"application/json"}, body:JSON.stringify({missionId}) }); } catch {}
    setStatus("stopped"); setLines(prev=>[...prev,"session stopped · filesystem snapshot retained by provider policy"]);
  };

  return <div className={`live-lab ${open?"open":""}`}>
    <button className="live-lab-toggle" onClick={()=>setOpen(!open)}><i className={capability==="vercel"?"on":""}/><span>LIVE LAB</span><b>{capability==="vercel"?status.toUpperCase():"SIM"}</b></button>
    {open&&<div className="live-lab-body">
      <div className="live-lab-head"><div><small>DURABLE / ISOLATED</small><strong>Scratch Linux</strong></div><button onClick={()=>setOpen(false)}>×</button></div>
      <p className="live-lab-note">Separate from deterministic mission grading for now. User + mission map to one named persistent sandbox.</p>
      <div className="live-lab-actions"><button onClick={start} disabled={status==="starting"}>{status==="starting"?"Starting…":status==="ready"?"Resume":"Start session"}</button><button onClick={stop}>Stop</button></div>
      <div className="live-lab-terminal">{lines.map((line,i)=><div key={i}>{line || " "}</div>)}</div>
      <div className="live-lab-input"><span>$</span><input ref={inputRef} value={command} onChange={e=>setCommand(e.target.value)} onKeyDown={e=>e.key==="Enter"&&exec()} placeholder="run a shell command"/><button onClick={exec}>↵</button></div>
    </div>}
  </div>;
}
