import { getSessionId } from "./session";

// In development, Next.js rewrites /api/* to the FastAPI backend.
// In production, set NEXT_PUBLIC_API_BASE to the backend URL.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Session-Id": getSessionId(),
  };
}

// ---- SSE streaming ---- //

export interface SSEHandlers {
  onText?: (delta: string) => void;
  onToolStart?: (evt: { name: string; label: string }) => void;
  onCard?: (evt: Record<string, unknown>) => void;
  onDone?: () => void;
  onError?: (msg: string) => void;
}

function drainSSE(buffer: string): { events: Record<string, unknown>[]; rest: string } {
  const events: Record<string, unknown>[] = [];
  const frames = buffer.split("\n\n");
  const rest = frames.pop() || "";
  for (const frame of frames) {
    const line = frame.split("\n").find((l) => l.startsWith("data:"));
    if (!line) continue;
    const payload = line.slice(5).trim();
    if (!payload) continue;
    try {
      events.push(JSON.parse(payload));
    } catch {
      /* ignore */
    }
  }
  return { events, rest };
}

export interface ChatMessage {
  role: string;
  content: string;
  images?: { data: string; mediaType: string }[];
}

export async function streamChat(
  messages: ChatMessage[],
  handlers: SSEHandlers = {}
) {
  const { onText, onToolStart, onCard, onDone, onError } = handlers;
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ messages }),
    });
  } catch {
    onError?.("Couldn't reach the assistant backend.");
    return;
  }

  if (!response.ok || !response.body) {
    onError?.(`Backend error (${response.status}).`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const handle = (event: Record<string, unknown>) => {
    switch (event.type) {
      case "text":
        onText?.(event.text as string);
        break;
      case "tool_start":
        onToolStart?.(event as unknown as { name: string; label: string });
        break;
      case "products":
      case "compatibility":
      case "install_guide":
      case "cart_update":
      case "cart":
        onCard?.(event);
        break;
      case "done":
        onDone?.();
        break;
      case "error":
        onError?.(event.message as string);
        break;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = drainSSE(buffer);
    buffer = rest;
    events.forEach(handle);
  }
  onDone?.();
}

// ---- Cart API ---- //

export async function fetchCart() {
  const resp = await fetch(`${API_BASE}/api/cart`, { headers: headers() });
  return resp.ok ? resp.json() : { items: [], itemCount: 0 };
}

export async function addToCart(partNumber: string) {
  // Add to our local cart
  const resp = await fetch(`${API_BASE}/api/cart/add`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ partNumber }),
  });
  const localResult = resp.ok ? await resp.json() : null;

  // Also add to the real PartSelect cart (best-effort, non-blocking)
  addToPartSelectCart(partNumber);

  return localResult;
}

export async function addToPartSelectCart(partNumber: string) {
  try {
    const resp = await fetch(`${API_BASE}/api/cart/partselect`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ partNumber }),
    });
    return resp.ok ? resp.json() : null;
  } catch {
    return null;
  }
}

export async function removeFromCart(partNumber: string) {
  const resp = await fetch(`${API_BASE}/api/cart/remove`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ partNumber }),
  });
  return resp.ok ? resp.json() : null;
}
