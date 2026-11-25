import IconAction from "@/components/actions/IconAction";
import { useEffect, useState, type FormEvent } from "react";
import { employeeName, type Member } from "@/components/team/EmployeeProfile";
import {
  DepartmentRequestError,
  listDepartments,
  postDepartment,
  type Department,
} from "./api";
import styles from "./page.module.css";

export default function TransferForm({
  members,
  source,
  onTransferred,
}: {
  members: Member[];
  source: string;
  onTransferred: (employee: number, message: string) => void;
}) {
  const [targets, setTargets] = useState<Department[]>([]);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState<{ heading: string; reason: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    listDepartments(controller.signal)
      .then((rows) => {
        if (controller.signal.aborted) return;
        const available = rows.filter((row) => String(row.departmentId) !== source);
        setTargets(available);
        if (!available.length) setMessage("There are no other departments.");
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setMessage("Could not load destinations. Close and reopen this form to retry.");
      });
    return () => controller.abort();
  }, [source]);

  async function transfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const employeeId = Number(data.get("employee"));
    const departmentId = Number(data.get("destination"));
    const member = members.find((person) => person.employeeId === employeeId);
    const target = targets.find((dept) => dept.departmentId === departmentId);
    if (!member || !target) return;
    setFailure(null);
    setBusy(true);
    setMessage("");
    try {
      await postDepartment("transfer", { employeeId, departmentId });
      onTransferred(
        employeeId,
        employeeName(member) + " transferred to " + target.departmentName + ".",
      );
    } catch (error) {
      const conflict = error instanceof DepartmentRequestError && error.status === 409;
      setFailure({
        heading: conflict ? "Transfer blocked" : "Transfer failed",
        reason: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className={styles.form} onSubmit={transfer} onChange={() => setFailure(null)}>
      <label>
        Employee
        <select disabled={busy} name="employee" required defaultValue="">
          <option value="">Select employee</option>
          {members.map((member) => (
            <option key={member.employeeId} value={member.employeeId}>
              {employeeName(member)}
              {member.email && " — " + member.email}
            </option>
          ))}
        </select>
      </label>
      <label>
        Destination department
        <select disabled={busy} name="destination" required defaultValue="">
          <option value="">Select department</option>
          {targets.map((target) => (
            <option key={target.departmentId} value={target.departmentId}>
              {target.departmentName}
            </option>
          ))}
        </select>
      </label>
      <IconAction
        icon="transfer"
        label={busy ? "Transferring…" : "Confirm transfer"}
        type="submit"
        disabled={busy || !targets.length}
      />
      {failure && (
        <div role="alert" className={styles.transferError}>
          <strong>{failure.heading}</strong>
          <span>{failure.reason}</span>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </form>
  );
}
