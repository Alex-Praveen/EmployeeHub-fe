import IconAction from "@/components/actions/IconAction";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { choices } from "../workspace";
import { fullName, post, type Person, type Editor } from "./api";
import styles from "./page.module.css";

export default function LeaveEditor({
  editor,
  people,
  onClose,
  onSaved,
}: {
  editor: Editor;
  people: Person[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const record = editor.action === "create" ? undefined : editor.record;
  const [start, setStart] = useState(record?.startDate ?? "");
  const editing = editor.action === "create" || editor.action === "update";
  const title =
    editor.action === "create"
      ? "New leave request"
      : editor.action === "update"
        ? "Edit leave request"
        : editor.action === "delete"
          ? "Delete leave request"
          : {
              APPROVED: "Approve leave",
              REJECTED: "Reject leave",
              CANCELLED: "Cancel leave",
            }[editor.status];
  useEffect(() => {
    const node = dialog.current!;
    node.showModal();
    return () => node.close();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const body =
      editor.action === "create"
        ? { ...fields, employeeId: Number(fields.employeeId) }
        : {
            leaveRequestId: editor.record.leaveRequestId,
            ...(editor.action === "update"
              ? fields
              : editor.action === "update-status"
                ? { requestStatus: editor.status }
                : {}),
          };
    setError("");
    setBusy(true);
    try {
      await post(editor.action, body);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save request.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="leave-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <h2 id="leave-title">{title}</h2>
      {record && (
        <p>
          {fullName(record.employee)} · {record.startDate} – {record.endDate}
        </p>
      )}
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          {editor.action === "create" && (
            <label>
              Employee
              <select name="employeeId" required defaultValue="">
                <option value="">Select employee</option>
                {people
                  .filter((p) => p.employmentStatus !== "TERMINATED")
                  .map((p) => (
                    <option key={p.employeeId} value={p.employeeId}>
                      {fullName(p)} · {p.email}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {editing && (
            <>
              <label>
                Leave type
                <select name="leaveType" defaultValue={record?.leaveType ?? ""} required>
                  <option value="">Select leave type</option>
                  {choices.leaveType.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Start date
                <input
                  type="date"
                  name="startDate"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  required
                />
              </label>
              <label>
                End date
                <input
                  type="date"
                  name="endDate"
                  min={start}
                  defaultValue={record?.endDate}
                  required
                />
              </label>
              <label>
                Reason (optional)
                <textarea
                  name="reason"
                  maxLength={1000}
                  defaultValue={record?.reason ?? ""}
                />
              </label>
            </>
          )}
          {editor.action === "delete" && <p>This permanently removes the request.</p>}
          {error && <p role="alert">{error}</p>}
          <div className={styles.actions}>
            <IconAction icon="back" label="Back" onClick={onClose} />
            <IconAction
              type="submit"
              icon={
                editor.action === "delete"
                  ? "delete"
                  : editing
                    ? "save"
                    : editor.action === "update-status" && editor.status === "REJECTED"
                      ? "reject"
                      : editor.action === "update-status" && editor.status === "CANCELLED"
                        ? "cancel"
                        : "approve"
              }
              label={busy ? "Saving…" : editing ? "Save request" : title}
              showLabel
              className={styles.primary}
            />
          </div>
        </fieldset>
      </form>
    </dialog>
  );
}
