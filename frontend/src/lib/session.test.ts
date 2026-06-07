import { getSessionId } from "./session";

test("returns a consistent session ID", () => {
  const id1 = getSessionId();
  const id2 = getSessionId();
  expect(id1).toBe(id2);
});

test("returns a non-empty string", () => {
  expect(getSessionId().length).toBeGreaterThan(0);
});
