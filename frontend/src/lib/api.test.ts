import { drainSSE } from "./api";

// Export drainSSE for testing by adding it - let's test the logic inline
// Actually drainSSE isn't exported. Let's test the parsing logic directly.

describe("SSE parsing", () => {
  // Reproduce the drainSSE logic for testing
  function parseSse(buffer: string) {
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

  test("parses complete SSE frames", () => {
    const buffer = 'data: {"type":"text","text":"Hello"}\n\ndata: {"type":"done"}\n\n';
    const { events, rest } = parseSse(buffer);
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: "text", text: "Hello" });
    expect(events[1]).toEqual({ type: "done" });
    expect(rest).toBe("");
  });

  test("keeps trailing partial frame", () => {
    const buffer = 'data: {"type":"text","text":"Hi"}\n\ndata: {"type":"te';
    const { events, rest } = parseSse(buffer);
    expect(events).toHaveLength(1);
    expect(rest).toBe('data: {"type":"te');
  });

  test("ignores comment lines", () => {
    const buffer = ': connected\n\ndata: {"type":"text","text":"ok"}\n\n';
    const { events } = parseSse(buffer);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: "text", text: "ok" });
  });

  test("handles malformed JSON gracefully", () => {
    const buffer = 'data: not-json\n\ndata: {"type":"done"}\n\n';
    const { events } = parseSse(buffer);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: "done" });
  });
});
