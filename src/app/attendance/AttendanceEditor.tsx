import { useEffect, useRef, useState, type FormEvent } from "react";
import IconAction from "@/components/actions/IconAction";
import { statusLabel } from "@/components/records/StatusBadge";
import { choices } from "../workspace";
import ShiftSliders from "./ShiftSliders";
import { bulkAttendanceRows, standardShift, type Adjustment } from "./bulkAttendance";
import styles from "./page.module.css";

export type Entry = {
  attendanceId: number;
  attendanceDate: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  employee: {
    employeeId: number;
    firstName: string;
    lastName: string;
    jobTitle?: { titleName: string };
  };
};
export type Editor =
  | { action: "create" | "create-bulk" }
  | { action: "update" | "delete"; record: Entry };
type Person = Entry["employee"] & { employmentStatus: string; email: string };

export default function AttendanceEditor({
  editor,
  day,
  entries,
  onClose,
  onSaved,
}: {
  editor: Editor;
  day: string;
  entries: Entry[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [people, setPeople] = useState<Person[]>();
  const [lookupError, setLookupError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [statuses, setStatuses] = useState<Record<number, string>>({});
  const [adjustments, setAdjustments] = useState<Record<number, Adjustment>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const create = editor.action === "create" || editor.action === "create-bulk";
  const record = "record" in editor ? editor.record : undefined;
  const bulk = editor.action === "create-bulk";
  const title = {
    create: "Add attendance",
    "create-bulk": "Add group attendance",
    update: "Edit attendance",
    delete: "Delete attendance",
  }[editor.action];
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  useEffect(() => {
    if (!create) return;
    const controller = new AbortController();
    async function load() {
      const response = await fetch("/api/employees/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      const rows: Person[] = await response.json();
      if (!controller.signal.aborted) setPeople(rows);
    }
    load().catch(() => {
      if (!controller.signal.aborted) setLookupError(true);
    });
    return () => controller.abort();
  }, [create, retry]);
  const recorded = new Set(entries.map((row) => row.employee.employeeId));
  const available = people?.filter(
    (p) => p.employmentStatus !== "TERMINATED" && !recorded.has(p.employeeId),
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const times = {
      attendanceStatus: data.get("status"),
      checkIn: String(data.get("checkIn") || "") || null,
      checkOut: String(data.get("checkOut") || "") || null,
    };
    const ids = data.getAll("employee").map(Number);
    const rows = bulk
      ? bulkAttendanceRows(statuses, day, adjustments)
      : ids.map((employeeId) => ({ ...times, employeeId, attendanceDate: day }));
    if (create && !rows.length) {
      setError("Select at least one employee.");
      return;
    }
    if (
      times.checkOut &&
      (!times.checkIn ||
        times.checkOut.padEnd(8, ":00") <= times.checkIn.padEnd(8, ":00"))
    ) {
      setError("Check-out requires a check-in and must be later.");
      return;
    }

    const body = create
      ? bulk
        ? rows
        : rows[0]
      : {
          attendanceId: record!.attendanceId,
          ...(editor.action === "update" ? times : {}),
        };
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/attendance/" + editor.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(
          detail?.message ||
            detail?.detail ||
            "Attendance request failed (" + response.status + ").",
        );
      }
      onSaved(
        editor.action === "delete"
          ? "Attendance deleted."
          : bulk
            ? rows.length + " attendance records added."
            : "Attendance saved.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save attendance.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="attendance-action"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <h2 id="attendance-action">{title}</h2>
      <p>
        {day}
        {record && " · " + record.employee.firstName + " " + record.employee.lastName}
      </p>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          {create &&
            (lookupError ? (
              <p role="alert">
                Could not load employees.{" "}
                <IconAction
                  icon="reset"
                  label="Retry"
                  onClick={() => {
                    setLookupError(false);
                    setRetry((v) => v + 1);
                  }}
                />
              </p>
            ) : !available ? (
              <p role="status">Loading employees…</p>
            ) : !available.length ? (
              <p>No eligible employees remain for this date.</p>
            ) : bulk ? (
              <section>
                <p>
                  Choose a status for each employee. Working shifts default to 9:00 AM –
                  6:00 PM.
                </p>
                <div className={styles.bulkList}>
                  {available.map((p) => (
                    <div key={p.employeeId}>
                      <label>
                        <span>
                          {p.firstName} {p.lastName}
                          <small>{p.email}</small>
                        </span>
                        <select
                          value={statuses[p.employeeId] ?? ""}
                          onChange={(event) =>
                            setStatuses({
                              ...statuses,
                              [p.employeeId]: event.target.value,
                            })
                          }
                        >
                          <option value="">Skip</option>
                          {choices.status.map((status) => (
                            <option key={status} value={status}>
                              {statusLabel(status)}
                            </option>
                          ))}
                        </select>
                      </label>
                      {statuses[p.employeeId] && statuses[p.employeeId] !== "ABSENT" && (
                        <ShiftSliders
                          name={p.firstName + " " + p.lastName}
                          value={adjustments[p.employeeId] ?? standardShift}
                          onChange={(value) =>
                            setAdjustments((previous) => ({
                              ...previous,
                              [p.employeeId]: value,
                            }))
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
                <p role="status">
                  {choices.status
                    .map((status) => ({
                      status,
                      count: Object.values(statuses).filter((value) => value === status)
                        .length,
                    }))
                    .filter((item) => item.count)
                    .map((item) => item.count + " " + statusLabel(item.status))
                    .join(" · ") || "No employees selected"}
                </p>
              </section>
            ) : (
              <label>
                Employee
                <select required name="employee" defaultValue="">
                  <option value="">Select employee</option>
                  {available.map((p) => (
                    <option key={p.employeeId} value={p.employeeId}>
                      {p.firstName} {p.lastName} · {p.email}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          {editor.action === "delete" ? (
            <p>This permanently removes this daily attendance record.</p>
          ) : (
            <>
              {!bulk && (
                <label>
                  Status
                  <select name="status" defaultValue={record?.status ?? "PRESENT"}>
                    {choices.status.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(s)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {!bulk && (
                <>
                  {" "}
                  <label>
                    Check-in
                    <input
                      name="checkIn"
                      type="time"
                      step="any"
                      defaultValue={record?.checkIn ?? ""}
                    />
                  </label>
                  <label>
                    Check-out
                    <input
                      name="checkOut"
                      type="time"
                      step="any"
                      defaultValue={record?.checkOut ?? ""}
                    />
                  </label>
                </>
              )}
            </>
          )}
          {error && <p role="alert">{error}</p>}
          <div className={styles.actions}>
            <IconAction icon="back" label="Back" onClick={onClose} />
            <IconAction
              icon={editor.action === "delete" ? "delete" : "save"}
              label={
                busy
                  ? "Saving…"
                  : editor.action === "delete"
                    ? "Confirm deletion"
                    : "Save attendance"
              }
              showLabel
              type="submit"
              disabled={create && !available?.length}
            />
          </div>
        </fieldset>
      </form>
    </dialog>
  );
}
