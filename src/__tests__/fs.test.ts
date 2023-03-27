import { assert, expect, test } from "vitest";
import { FS } from "../index";
import { InMemoryAdapter } from "../adapters/memory";
test("FS", () => {
  const adapter = new InMemoryAdapter();
  const fs = new FS(adapter);
  console.log(fs);
  expect(1).toBeDefined();
});
