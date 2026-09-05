"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const suggestions = ["Ship an app to Kubernetes", "Become production-ready with Docker", "Master Terraform without tutorials"];

export function GoalComposer() {
  const router = useRouter();
  const [goal, setGoal] = useState("Deploy a production-ready Kubernetes application");
  const launch = () => { const q = encodeURIComponent(goal.trim() || suggestions[0]); router.push(`/start?goal=${q}`); };
  return <div className="goal-wrap"><div className="goal-box"><span className="prompt-mark">›</span><input aria-label="Learning goal" value={goal} onChange={(e) => setGoal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && launch()} /><button onClick={launch}>Build my mission <span>↗</span></button></div><div className="goal-suggestions"><span>TRY</span>{suggestions.map((s) => <button key={s} onClick={() => setGoal(s)}>{s}</button>)}</div></div>;
}
