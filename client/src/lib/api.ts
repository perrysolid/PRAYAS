import type { GovernmentOrder, Grievance, Meta, Photo, PublicGrievance, Session, SimilarGrievance, Stats, Triage } from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      credentials: "include",
      ...rest,
      headers: { Accept: "application/json", ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...rest.headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError(0, "NETWORK", "You appear to be offline. Check your connection, or call 1905 to register by phone.");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const e = body?.error ?? {};
    const fields = e.code === "VALIDATION_FAILED" && e.details && typeof e.details === "object" ? e.details : {};
    throw new ApiError(res.status, e.code ?? "UNKNOWN", e.message ?? "Something went wrong. Try again.", fields);
  }
  return body as T;
}

const post = <T>(path: string, json?: unknown) => request<T>(path, { method: "POST", json: json ?? {} });

export type AiStatus = { enabled: boolean; speech: boolean };
export type AssistantReply = { kind: "answer" | "complaint" | "track" | "emergency" | "refuse"; reply: string; route?: string };

export type Assist = { isGrievance: boolean; clearer: string; questions: { ask: string; options: string[] }[]; phrases: string[] };
export type WhatsAppMessage = { id: string; mobile: string; dir: "in" | "out"; text: string; at: string; grievanceId?: string; image?: string; status: "simulated" | "sent" | "failed" | "received" };

export const api = {
  waStatus: (signal?: AbortSignal) => request<{ mode: "cloud" | "simulated"; ai: boolean; demoMobiles: string[] }>("/whatsapp/status", { signal }),
  waThread: (mobile: string, signal?: AbortSignal) => request<WhatsAppMessage[]>(`/whatsapp/thread?${new URLSearchParams({ mobile })}`, { signal }),
  waSend: (mobile: string, text: string) => post<{ ok: true }>("/whatsapp/inbound", { mobile, text }),
  officerNote: (text: string, lang: "en" | "hi") => post<{ report: string }>("/officer/ai/note", { text, lang }),
  aiStatus: (signal?: AbortSignal) => request<AiStatus>("/ai/status", { signal }),
  draft: (text: string, lang: string) => post<{ isGrievance: boolean; subject: string; description: string }>("/ai/draft", { text, lang }),
  assist: (text: string, lang: string, signal?: AbortSignal) => request<Assist>("/ai/assist", { method: "POST", json: { text, lang }, signal }),
  assistant: (messages: { from: "me" | "bot"; text: string }[], lang: string) => post<AssistantReply>("/ai/assistant", { messages, lang }),
  translate: (strings: string[], lang: string) => post<{ items: string[] }>("/ai/translate", { strings, lang }),
  /** Natural speech as WAV audio. */
  speak: async (text: string, lang: string, signal?: AbortSignal) => {
    const res = await fetch("/api/ai/speak", { method: "POST", credentials: "include", signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang }) });
    if (!res.ok) throw new ApiError(res.status, "AI_UNAVAILABLE", "Speech is not available right now.");
    return res.blob();
  },

  meta: (signal?: AbortSignal) => request<Meta>("/meta", { signal }),
  stats: (signal?: AbortSignal) => request<Stats>("/stats", { signal }),
  orders: (params: { q?: string; kind?: string }, signal?: AbortSignal) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
    return request<GovernmentOrder[]>(`/orders?${qs}`, { signal });
  },
  contact: (data: { name: string; email: string; message: string }) => post<{ ok: true }>("/contact", data),

  me: (signal?: AbortSignal) => request<{ session: Session | null }>("/auth/me", { signal }),
  sendOtp: (mobile: string) => post<{ resendInSeconds: number; devOtp?: string }>("/auth/otp/send", { mobile }),
  verifyOtp: (mobile: string, otp: string) => post<{ session: Session }>("/auth/otp/verify", { mobile, otp }),
  officerLogin: (username: string, password: string) => post<{ session: Session }>("/auth/officer/login", { username, password }),
  logout: () => post<{ ok: true }>("/auth/logout"),

  triage: (text: string) => post<Triage>("/grievances/triage", { text }),
  createGrievance: (data: unknown) => post<Grievance>("/grievances", data),
  myGrievances: (signal?: AbortSignal) => request<Grievance[]>("/grievances", { signal }),
  grievance: (id: string, signal?: AbortSignal) => request<Grievance>(`/grievances/${encodeURIComponent(id)}`, { signal }),
  track: (id: string, mobile: string, signal?: AbortSignal) =>
    request<PublicGrievance>(`/grievances/track?${new URLSearchParams({ id, mobile })}`, { signal }),
  similar: (q: { departmentId: string; districtId: string; categoryId?: string; block?: string }, signal?: AbortSignal) =>
    request<SimilarGrievance[]>(`/grievances/similar?${new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][])}`, { signal }),
  support: (id: string) => post<{ id: string; supportCount: number; supported: true }>(`/grievances/${encodeURIComponent(id)}/support`),
  remind: (id: string) => post<Grievance>(`/grievances/${encodeURIComponent(id)}/reminder`),
  feedback: (id: string, rating: number, comment?: string) => post<Grievance>(`/grievances/${encodeURIComponent(id)}/feedback`, { rating, comment: comment || undefined }),
  reopen: (id: string, reason: string) => post<Grievance>(`/grievances/${encodeURIComponent(id)}/reopen`, { reason }),

  officerQueue: (status: string, signal?: AbortSignal) => request<Grievance[]>(`/officer/grievances?status=${status}`, { signal }),
  officerAct: (id: string, action: "note" | "resolve", note: string, photo?: Photo) =>
    post<Grievance>(`/officer/grievances/${encodeURIComponent(id)}/actions`, { action, note, photo }),
};
