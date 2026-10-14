import { useEffect } from "react";
import { getCallResult, getCallStatus } from "@/lib/gnaniService";
import { getJobs, updateJob } from "@/lib/jobs";

const POLL_MS = 2000;
const ANALYSE_MS = 5000;

/** Background poller: advances every job through calling -> call_completed -> analysed. */
export function JobRunner() {
  useEffect(() => {
    let busy = false;
    const tick = async () => {
      if (busy) return;
      busy = true;
      try {
        for (const job of getJobs()) {
          if (job.status === "calling" && job.callId) {
            const s = await getCallStatus(job.callId);
            if (s.status === "ended") {
              updateJob(job.id, { live: s, callLog: s.events, status: "call_completed", completedAt: Date.now() });
            } else {
              updateJob(job.id, { live: s, callLog: s.events });
            }
          } else if (job.status === "call_completed" && job.callId) {
            if (Date.now() - (job.completedAt ?? 0) >= ANALYSE_MS) {
              const results = await getCallResult(job.callId, job.requirement);
              updateJob(job.id, { results, status: "analysed" });
            }
          }
        }
      } finally {
        busy = false;
      }
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => clearInterval(t);
  }, []);
  return null;
}
