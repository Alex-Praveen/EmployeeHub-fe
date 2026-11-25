"use client";
import IconAction from "@/components/actions/IconAction";
import styles from "./records.module.css";
import { useState, useEffect, useRef } from "react";
import { fetchRecords } from "./fetchRecords";
import {
  choices,
  isIdentifier,
  label,
  typeOfField,
  type Operation,
  type Area,
} from "@/app/workspace";

import StatusBadge, { isStatusField, statusClass, statusLabel } from "./StatusBadge";
import RecordDialog, { type Row, type Selection } from "./RecordDialog";
export default function Records({
  area,
  showHeader = true,
}: {
  area: Area;
  showHeader?: boolean;
}) {
  const [selected, setSelected] = useState<Selection | null>(null);
  const [mode, setMode] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<Row[]>([]);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const active = useRef<AbortController | null>(null);
  const op = area.operations[mode];
  const searchFields = op.fields.filter((key) => !isIdentifier(key));
  async function load(operation: Operation, inputs: Record<string, string>) {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;

    return fetchRecords(operation, inputs, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setRows(result);
        setState("ready");
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Unable to load records.");
        setState("error");
      });
  }
  useEffect(() => {
    void load(area.operations[0], {});
    return () => active.current?.abort();
  }, [area]);
  function search(operation: Operation, inputs: Record<string, string>) {
    setState("loading");
    setRows([]);
    setFilter("");
    void load(operation, inputs);
  }
  function select(index: number, inputs: Record<string, string> = {}) {
    active.current?.abort();
    setMode(index);
    setValues(inputs);
    setRows([]);
    setFilter("");
    const next = area.operations[index];
    if (!next.path.includes("{") || Object.keys(inputs).length) search(next, inputs);
    else setState("idle");
  }
  const visible = rows.filter((row) =>
    JSON.stringify(row, (key, value) => (isIdentifier(key) ? undefined : value))
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  return (
    <div className={styles.records}>
      {showHeader && (
        <section className="hero">
          <div>
            <h1>{area.name}</h1>
            <p>{area.subtitle}</p>
          </div>
        </section>
      )}
      <div className="tabs">
        {area.operations.map((o, i) =>
          o.path.includes("{") && o.fields.some(isIdentifier) ? null : (
            <button key={o.path} aria-pressed={mode === i} onClick={() => select(i)}>
              {o.name}
            </button>
          ),
        )}
      </div>
      {!!searchFields.length && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            search(op, values);
          }}
        >
          <div className="fields">
            {searchFields.map((k) => (
              <label key={k}>
                {label(k)}
                {choices[k] ? (
                  <select
                    className={
                      isStatusField(k) && values[k] ? statusClass(values[k]) : undefined
                    }
                    value={values[k] || ""}
                    onChange={(e) => setValues({ ...values, [k]: e.target.value })}
                  >
                    <option value="">All</option>
                    {choices[k].map((v) => (
                      <option
                        key={v}
                        value={v}
                        className={isStatusField(k) ? statusClass(v) : undefined}
                      >
                        {isStatusField(k) ? statusLabel(v) : v}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={typeOfField(k)}
                    required={op.path.includes("{")}
                    min={k.endsWith("Id") ? 1 : undefined}
                    step={/Amount|budget/.test(k) ? "any" : undefined}
                    value={values[k] || ""}
                    onChange={(e) => setValues({ ...values, [k]: e.target.value })}
                  />
                )}
              </label>
            ))}
          </div>
          <IconAction
            icon="search"
            type="submit"
            label="Search records"
            className="primary"
          />
        </form>
      )}
      <section className="results">
        <div className="resultHead">
          <h2>
            {area.name === "Departments" ? "Department directory" : "Results"}{" "}
            {state === "ready" && <small>{visible.length}</small>}
          </h2>
          {rows.length > 0 && (
            <input
              aria-label="Filter results"
              placeholder="Filter results…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          )}
        </div>
        {state === "error" ? (
          <p role="alert">
            {error}{" "}
            <IconAction icon="reset" label="Retry" onClick={() => search(op, values)} />
          </p>
        ) : state === "idle" ? (
          <p>Enter the lookup value above to see records.</p>
        ) : state === "loading" ? (
          <p role="status">Loading records…</p>
        ) : !visible.length ? (
          <p>No matching records.</p>
        ) : (
          <div className="grid">
            {visible.map((row, i) => {
              const project = (row.project || row) as Row;
              const employee = row.employee as Row | undefined;
              const title = String(
                row.departmentName ||
                  project.projectName ||
                  (employee &&
                    [employee.firstName, employee.lastName].filter(Boolean).join(" ")) ||
                  [row.firstName, row.lastName].filter(Boolean).join(" ") ||
                  area.name,
              );
              const id =
                row.attendanceId ||
                row.leaveRequestId ||
                row.reviewId ||
                row.salaryId ||
                row.employeeId ||
                row.departmentId ||
                project.projectId;
              const statuses = Object.entries({ ...project, ...row }).filter(
                (entry): entry is [string, string] =>
                  isStatusField(entry[0]) && typeof entry[1] === "string" && !!entry[1],
              );
              return (
                <article key={String(id ?? "") + "-" + i}>
                  <div className="cardtop">
                    <span className={"icon tone" + (i % 4)}>
                      {title
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((s) => s[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                    <div className={styles.statuses}>
                      {statuses.map(([field, value]) => (
                        <StatusBadge key={field} value={value} />
                      ))}
                    </div>
                  </div>
                  <h3>{title}</h3>
                  <div className="meta">
                    {String(row.location || row.reviewDate || row.currency || "")}
                  </div>
                  <IconAction
                    icon="details"
                    label={
                      area.name === "Departments"
                        ? "View department team"
                        : "Record details"
                    }
                    aria-haspopup="dialog"
                    aria-label={
                      (area.name === "Departments"
                        ? "View team for "
                        : "Record details for ") + title
                    }
                    className={styles.openRecord}
                    onClick={() => setSelected({ title, row })}
                  />
                </article>
              );
            })}
          </div>
        )}
      </section>
      {selected && (
        <RecordDialog
          record={selected}
          area={area.name}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
