import { assertEquals } from "@std/assert";
import { handler } from "./main.ts";

Deno.test("returns html on /", async () => {
  const res = await handler(new Request("http://localhost/"));
  assertEquals(res.headers.get("content-type"), "text/html");
  const body = await res.text();
  assertEquals(body.includes('id="item-list"'), true);
  assertEquals(body.includes('fetch("/api/items")'), true);
});

Deno.test("returns json on /api", async () => {
  const res = await handler(new Request("http://localhost/api"));
  const data = await res.json();
  assertEquals(data.message, "Hello, world!");
  assertEquals(typeof data.time, "string");
});

Deno.test("returns items on /api/items", async () => {
  const res = await handler(new Request("http://localhost/api/items"));
  const data = await res.json();
  assertEquals(data.length, 3);
  assertEquals(data[0].name, "Laptop");
  assertEquals(data[0].description, "MacBook Pro 14");
});