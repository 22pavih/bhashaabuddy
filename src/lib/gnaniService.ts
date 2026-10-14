/**
 * gnaniService — the ONLY place that talks to the Gnani voice-agent platform.
 *
 * Everything here is currently a MOCK that simulates a real asynchronous
 * outbound call with timers (ringing -> connected -> ended). The app polls
 * getCallStatus() every few seconds and only calls getCallResult() once the
 * status is "ended", so a real API/webhook can replace these functions later
 * without touching the UI.
 *
 * REAL INTEGRATION (later):
 *  - API base URL:  const GNANI_API_URL = "https://api.gnani.ai/..."   // TODO
 *  - API key:       read from a server-side env var, e.g. process.env.GNANI_API_KEY
 *                   (call Gnani from a server function, never from the browser)
 *  - Webhook:       Gnani POSTs "call completed" to /api/public/gnani-webhook  // TODO
 *                   which should mark the job as ended and store the result.
 */

/** Speed multiplier for demo mode. 1 = realistic (~20-40s per call). 3 = 3x faster for screen recording. */
export const DEMO_SPEED = 1;

export type ServiceType = "flat" | "cook" | "maid" | "plumber" | "other";

export type CallEvent = {
  id: string;
  kind: "sent" | "ringing" | "connected" | "ended" | "all_done";
  label: string;
  contactIndex?: number;
  at: number; // ms offset from call start
};

export type TranscriptLine = {
  speaker: "agent" | "contact";
  name: string;
  text: string;
  lang: string;
  contactIndex: number;
};

export type ContactResult = {
  name: string;
  role: string;
  language: string;
  summary: string;
  details: { label: string; value: string }[];
  price: number;
  transcript: TranscriptLine[];
};

export type CallResult = {
  contacts: ContactResult[];
  bestIndex: number;
  bestReason: string;
  comparison: string[];
};

export type CallStatus = {
  status: "calling" | "ended";
  elapsedMs: number;
  activeContact: number;
  phase: "ringing" | "connected" | "between" | "done";
  phaseStartedAt: number;
  events: CallEvent[];
  transcript: TranscriptLine[];
  totalContacts: number;
};

type Contact = Omit<ContactResult, "transcript"> & {
  lines: { speaker: "agent" | "contact"; text: string }[];
};

const CONTACTS: Record<ServiceType, Contact[]> = {
  flat: [
    {
      name: "Ramesh",
      role: "Broker",
      language: "Kannada",
      price: 22000,
      summary:
        "Has a 2BHK in HSR Layout, semi-furnished, ready to move in from the 1st. Owner prefers families or working professionals.",
      details: [
        { label: "Rent", value: "₹22,000/mo" },
        { label: "Deposit", value: "₹1.1L" },
        { label: "Area", value: "HSR Layout" },
        { label: "Available", value: "1st of next month" },
      ],
      lines: [
        { speaker: "agent", text: "Namaskara! I'm calling for a client looking for a 2BHK flat to rent." },
        { speaker: "contact", text: "Yes, I have one in HSR Layout, Sector 2. Semi-furnished." },
        { speaker: "agent", text: "What is the monthly rent and deposit?" },
        { speaker: "contact", text: "Rent is 22,000, deposit is five months, around 1.1 lakh." },
        { speaker: "agent", text: "When can my client move in?" },
        { speaker: "contact", text: "From the 1st of next month. They can visit this weekend." },
      ],
    },
    {
      name: "Suresh",
      role: "Broker",
      language: "Kannada",
      price: 28000,
      summary:
        "Offers a fully furnished 2BHK in Koramangala with parking. Available immediately but rent is higher.",
      details: [
        { label: "Rent", value: "₹28,000/mo" },
        { label: "Deposit", value: "₹2.8L" },
        { label: "Area", value: "Koramangala" },
        { label: "Available", value: "Immediately" },
      ],
      lines: [
        { speaker: "agent", text: "Hello! My client needs a 2BHK flat. Do you have anything available?" },
        { speaker: "contact", text: "Fully furnished 2BHK in Koramangala 5th Block, with car parking." },
        { speaker: "agent", text: "What is the rent and deposit?" },
        { speaker: "contact", text: "28,000 per month, ten months deposit." },
        { speaker: "agent", text: "Is it available now?" },
        { speaker: "contact", text: "Yes, they can move in immediately." },
      ],
    },
  ],
  cook: [
    {
      name: "Lakshmi",
      role: "Cook",
      language: "Kannada",
      price: 6000,
      summary:
        "Cooks South and North Indian vegetarian food. Can come every morning for breakfast and lunch.",
      details: [
        { label: "Charge", value: "₹6,000/mo" },
        { label: "Timing", value: "7:00–9:00 AM" },
        { label: "Cuisine", value: "Veg, South & North" },
        { label: "Distance", value: "1.2 km away" },
      ],
      lines: [
        { speaker: "agent", text: "Namaskara! My client is looking for a cook for two people." },
        { speaker: "contact", text: "I cook vegetarian, both South and North Indian." },
        { speaker: "agent", text: "What timings work for you, and how much do you charge?" },
        { speaker: "contact", text: "Mornings 7 to 9. 6,000 a month for breakfast and lunch." },
        { speaker: "agent", text: "Can you start next week?" },
        { speaker: "contact", text: "Yes, from Monday. I live close by, just one kilometre." },
      ],
    },
    {
      name: "Manjula",
      role: "Cook",
      language: "Kannada",
      price: 8500,
      summary:
        "Cooks veg and non-veg. Available only in evenings for dinner, charges more for non-veg dishes.",
      details: [
        { label: "Charge", value: "₹8,500/mo" },
        { label: "Timing", value: "6:00–8:00 PM" },
        { label: "Cuisine", value: "Veg & non-veg" },
        { label: "Distance", value: "3.5 km away" },
      ],
      lines: [
        { speaker: "agent", text: "Hello! I'm calling about a cooking job for two people." },
        { speaker: "contact", text: "I make veg and non-veg. Only evenings, I'm busy in the mornings." },
        { speaker: "agent", text: "What would you charge?" },
        { speaker: "contact", text: "8,500 per month for dinner every day." },
        { speaker: "agent", text: "Thank you, I'll share this with my client." },
        { speaker: "contact", text: "Okay, call me back by Friday." },
      ],
    },
  ],
  maid: [
    {
      name: "Savitha",
      role: "House help",
      language: "Kannada",
      price: 4000,
      summary: "Can do sweeping, mopping and dishes every morning. Available from tomorrow.",
      details: [
        { label: "Charge", value: "₹4,000/mo" },
        { label: "Timing", value: "8:00–9:30 AM" },
        { label: "Work", value: "Cleaning, dishes" },
        { label: "Distance", value: "800 m away" },
      ],
      lines: [
        { speaker: "agent", text: "Namaskara! My client needs daily house help for a 2BHK." },
        { speaker: "contact", text: "I can do sweeping, mopping and dishes." },
        { speaker: "agent", text: "What time and how much?" },
        { speaker: "contact", text: "8 to 9:30 in the morning, 4,000 a month." },
        { speaker: "agent", text: "When can you start?" },
        { speaker: "contact", text: "From tomorrow itself." },
      ],
    },
    {
      name: "Gowramma",
      role: "House help",
      language: "Kannada",
      price: 5500,
      summary: "Does cleaning plus laundry. Works afternoons only, starting next week.",
      details: [
        { label: "Charge", value: "₹5,500/mo" },
        { label: "Timing", value: "2:00–4:00 PM" },
        { label: "Work", value: "Cleaning, laundry" },
        { label: "Distance", value: "2 km away" },
      ],
      lines: [
        { speaker: "agent", text: "Hello! Are you looking for house help work?" },
        { speaker: "contact", text: "Yes, I do cleaning and also washing clothes." },
        { speaker: "agent", text: "What are your timings and charges?" },
        { speaker: "contact", text: "Afternoons 2 to 4. 5,500 per month." },
        { speaker: "agent", text: "When can you begin?" },
        { speaker: "contact", text: "From next Monday." },
      ],
    },
  ],
  plumber: [
    {
      name: "Raju",
      role: "Plumber",
      language: "Kannada",
      price: 400,
      summary: "Can fix the leaking tap today evening. Charges a visit fee plus parts.",
      details: [
        { label: "Visit fee", value: "₹400" },
        { label: "Available", value: "Today, 6 PM" },
        { label: "Parts", value: "Extra, at cost" },
        { label: "Distance", value: "1.5 km away" },
      ],
      lines: [
        { speaker: "agent", text: "Namaskara! My client has a leaking kitchen tap. Can you come?" },
        { speaker: "contact", text: "Yes, I can come today evening around 6." },
        { speaker: "agent", text: "What will it cost?" },
        { speaker: "contact", text: "400 visit charge, parts extra if needed." },
        { speaker: "agent", text: "Great, I'll confirm the address." },
        { speaker: "contact", text: "Okay, send it on WhatsApp." },
      ],
    },
    {
      name: "Venkatesh",
      role: "Plumber",
      language: "Kannada",
      price: 300,
      summary: "Lower visit fee but only free tomorrow afternoon.",
      details: [
        { label: "Visit fee", value: "₹300" },
        { label: "Available", value: "Tomorrow, 2 PM" },
        { label: "Parts", value: "Extra, at cost" },
        { label: "Distance", value: "4 km away" },
      ],
      lines: [
        { speaker: "agent", text: "Hello! We need a plumber for a leaking tap." },
        { speaker: "contact", text: "I'm busy today. Tomorrow afternoon is possible." },
        { speaker: "agent", text: "How much do you charge?" },
        { speaker: "contact", text: "300 for the visit." },
        { speaker: "agent", text: "Thank you, I'll check with my client." },
        { speaker: "contact", text: "Okay, let me know." },
      ],
    },
  ],
  other: [],
};
CONTACTS.other = CONTACTS.flat;

// Timeline (ms, before DEMO_SPEED) for each contact
const RING_MS = 6000;
const LINE_MS = 4500;
const BETWEEN_MS = 3000;

function contactDuration(c: Contact) {
  return RING_MS + c.lines.length * LINE_MS;
}

function buildCallId(serviceType: ServiceType, start: number) {
  return `mock_${serviceType}_${start}`;
}
function parseCallId(callId: string) {
  const [, serviceType, start] = callId.split("_");
  return { serviceType: serviceType as ServiceType, start: Number(start) };
}

/** Starts the outbound call(s). MOCK: returns a callId that encodes the start time. */
export async function startCall(job: {
  serviceType: ServiceType;
  requirement: string;
  audio?: string | null;
}): Promise<string> {
  // REAL: POST `${GNANI_API_URL}/calls` with { requirement, audio, contacts }
  // and header Authorization: Bearer ${process.env.GNANI_API_KEY}
  await new Promise((r) => setTimeout(r, 400));
  return buildCallId(job.serviceType, Date.now());
}

/** Returns status, live transcript and call events. MOCK: derived from elapsed time. */
export async function getCallStatus(callId: string): Promise<CallStatus> {
  // REAL: GET `${GNANI_API_URL}/calls/${callId}`
  const { serviceType, start } = parseCallId(callId);
  const contacts = CONTACTS[serviceType];
  const elapsed = (Date.now() - start) * DEMO_SPEED;

  const events: CallEvent[] = [{ id: "sent", kind: "sent", label: "Requirement sent to AI agent", at: 0 }];
  const transcript: TranscriptLine[] = [];
  let t = 1500;
  let activeContact = 0;
  let phase: CallStatus["phase"] = "ringing";
  let phaseStartedAt = t;

  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i];
    if (elapsed < t) break;
    activeContact = i;
    events.push({ id: `ring${i}`, kind: "ringing", contactIndex: i, label: `Agent is calling ${c.name} (${c.role}) in ${c.language}`, at: t });
    phase = "ringing";
    phaseStartedAt = t;
    const connectAt = t + RING_MS;
    if (elapsed >= connectAt) {
      events.push({ id: `conn${i}`, kind: "connected", contactIndex: i, label: "Call connected, agent is speaking", at: connectAt });
      phase = "connected";
      phaseStartedAt = connectAt;
      c.lines.forEach((l, j) => {
        if (elapsed >= connectAt + j * LINE_MS + 800) {
          transcript.push({ ...l, name: l.speaker === "agent" ? "Agent" : c.name, lang: c.language, contactIndex: i });
        }
      });
    }
    const endAt = t + contactDuration(c);
    if (elapsed >= endAt) {
      const last = i === contacts.length - 1;
      events.push({
        id: `end${i}`,
        kind: "ended",
        contactIndex: i,
        label: last ? `Call with ${c.name} ended` : `Call with ${c.name} ended. Agent is calling the next contact`,
        at: endAt,
      });
      phase = "between";
      phaseStartedAt = endAt;
    }
    t = endAt + BETWEEN_MS;
  }

  const totalEnd = t - BETWEEN_MS;
  const ended = elapsed >= totalEnd;
  if (ended) {
    events.push({ id: "done", kind: "all_done", label: "All calls completed", at: totalEnd });
    phase = "done";
  }

  return {
    status: ended ? "ended" : "calling",
    elapsedMs: elapsed,
    activeContact,
    phase,
    phaseStartedAt,
    events,
    transcript,
    totalContacts: contacts.length,
  };
}

/** Returns final transcript + extracted details. Only call once status is "ended". */
export async function getCallResult(callId: string, requirement: string): Promise<CallResult> {
  // REAL: GET `${GNANI_API_URL}/calls/${callId}/result` (or read what the webhook stored)
  const { serviceType } = parseCallId(callId);
  const contacts: ContactResult[] = CONTACTS[serviceType].map((c, i) => ({
    name: c.name,
    role: c.role,
    language: c.language,
    summary: c.summary,
    details: c.details,
    price: c.price,
    transcript: c.lines.map((l) => ({ ...l, name: l.speaker === "agent" ? "Agent" : c.name, lang: c.language, contactIndex: i })),
  }));

  // Match against the user's requirement: budget + keywords
  const budgetMatch = requirement.replace(/,/g, "").match(/(\d{3,6})\s*(k)?/i);
  let budget: number | null = null;
  if (budgetMatch) budget = Number(budgetMatch[1]) * (budgetMatch[2] ? 1000 : 1);
  const req = requirement.toLowerCase();

  const scores = contacts.map((c) => {
    let s = 0;
    if (budget) s += c.price <= budget ? 3 : -((c.price - budget) / budget) * 5;
    const text = (c.summary + " " + c.details.map((d) => d.value).join(" ")).toLowerCase();
    req.split(/\W+/).filter((w) => w.length > 3).forEach((w) => {
      if (text.includes(w)) s += 1;
    });
    s -= c.price / 100000; // tie-break: cheaper
    return s;
  });
  const bestIndex = scores.indexOf(Math.max(...scores));
  const best = contacts[bestIndex];
  const other = contacts[1 - bestIndex];

  const priceLabel = best.details[0].label.toLowerCase();
  const bestReason = budget
    ? best.price <= budget
      ? `Fits your budget of ₹${budget.toLocaleString("en-IN")} and matches your timing.`
      : `Closest to your budget of ₹${budget.toLocaleString("en-IN")}.`
    : `Lower ${priceLabel} and a better fit for what you asked.`;

  const comparison = [
    budget
      ? `Budget (₹${budget.toLocaleString("en-IN")}): ${best.name} ${best.details[0].value} ${best.price <= budget ? "✓ within" : "✗ over"} · ${other.name} ${other.details[0].value} ${other.price <= budget ? "✓ within" : "✗ over"}`
      : `${best.details[0].label}: ${best.name} ${best.details[0].value} vs ${other.name} ${other.details[0].value}`,
    `${best.details[2].label}: ${best.name} — ${best.details[2].value} · ${other.name} — ${other.details[2].value}`,
    `${best.details[3].label}: ${best.name} — ${best.details[3].value} · ${other.name} — ${other.details[3].value}`,
  ];

  return { contacts, bestIndex, bestReason, comparison };
}
