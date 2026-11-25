import { QueryClient, hashKey, isCancelledError } from "@tanstack/query-core";

export const readPolicy = { staleTime: 30_000, gcTime: 120_000, retry: false } as const;

const client = new QueryClient({
  defaultOptions: {
    queries: { ...readPolicy, refetchOnWindowFocus: false, refetchOnReconnect: false },
    mutations: { retry: false },
  },
});
const pendingWrites = new Set<string>();
let session = 0;

// Call at the authentication boundary if sign-in or account switching is introduced.
export function clearApiCache() {
  session++;
  client.clear();
}

function requestKey(path: string, init: RequestInit) {
  const url = new URL(path, "http://employeehub.local");
  url.searchParams.sort();
  const [, , resource, ...segments] = url.pathname.split("/");
  return [
    resource,
    segments.join("/"),
    init.method?.toUpperCase() ?? "GET",
    url.search,
    init.body ? JSON.parse(String(init.body)) : null,
  ] as const;
}

function affectedResources(resource: string, action: string) {
  if (resource === "departments" && action === "transfer")
    return ["departments", "employees", "leave-requests"];
  if (resource === "leave-requests" && action === "update-status")
    return [resource, "attendance"];
  if (resource === "projects") return [resource, "employees"];
  // Several response DTOs embed employee names, contact info and job titles.
  if (resource === "employees" && action !== "create")
    return [
      resource,
      "departments",
      "attendance",
      "projects",
      "leave-requests",
      "salaries",
      "performance-reviews",
    ];
  return [resource];
}

type Snapshot = { text: string; status: number; contentType: string };
class ReadFailure extends Error {
  readonly snapshot: Snapshot;
  constructor(snapshot: Snapshot) {
    super("API request failed (" + snapshot.status + ")");
    this.snapshot = snapshot;
  }
}
function responseFrom(snapshot: Snapshot) {
  return new Response(snapshot.text, {
    status: snapshot.status,
    headers: { "Content-Type": snapshot.contentType },
  });
}

export async function apiRequest(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const key = requestKey(path, init);
  const [resource, action, method] = key;
  const epoch = session;
  const read =
    method === "GET" ||
    (method === "POST" && (action === "search" || action.startsWith("search/")));
  if (!read) {
    const lock = hashKey([epoch, ...key]);
    if (pendingWrites.has(lock))
      throw new Error("This change is already being submitted.");
    pendingWrites.add(lock);
    try {
      const response = await fetch(path, init);
      if (response.ok && epoch === session) {
        const affected = affectedResources(resource, action);
        const filters = {
          predicate: (query: { queryKey: readonly unknown[] }) =>
            affected.includes(String(query.queryKey[0])),
        };
        // Mark stale synchronously, then cancel older reads so they cannot refill the cache.
        void client.invalidateQueries({ ...filters, refetchType: "none" });
        await client.cancelQueries(filters, { revert: false });
      }
      return response;
    } finally {
      pendingWrites.delete(lock);
    }
  }

  // Consumers can detach independently. A Strict Mode cleanup must not abort
  // a transport that its replay (or another component) is about to reuse.
  for (;;) {
    init.signal?.throwIfAborted();
    if (epoch !== session) throw new DOMException("Session changed", "AbortError");
    try {
      const snapshot = await client.fetchQuery({
        queryKey: key,
        queryFn: async ({ signal }): Promise<Snapshot> => {
          const response = await fetch(path, { ...init, signal, cache: "no-store" });
          const snapshot = {
            text: await response.text(),
            status: response.status,
            contentType: response.headers.get("content-type") ?? "application/json",
          };
          if (!response.ok) throw new ReadFailure(snapshot);
          return snapshot;
        },
      });
      init.signal?.throwIfAborted();
      if (epoch !== session) throw new DOMException("Session changed", "AbortError");
      return responseFrom(snapshot);
    } catch (error) {
      init.signal?.throwIfAborted();
      if (isCancelledError(error) && epoch === session) continue;
      if (error instanceof ReadFailure) return responseFrom(error.snapshot);
      throw error;
    }
  }
}
