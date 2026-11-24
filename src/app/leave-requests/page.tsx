"use client";
import IconAction from "@/components/actions/IconAction";
import { useEffect, useState, type FormEvent } from "react";
import RecordDialog from "@/components/records/RecordDialog";
import StatusBadge, { statusLabel } from "@/components/records/StatusBadge";
import { listDepartments, type Department } from "../departments/api";
import { choices, label } from "../workspace";
import { fullName, post, type Leave, type Editor, type Person } from "./api";
import LeaveEditor from "./LeaveEditor";
import styles from "./page.module.css";

const ranges = ["startDate", "endDate", "requested"] as const;
export default function Page() {
  const [people, setPeople] = useState<Person[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [lookupError, setLookupError] = useState("");
  const [lookupAttempt, retryLookups] = useState(0);
  const [query, setQuery] = useState<Record<string, string | number>>({});
  const [result, setResult] = useState<{
    query: typeof query;
    rows: Leave[];
    error?: string;
  }>();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [details, setDetails] = useState<Leave | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    async function readPeople() {
      const r = await fetch("/api/employees/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        signal: controller.signal,
      });
      if (!r.ok) throw new Error();
      const rows: Person[] = await r.json();
      if (!controller.signal.aborted) setPeople(rows);
    }
    const units = listDepartments(controller.signal).then((rows) => {
      if (!controller.signal.aborted) setDepartments(rows);
    });
    Promise.all([readPeople(), units]).catch(() => {
      if (!controller.signal.aborted)
        setLookupError("Employee or department choices could not be loaded.");
    });
    return () => controller.abort();
  }, [lookupAttempt]);
  useEffect(() => {
    const controller = new AbortController();
    post("search", query, controller.signal)
      .then((r) => r.json())
      .then((rows: Leave[]) => {
        if (!controller.signal.aborted) setResult({ query, rows });
      })
      .catch((e) => {
        if (!controller.signal.aborted) setResult({ query, rows: [], error: e.message });
      });
    return () => controller.abort();
  }, [query]);
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    for (const prefix of ranges) {
      const from = String(data.get(prefix + "From") || ""),
        to = String(data.get(prefix + "To") || "");
      if (from && to && from > to) {
        setNotice(label(prefix) + " range ends before it starts.");
        return;
      }
    }
    setNotice("");
    setQuery(
      Object.fromEntries(
        Array.from(data)
          .filter(([, v]) => String(v).trim())
          .map(([k, v]) => [k, k.endsWith("Id") ? Number(v) : String(v).trim()]),
      ),
    );
  }
  const current = result?.query === query ? result : null;
  return (
    <section className={styles.page}>
      <header>
        <div>
          <h1>Leave requests</h1>
          <p>Review and manage employee leave.</p>
        </div>
        <IconAction
          icon="add"
          label="New request"
          showLabel
          disabled={!people.some((p) => p.employmentStatus !== "TERMINATED")}
          onClick={() => setEditor({ action: "create" })}
        />
      </header>
      {lookupError && (
        <p role="alert">
          {lookupError}{" "}
          <IconAction
            icon="reset"
            label="Retry"
            showLabel
            onClick={() => {
              setLookupError("");
              retryLookups((value) => value + 1);
            }}
          />
        </p>
      )}
      <details className={styles.filters}>
        <summary>Search leave requests</summary>
        <form
          onSubmit={search}
          onReset={() => {
            setNotice("");
            setQuery({});
          }}
        >
          <label>
            Employee
            <select name="employeeId">
              <option value="">All employees</option>
              {people.map((p) => (
                <option key={p.employeeId} value={p.employeeId}>
                  {fullName(p)} · {p.email}
                </option>
              ))}
            </select>
          </label>
          <label>
            Department
            <select name="departmentId">
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.departmentId} value={d.departmentId}>
                  {d.departmentName}
                </option>
              ))}
            </select>
          </label>
          {["firstName", "lastName"].map((key) => (
            <label key={key}>
              {label(key)}
              <input name={key} />
            </label>
          ))}
          {Object.entries({
            leaveType: choices.leaveType,
            requestStatus: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
          }).map(([key, options]) => (
            <label key={key}>
              {label(key)}
              <select name={key}>
                <option value="">All</option>
                {options.map((v) => (
                  <option key={v} value={v}>
                    {statusLabel(v)}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {ranges.flatMap((prefix) =>
            ["From", "To"].map((bound) => (
              <label key={prefix + bound}>
                {label(prefix + bound)}
                <input
                  name={prefix + bound}
                  type={prefix === "requested" ? "datetime-local" : "date"}
                />
              </label>
            )),
          )}
          <div className={styles.actions}>
            <IconAction type="submit" icon="search" label="Search" showLabel />
            <IconAction type="reset" icon="reset" label="Reset filters" />
          </div>
        </form>
      </details>
      {notice && <p role="status">{notice}</p>}
      {!current ? (
        <p role="status">Loading leave requests…</p>
      ) : current.error ? (
        <p role="alert">
          {current.error}{" "}
          <IconAction
            icon="reset"
            label="Retry"
            showLabel
            onClick={() => setQuery({ ...query })}
          />
        </p>
      ) : !current.rows.length ? (
        <p>No matching leave requests.</p>
      ) : (
        <div className={styles.grid}>
          {current.rows.map((row) => (
            <article key={row.leaveRequestId}>
              <StatusBadge value={row.requestStatus} />
              <h2>{fullName(row.employee)}</h2>
              <p>
                {statusLabel(row.leaveType)} leave · {row.startDate} – {row.endDate}
              </p>
              <div className={styles.actions}>
                <IconAction
                  icon="details"
                  label="Details"
                  onClick={() => setDetails(row)}
                />
                {row.requestStatus === "PENDING" && (
                  <>
                    <IconAction
                      icon="edit"
                      label="Edit"
                      onClick={() => setEditor({ action: "update", record: row })}
                    />
                    {(["APPROVED", "REJECTED", "CANCELLED"] as const).map((status, i) => (
                      <IconAction
                        icon={
                          (
                            {
                              APPROVED: "approve",
                              REJECTED: "reject",
                              CANCELLED: "cancel",
                            } as const
                          )[status]
                        }
                        label={["Approve", "Reject", "Cancel leave"][i]}
                        key={status}
                        onClick={() =>
                          setEditor({ action: "update-status", record: row, status })
                        }
                      />
                    ))}
                  </>
                )}
                {row.requestStatus !== "APPROVED" && (
                  <IconAction
                    icon="delete"
                    label="Delete"
                    onClick={() => setEditor({ action: "delete", record: row })}
                  />
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {editor && (
        <LeaveEditor
          editor={editor}
          people={people}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setNotice(
              editor.action === "delete"
                ? "Leave request deleted."
                : "Leave request saved.",
            );
            setEditor(null);
            setQuery({ ...query });
          }}
        />
      )}
      {details && (
        <RecordDialog
          area="Leave requests"
          record={{ title: fullName(details.employee), row: details }}
          onClose={() => setDetails(null)}
        />
      )}
    </section>
  );
}
