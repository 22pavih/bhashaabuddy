import { useSyncExternalStore } from "react";
import type { CallResult, CallStatus, ServiceType } from "./gnaniService";

export type JobStatus = "draft" | "calling" | "call_completed" | "analysed";

export type Job = {
  id: string;
  serviceType: ServiceType;
  requirement: string;
  audio: string | null;
  status: JobStatus;
  createdAt: number;
  callId?: string;
  callLog: CallStatus["events"];
  live?: CallStatus;
  completedAt?: number;
  results: CallResult | null;
};

const KEY = "bhasha-buddy-jobs";
let jobs: Job[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    jobs = JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    jobs = [];
  }
}

function emit() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(jobs));
  listeners.forEach((l) => l());
}

export function getJobs() {
  load();
  return jobs;
}

export function addJob(job: Job) {
  load();
  jobs = [job, ...jobs];
  emit();
}

export function updateJob(id: string, patch: Partial<Job>) {
  load();
  jobs = jobs.map((j) => (j.id === id ? { ...j, ...patch } : j));
  emit();
}

const EMPTY: Job[] = [];
export function useJobs(): Job[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getJobs,
    () => EMPTY,
  );
}

export function useJob(id: string) {
  return useJobs().find((j) => j.id === id);
}
