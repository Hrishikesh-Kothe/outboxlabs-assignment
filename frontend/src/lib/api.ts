const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (response.status === 401) {
    throw new Error("Unauthorized");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Request failed");
  }
  return response.json() as Promise<T>;
}

export type Me = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  slackConnected: boolean;
  slackTeamName: string | null;
};

export type EmailListItem = {
  id: string;
  recipient: string;
  subject: string;
  snippet: string;
  status: string;
  scheduledAt: string;
  sentAt: string | null;
  from: string;
};

export type EmailDetail = EmailListItem & {
  body: string;
  error: string | null;
};

export type Sender = {
  id: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
};

export function googleLoginUrl(): string {
  return `${API_URL}/auth/google`;
}

export function logoutUrl(): string {
  return `${API_URL}/auth/logout`;
}

export function slackConnectUrl(): string {
  return `${API_URL}/auth/slack`;
}

export async function getMe(): Promise<Me | null> {
  const response = await fetch(`${API_URL}/api/me`, { credentials: "include" });
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error("Failed to load session");
  }
  return response.json() as Promise<Me>;
}

export async function disconnectSlack(): Promise<void> {
  await request("/api/slack", { method: "DELETE" });
}

export function listEmails(status: "scheduled" | "sent", q = "") {
  const params = new URLSearchParams({ status });
  if (q.trim()) {
    params.set("q", q.trim());
  }
  return request<EmailListItem[]>(`/api/emails?${params.toString()}`);
}

export function getEmail(id: string) {
  return request<EmailDetail>(`/api/emails/${id}`);
}

export function getCounts() {
  return request<{ scheduled: number; sent: number }>("/api/emails/counts");
}

export function listSenders() {
  return request<Sender[]>("/api/senders");
}

export function createSender() {
  return request<Sender>("/api/senders", { method: "POST" });
}

export function createCampaign(body: {
  senderId: string;
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayMs: number;
  hourlyLimit: number;
}) {
  return request<{ count: number }>("/api/campaigns", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
