import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";
import app from "../app.js";

let server;
let origin;

before(async () => {
  server = app.listen(0);
  await once(server, "listening");
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("current-user endpoint rejects anonymous requests without caching", async () => {
  const response = await fetch(`${origin}/api/auth/me`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(body.success, false);
});

test("registration validates input before accessing the database", async () => {
  const response = await fetch(`${origin}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "",
      email: "not-an-email",
      password: "short",
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.message, "Invalid registration details");
  assert.equal(body.errors.length, 3);
});
