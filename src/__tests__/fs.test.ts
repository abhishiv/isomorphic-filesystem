import { assert, expect, test } from "vitest";
import { promisify } from "util";
import { FS } from "../index";
import { InMemoryAdapter } from "../adapters/memory";

test("FS", () => {
  const adapter = new InMemoryAdapter();
  const fs = new FS(adapter);
  fs.mkdirSync("/");
  fs.mkdirSync("/folder");
  const list = fs.readdirSync("/");
  console.log(list);
  expect(list.length).toBe(1);
  const text = "dsf";
  const b = fs.writeFileSync("/d", text);
  const b2 = fs.readFileSync("/d", { encoding: "utf8" });
  expect(b2).toBe(text);
});
