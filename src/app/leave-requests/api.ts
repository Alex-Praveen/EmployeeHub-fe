import type { Row } from "@/components/records/RecordDialog";

export type Leave = Row & {
  leaveRequestId: number;
  employee: { firstName: string; lastName: string; employeeId: number };
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  requestStatus: string;
};
export type Action = "create" | "update" | "delete" | "update-status";
export type Editor =
  | { action: "create" }
  | { action: "update"; record: Leave }
  | { action: "delete"; record: Leave }
  | {
      action: "update-status";
      record: Leave;
      status: "APPROVED" | "REJECTED" | "CANCELLED";
    };
export type Person = {
  employeeId: number;
  firstName: string;
  lastName: string;
  email: string;
  employmentStatus: string;
};
export const fullName = (person: { firstName: string; lastName: string }) =>
  [person.firstName, person.lastName].join(" ");

export async function post(
  action: Action | "search",
  body: object,
  signal?: AbortSignal,
) {
  const response = await fetch("/api/leave-requests/" + action, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    const details = await response.json().catch(() => null);
    throw new Error(
      details?.message ||
        details?.detail ||
        "Leave request failed (" + response.status + ").",
    );
  }
  return response;
}
