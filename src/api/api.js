// SSE client for the PartSelect Assistant backend.
//
// The backend streams Server-Sent Events from POST /api/chat. EventSource only
// supports GET, so we use fetch() + a ReadableStream reader and parse the
// `data: {...}` frames ourselves, invoking the handler callbacks as events arrive.

export const API_BASE =
  process.env.REACT_APP_API_BASE || "http://localhost:8000";

/**
 * Parse complete SSE frames out of a buffer. Returns the decoded events and the
 * trailing partial frame that should be kept for the next chunk. Pure + exported
 * so it can be unit-tested without a network stream.
 */
export function drainSSE(buffer) {
  const events = [];
  const frames = buffer.split("\n\n");
  const rest = frames.pop(); // trailing partial frame
  for (const frame of frames) {
    const line = frame.split("\n").find((l) => l.startsWith("data:"));
    if (!line) continue;
    const payload = line.slice(5).trim();
    if (!payload) continue;
    try {
      events.push(JSON.parse(payload));
    } catch {
      /* ignore malformed frame */
    }
  }
  return { events, rest };
}

/**
 * Stream a chat turn.
 * @param {Array<{role:string, content:string}>} messages  full conversation history
 * @param {{
 *   onText?: (delta:string)=>void,
 *   onToolStart?: (evt:{name:string,label:string})=>void,
 *   onCard?: (evt:object)=>void,      // products | compatibility | install_guide
 *   onDone?: ()=>void,
 *   onError?: (msg:string)=>void,
 * }} handlers
 */
export async function streamChat(messages, handlers = {}) {
  const { onText, onToolStart, onCard, onDone, onError } = handlers;
  let response;
  try {
    response = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
  } catch (e) {
    onError && onError(
      "Couldn't reach the assistant backend. Is it running on " + API_BASE + "?"
    );
    return;
  }

  if (!response.ok || !response.body) {
    onError && onError(`Backend error (${response.status}).`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const handle = (event) => {
    switch (event.type) {
      case "text":
        onText && onText(event.text);
        break;
      case "tool_start":
        onToolStart && onToolStart(event);
        break;
      case "products":
      case "compatibility":
      case "install_guide":
        onCard && onCard(event);
        break;
      case "done":
        onDone && onDone();
        break;
      case "error":
        onError && onError(event.message);
        break;
      default:
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
  onDone && onDone();
}

// Legacy single-shot helper kept so nothing else breaks if imported.
export const getAIMessage = async () => ({
  role: "assistant",
  content: "Please use streamChat() — the assistant now streams responses.",
});
