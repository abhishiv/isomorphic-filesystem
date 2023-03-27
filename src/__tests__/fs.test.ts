import { assert, expect, test } from "vitest";
import { promisify } from "util";
import { FS } from "../index";
import { InMemoryAdapter } from "../adapters/memory";
test("FS", () => {
  const adapter = new InMemoryAdapter();
  const fs = new FS(adapter);
  fs.mkdirSync("/");
  console.log(fs);
  const b = fs.writeFileSync("/d", "dsf");
  const b2 = fs.readFileSync("/d", { encoding: "utf8" });
  console.log(b2);
  expect(1).toBeDefined();
});
