import { drainSSE } from "./api";

describe("drainSSE", () => {
  test("parses complete frames and keeps the trailing partial", () => {
    const buf =
      'data: {"type":"text","text":"Hi"}\n\n' +
      'data: {"type":"products","items":[]}\n\n' +
      'data: {"type":"don'; // partial frame
    const { events, rest } = drainSSE(buf);
    expect(events).toEqual([
      { type: "text", text: "Hi" },
      { type: "products", items: [] },
    ]);
    expect(rest).toBe('data: {"type":"don');
  });

  test("ignores the leading ': connected' comment and blank payloads", () => {
    const buf = ': connected\n\n' + 'data: {"type":"done"}\n\n';
    const { events } = drainSSE(buf);
    expect(events).toEqual([{ type: "done" }]);
  });

  test("skips malformed JSON without throwing", () => {
    const buf = "data: {bad json}\n\n" + 'data: {"type":"text","text":"ok"}\n\n';
    const { events } = drainSSE(buf);
    expect(events).toEqual([{ type: "text", text: "ok" }]);
  });

  test("returns no events when only a partial frame is present", () => {
    const { events, rest } = drainSSE('data: {"type":"te');
    expect(events).toEqual([]);
    expect(rest).toBe('data: {"type":"te');
  });
});
