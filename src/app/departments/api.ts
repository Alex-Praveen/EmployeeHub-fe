export type Department = {
  departmentId: number;
  departmentName: string;
  location: string | null;
  createdAt: string;
};

export class DepartmentRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function postDepartment(
  action: "create" | "transfer" | "search",
  body: object,
  signal?: AbortSignal,
) {
  const response = await fetch("/api/departments/" + action, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    const details = await response.json().catch(() => null);
    const reason = [details?.message, details?.detail].find(
      (value) => typeof value === "string" && value.trim(),
    );
    throw new DepartmentRequestError(
      response.status,
      reason || "Department request failed (" + response.status + ").",
    );
  }
  return response;
}

export async function listDepartments(signal?: AbortSignal): Promise<Department[]> {
  const response = await postDepartment("search", {}, signal);
  return response.json();
}
