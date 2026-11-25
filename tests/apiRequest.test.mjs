import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { apiRequest, clearApiCache } from "../src/data/apiRequest.ts";

const originalFetch = globalThis.fetch;
afterEach(() => {
  clearApiCache();
  globalThis.fetch = originalFetch;
});
const post = (path, body = {}, signal) =>
  apiRequest("/api/" + path, { method: "POST", body: JSON.stringify(body), signal });
const ok = () => Response.json({ ok: true });

test("replayed mounts, filtered searches and page keys", async () => {
  let calls = 0;
  const gate = Promise.withResolvers();
  globalThis.fetch = async () => {
    calls++;
    await gate.promise;
    return ok();
  };
  const consumer = new AbortController();
  const first = post("employees/search", { page: 1, term: "Ada" }, consumer.signal);
  consumer.abort();
  const replay = post("employees/search", { term: "Ada", page: 1 });
  const secondPage = post("employees/search", { term: "Ada", page: 2 });
  const otherFilter = post("employees/search", { term: "Sam", page: 1 });
  gate.resolve();
  await assert.rejects(first, { name: "AbortError" });
  for (const response of await Promise.all([replay, secondPage, otherFilter])) {
    assert.deepEqual(await response.json(), { ok: true });
  }
  await post("employees/search", { term: "Ada", page: 1 });
  assert.equal(calls, 3);
});

test("writes invalidate only affected resources and reject duplicate submissions", async () => {
  const calls = [];
  const gate = Promise.withResolvers();
  globalThis.fetch = async (path) => {
    calls.push(path);
    if (path.endsWith("/transfer")) await gate.promise;
    return ok();
  };
  const load = () =>
    Promise.all(["employees", "departments", "salaries"].map((r) => post(r + "/search")));
  await load();
  const first = post("departments/transfer", { employeeId: 7, departmentId: 1 });
  await assert.rejects(
    post("departments/transfer", { departmentId: 1, employeeId: 7 }),
    /already/,
  );
  gate.resolve();
  await first;
  await load();
  assert.equal(calls.length, 6);
  assert.equal(calls.filter((p) => p.endsWith("/salaries/search")).length, 1);
});

test("read failures allow explicit retry, failed writes preserve cache and backend error", async () => {
  let calls = 0;
  globalThis.fetch = async () =>
    ++calls === 2 ? ok() : Response.json({ message: "Conflict" }, { status: 409 });
  assert.equal((await post("departments/search")).status, 409);
  assert.equal((await post("departments/search")).status, 200);
  assert.deepEqual(await (await post("departments/create")).json(), {
    message: "Conflict",
  });
  await post("departments/search");
  assert.equal(calls, 3);
});

test("older reads cannot overwrite post-mutation or new session data", async () => {
  const gate = Promise.withResolvers();
  let calls = 0;
  globalThis.fetch = async () => (++calls === 1 ? gate.promise : ok());
  const old = post("departments/search");
  await post("departments/create");
  assert.deepEqual(await (await old).json(), { ok: true });
  gate.resolve(Response.json({ stale: true }));
  assert.deepEqual(await (await post("departments/search")).json(), { ok: true });
  clearApiCache();
  await post("departments/search");
  assert.equal(calls, 4);
});

for (const [action, affected, independent] of [
  ["departments/create", ["departments"], ["employees"]],
  ["attendance/update", ["attendance"], ["departments"]],
  ["attendance/delete", ["attendance"], ["employees"]],
  ["attendance/create-bulk", ["attendance"], ["departments"]],
  ["leave-requests/update-status", ["leave-requests", "attendance"], ["salaries"]],
  ["projects/assign", ["projects", "employees"], ["departments"]],
]) {
  test(action + " invalidates dependent reads after success", async () => {
    const calls = new Map();
    globalThis.fetch = async (path) => {
      calls.set(path, (calls.get(path) ?? 0) + 1);
      return ok();
    };
    const load = () =>
      Promise.all([...affected, ...independent].map((r) => post(r + "/search")));
    await load();
    await post(action);
    await load();
    for (const r of affected) assert.equal(calls.get("/api/" + r + "/search"), 2);
    for (const r of independent) assert.equal(calls.get("/api/" + r + "/search"), 1);
  });
}

test("fresh results expire on the next read after the freshness window", async (t) => {
  let calls = 0;
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  globalThis.fetch = async () => {
    calls++;
    return ok();
  };
  await post("departments/search");
  now += 29_999;
  await post("departments/search");
  assert.equal(calls, 1);
  now += 2;
  await post("departments/search");
  assert.equal(calls, 2);
});

test("clearing a session cancels its pending read", async () => {
  const gate = Promise.withResolvers();
  globalThis.fetch = async () => gate.promise;
  const previous = post("employees/search");
  clearApiCache();
  gate.resolve(ok());
  await assert.rejects(previous);
  globalThis.fetch = async () => Response.json({ current: true });
  assert.deepEqual(await (await post("employees/search")).json(), { current: true });
});
