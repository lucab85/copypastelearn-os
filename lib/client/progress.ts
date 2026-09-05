"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EngineState, EvidenceEvent, UserProgress } from "@/lib/engine/types";

const KEY = "cpl-os-progress-v3";
export const defaultProgress: UserProgress = {
  skillMastery: {}, completedMissions: [], missionStates: {},
  entitlements: ["mission:linux-service-recovery", "mission:docker-production", "mission:k8s-recovery", "mission:terraform-drift", "labs:interactive"],
};

function mergeProgress(local: UserProgress, cloud?: UserProgress | null, cloudEntitlements: string[] = []): UserProgress {
  if (!cloud) return { ...local, entitlements: Array.from(new Set([...local.entitlements, ...cloudEntitlements])) };
  return {
    skillMastery: { ...local.skillMastery, ...cloud.skillMastery },
    completedMissions: Array.from(new Set([...local.completedMissions, ...cloud.completedMissions])),
    missionStates: { ...local.missionStates, ...cloud.missionStates },
    entitlements: Array.from(new Set([...local.entitlements, ...cloud.entitlements, ...cloudEntitlements])),
  };
}

export function useProgress() {
  const [progress, setProgress] = useState<UserProgress>(defaultProgress);
  const [hydrated, setHydrated] = useState(false);
  const [syncState, setSyncState] = useState<"local"|"syncing"|"synced">("local");
  const firstSync = useRef(true);

  useEffect(() => {
    let local = defaultProgress;
    try { const raw = localStorage.getItem(KEY); if (raw) local = mergeProgress(defaultProgress, JSON.parse(raw)); } catch {}
    setProgress(local); setHydrated(true);
    fetch("/api/progress").then(r => r.ok ? r.json() : null).then(data => {
      if (data?.progress || data?.entitlements?.length) setProgress(prev => mergeProgress(prev, data.progress, data.entitlements));
      if (data?.persistence) setSyncState("synced");
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify(progress));
    if (firstSync.current) { firstSync.current = false; return; }
    const timer = window.setTimeout(() => {
      setSyncState("syncing");
      fetch("/api/progress", { method:"PUT", headers:{"content-type":"application/json"}, body:JSON.stringify(progress) })
        .then(r => r.ok ? r.json() : null).then(data => setSyncState(data?.persisted ? "synced" : "local")).catch(() => setSyncState("local"));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [progress, hydrated]);

  const saveMissionState = useCallback((state: EngineState, mastery: Record<string, number>) => setProgress(prev => ({ ...prev, skillMastery:{...prev.skillMastery,...mastery}, missionStates:{...prev.missionStates,[state.missionId]:state} })), []);
  const completeMission = useCallback((missionId: string, state: EngineState, mastery: Record<string, number>) => setProgress(prev => ({ ...prev, skillMastery:{...prev.skillMastery,...mastery}, missionStates:{...prev.missionStates,[missionId]:state}, completedMissions:Array.from(new Set([...prev.completedMissions,missionId])) })), []);
  const reset = useCallback(() => { setProgress(defaultProgress); try { localStorage.removeItem(KEY); } catch {} }, []);
  const unlock = useCallback((key: string) => setProgress(prev => ({...prev,entitlements:Array.from(new Set([...prev.entitlements,key]))})), []);
  const addEvidence = useCallback((state: EngineState, event: EvidenceEvent) => ({...state,evidence:[event,...state.evidence].slice(0,40)}), []);
  return { progress, hydrated, syncState, saveMissionState, completeMission, reset, unlock, addEvidence };
}
