import { apiRequest } from "@/data/apiRequest";
import { typeOfField, type Operation } from "@/app/workspace";

export async function fetchRecords(
  operation: Operation,
  inputs: Record<string, string>,
  signal: AbortSignal,
) {
  const pairs = Object.entries(inputs).filter(([, v]) => v.trim());
  const path = operation.path.replace(/\{(\w+)\}/g, (_, k) =>
    encodeURIComponent(inputs[k].trim()),
  );
  const body = Object.fromEntries(
    pairs.map(([k, v]) => [k, typeOfField(k) === "number" ? Number(v) : v.trim()]),
  );
  const json = operation.method && !operation.query;
  const response = await apiRequest(
    "/api/" + path + (operation.query ? "?" + new URLSearchParams(pairs) : ""),
    {
      method: operation.method || "GET",
      headers: json ? { "Content-Type": "application/json" } : {},
      body: json ? JSON.stringify(body) : undefined,
      signal: signal,
      cache: "no-store",
    },
  );
  if (!response.ok)
    throw new Error(
      response.status === 404
        ? "Record not found."
        : `Request failed (HTTP ${response.status}). Check the filters and backend connection.`,
    );
  const result = await response.json();

  return Array.isArray(result) ? result : result ? [result] : [];
}
