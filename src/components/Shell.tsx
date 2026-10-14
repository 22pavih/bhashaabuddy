import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const STEPS = ["Request", "Calling", "Results"];

export function Shell({ step, children }: { step: 0 | 1 | 2; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-app">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10 pt-5">
        <header className="mb-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary font-display text-lg font-bold text-primary-foreground">
              ಅ
            </span>
            <span className="font-display text-lg font-bold text-foreground">Bhasha Buddy</span>
          </Link>
        </header>
        <ol className="mb-6 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors ${
                  i < step
                    ? "bg-success text-success-foreground"
                    : i === step
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </span>
              <span className={`text-sm font-semibold ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
              {i < 2 && <span className={`h-0.5 flex-1 rounded ${i < step ? "bg-success" : "bg-border"}`} />}
            </li>
          ))}
        </ol>
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
