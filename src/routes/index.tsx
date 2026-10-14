import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { startCall, type ServiceType } from "@/lib/gnaniService";
import { addJob, updateJob, useJobs } from "@/lib/jobs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bhasha Buddy — We call and talk for you" },
      { name: "description", content: "An AI voice agent that calls brokers, cooks and helpers in the local language on your behalf." },
      { property: "og:title", content: "Bhasha Buddy — We call and talk for you" },
      { property: "og:description", content: "Tell us what you need. Our AI agent calls locals in their language and brings back the best match." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InputZone,
});

const CHIPS: { label: string; type: ServiceType; example: string }[] = [
  { label: "Find a flat", type: "flat", example: "2BHK flat near HSR Layout, budget 25000, move in next month" },
  { label: "Hire a cook", type: "cook", example: "Vegetarian cook for 2 people, mornings, budget 7000 per month" },
  { label: "Find a maid", type: "maid", example: "Daily house help for cleaning and dishes in the morning, budget 5000" },
  { label: "Find a plumber", type: "plumber", example: "Plumber to fix a leaking kitchen tap today" },
];

function InputZone() {
  const navigate = useNavigate();
  const jobs = useJobs();
  const active = jobs.filter((j) => j.status === "calling" || j.status === "call_completed");
  const [service, setService] = useState<ServiceType | null>(null);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [audio, setAudio] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [sending, setSending] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  async function toggleRecord() {
    if (recording) {
      recRef.current?.stop();
      setRecording(false);
      return;
    }
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        setAudio(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })));
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      recRef.current = rec;
      setSeconds(0);
      setRecording(true);
    } catch {
      setMicError("Microphone access was blocked. You can type your requirement instead.");
    }
  }

  const canSend = (text.trim() || audio) && !recording && !sending;

  async function send() {
    if (!canSend) return;
    setSending(true);
    const requirement = text.trim() || CHIPS.find((c) => c.type === service)?.example || "Voice requirement";
    const serviceType: ServiceType = service ?? guessService(requirement);
    const id = crypto.randomUUID();
    addJob({ id, serviceType, requirement, audio, status: "calling", createdAt: Date.now(), callLog: [], results: null });
    const callId = await startCall({ serviceType, requirement, audio });
    updateJob(id, { callId });
    navigate({ to: "/call/$jobId", params: { jobId: id } });
  }

  return (
    <Shell step={0}>
      {active.map((j) => (
        <Link
          key={j.id}
          to="/call/$jobId"
          params={{ jobId: j.id }}
          className="mb-4 flex items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-soft"
        >
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary-foreground" />
          </span>
          <span className="flex-1 text-sm font-semibold">
            {j.status === "calling" ? "Call in progress" : "Analysing calls"} · <span className="font-normal opacity-90">{j.requirement.slice(0, 32)}…</span>
          </span>
          <span>→</span>
        </Link>
      ))}

      <h1 className="font-display text-3xl font-bold leading-tight text-foreground">
        Tell us what you need.
        <br />
        <span className="text-primary">We'll call and talk for you.</span>
      </h1>

      <div className="my-8 flex flex-col items-center">
        <button
          onClick={toggleRecord}
          aria-label={recording ? "Stop recording" : "Start recording"}
          className={`relative grid h-32 w-32 place-items-center rounded-full text-primary-foreground shadow-glow transition-transform active:scale-95 ${
            recording ? "bg-destructive" : "bg-gradient-primary"
          }`}
        >
          {recording && (
            <>
              <span className="absolute inset-0 animate-ping rounded-full bg-destructive/40" />
              <span className="absolute -inset-3 animate-pulse rounded-full border-4 border-destructive/30" />
            </>
          )}
          {recording ? (
            <span className="relative h-9 w-9 rounded-lg bg-primary-foreground" />
          ) : (
            <svg className="relative h-12 w-12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a1 1 0 1 1 2 0 7 7 0 0 1-6 6.93V21h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3v-2.07A7 7 0 0 1 5 12a1 1 0 1 1 2 0 5 5 0 0 0 10 0Z" />
            </svg>
          )}
        </button>
        <p className="mt-4 text-base font-medium text-muted-foreground">
          {recording ? `Recording… 0:${String(seconds).padStart(2, "0")} · tap to stop` : audio ? "Recorded! Play it back below" : "Tap to speak in any language"}
        </p>
        {audio && !recording && <audio src={audio} controls className="mt-3 w-full" />}
        {micError && <p className="mt-2 text-center text-sm text-destructive">{micError}</p>}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button
            key={c.type}
            onClick={() => {
              setService(c.type);
              setText(c.example);
            }}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              service === c.type ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="or type your requirement"
        rows={3}
        className="w-full resize-none rounded-2xl border border-border bg-card p-4 text-base text-foreground shadow-soft outline-none placeholder:text-muted-foreground focus:border-primary"
      />

      <button
        onClick={send}
        disabled={!canSend}
        className="mt-5 w-full rounded-2xl bg-gradient-primary py-4 font-display text-lg font-bold text-primary-foreground shadow-glow transition-opacity disabled:opacity-40"
      >
        {sending ? "Sending…" : "Send to AI agent"}
      </button>
    </Shell>
  );
}

function guessService(t: string): ServiceType {
  const s = t.toLowerCase();
  if (/cook|food|kitchen meal/.test(s)) return "cook";
  if (/maid|clean|help/.test(s)) return "maid";
  if (/plumb|tap|leak|pipe/.test(s)) return "plumber";
  return "flat";
}
