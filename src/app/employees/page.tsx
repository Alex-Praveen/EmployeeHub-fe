"use client";
import { apiRequest } from "@/data/apiRequest";
import PageHeader from "@/components/actions/PageHeader";
import { useEffect, useState, type FormEvent } from "react";
import IconAction from "@/components/actions/IconAction";
import StatusBadge from "@/components/records/StatusBadge";
import { choices } from "../workspace";
import { listDepartments, type Department } from "../departments/api";
import styles from "./page.module.css";

type Employee = {
  employeeId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dob: string | null;
  hireDate: string;
  employmentStatus: string;
  departmentId: number;
  departmentName: string;
  jobTitleId: number;
  jobTitleName: string;
  managerId: number | null;
  managerName: string | null;
};
type Editor =
  | { action: "create" }
  | { action: "update" | "terminate"; employee: Employee };
const nameOf = (person: Employee) => person.firstName + " " + person.lastName;

async function request(action: string, body: object, signal?: AbortSignal) {
  const response = await apiRequest("/api/employees/" + action, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
    cache: "no-store",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.message ||
        error?.detail ||
        "Employee request failed (" + response.status + ").",
    );
  }
  return response.json();
}

export default function Employees() {
  const [people, setPeople] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [attempt, retry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    request("search", {}, controller.signal)
      .then((rows: Employee[]) => {
        if (!controller.signal.aborted) setPeople(rows);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    listDepartments(controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) setDepartments(rows);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [attempt]);

  const selected = editor && "employee" in editor ? editor.employee : undefined;
  const titles = new Map(
    people.map((person) => [person.jobTitleId, person.jobTitleName]),
  );
  const units = new Map(
    people.map((person) => [person.departmentId, person.departmentName]),
  );
  departments.forEach((unit) => units.set(unit.departmentId, unit.departmentName));
  const visible = people.filter(
    (person) =>
      (!status || person.employmentStatus === status) &&
      [nameOf(person), person.departmentName, person.jobTitleName, person.email]
        .join(" ")
        .toLowerCase()
        .includes(filter.trim().toLowerCase()),
  );
  function open(next: Editor | null) {
    setEditor(next);
    setError("");
    setNotice("");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || busy) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const body =
      editor.action === "terminate"
        ? { employeeId: editor.employee.employeeId }
        : {
            ...data,
            firstName: String(data.firstName).trim(),
            lastName: String(data.lastName).trim(),
            departmentId: Number(data.departmentId),
            jobTitleId: Number(data.jobTitleId),
            managerId: data.managerId ? Number(data.managerId) : null,
            dob: data.dob || null,
            ...(selected ? { employeeId: selected.employeeId } : {}),
          };
    setBusy(true);
    setError("");
    try {
      const saved: Employee = await request(editor.action, body);
      setPeople((rows) =>
        rows.some((row) => row.employeeId === saved.employeeId)
          ? rows.map((row) => (row.employeeId === saved.employeeId ? saved : row))
          : [...rows, saved],
      );
      setNotice(
        nameOf(saved) + (editor.action === "terminate" ? " terminated." : " saved."),
      );
      setEditor(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save employee.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.page}>
      <PageHeader title="Employees" subtitle="People directory">
        <IconAction
          icon="add"
          label="New employee"
          disabled={busy || loading}
          onClick={() => open({ action: "create" })}
        />
      </PageHeader>
      {error && (
        <p role="alert">
          {error}{" "}
          {!editor && (
            <IconAction
              icon="reset"
              label="Retry"
              onClick={() => {
                setError("");
                setLoading(true);
                retry(attempt + 1);
              }}
            />
          )}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {editor && (
        <form
          key={editor.action + (selected?.employeeId ?? "")}
          onSubmit={submit}
          className={styles.form}
        >
          <h2>
            {editor.action === "create"
              ? "New employee"
              : (editor.action === "terminate" ? "Terminate " : "Edit ") +
                nameOf(selected!)}
          </h2>
          {editor.action === "terminate" ? (
            <p>This will mark the employee as terminated.</p>
          ) : (
            <>
              {(
                ["firstName", "lastName", "email", "phone", "dob", "hireDate"] as const
              ).map((field, index) => (
                <label key={field}>
                  {
                    [
                      "First name",
                      "Last name",
                      "Email",
                      "Phone",
                      "Date of birth",
                      "Hire date",
                    ][index]
                  }
                  <input
                    name={field}
                    type={["text", "text", "email", "tel", "date", "date"][index]}
                    defaultValue={selected?.[field] ?? ""}
                    maxLength={[80, 80, 150, 25][index]}
                    required={["firstName", "lastName", "email", "hireDate"].includes(
                      field,
                    )}
                  />
                </label>
              ))}
              <label>
                Status
                <select
                  name="employmentStatus"
                  defaultValue={selected?.employmentStatus ?? "ACTIVE"}
                >
                  {choices.employmentStatus.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Department
                <select
                  required
                  name="departmentId"
                  defaultValue={selected?.departmentId ?? ""}
                >
                  <option value="">Select department</option>
                  {Array.from(units, ([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Job title
                <select
                  required
                  name="jobTitleId"
                  defaultValue={selected?.jobTitleId ?? ""}
                >
                  <option value="">Select job title</option>
                  {Array.from(titles, ([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Manager
                <select name="managerId" defaultValue={selected?.managerId ?? ""}>
                  <option value="">No manager</option>
                  {people
                    .filter((p) => p.employeeId !== selected?.employeeId)
                    .map((p) => (
                      <option key={p.employeeId} value={p.employeeId}>
                        {nameOf(p)}
                      </option>
                    ))}
                </select>
              </label>
            </>
          )}
          <div>
            <IconAction
              icon={editor.action === "terminate" ? "terminate" : "save"}
              label={
                editor.action === "terminate" ? "Confirm termination" : "Save employee"
              }
              type="submit"
              disabled={busy}
            />{" "}
            <IconAction
              icon="back"
              label="Cancel"
              type="button"
              disabled={busy}
              onClick={() => open(null)}
            />
          </div>
        </form>
      )}
      <div className={styles.filters}>
        <input
          type="search"
          aria-label="Search employees"
          placeholder="Search name, role, department or email"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <select
          aria-label="Employment status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {choices.employmentStatus.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <p role="status">Loading employees…</p>
      ) : !visible.length ? (
        <p>No matching employees.</p>
      ) : (
        <div className={styles.grid}>
          {visible.map((person) => (
            <article key={person.employeeId}>
              <StatusBadge value={person.employmentStatus} />
              <h2>{nameOf(person)}</h2>
              <p>
                {person.jobTitleName} · {person.departmentName}
              </p>
              <a href={"mailto:" + person.email}>{person.email}</a>
              <footer>
                <IconAction
                  icon="edit"
                  label={`Edit ${nameOf(person)}`}
                  disabled={busy}
                  onClick={() => open({ action: "update", employee: person })}
                />
                {person.employmentStatus !== "TERMINATED" && (
                  <IconAction
                    icon="terminate"
                    label={`Terminate ${nameOf(person)}`}
                    disabled={busy}
                    onClick={() => open({ action: "terminate", employee: person })}
                  />
                )}
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
