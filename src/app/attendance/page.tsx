"use client";
import { apiRequest } from "@/data/apiRequest";
import PageHeader from "@/components/actions/PageHeader";
import { useEffect, useState } from "react";
import StatusBadge from "@/components/records/StatusBadge";
import Records from "@/components/records/Records";
import { areaForRoute } from "../workspace";
import styles from "./page.module.css";

import AttendanceEditor, { type Entry, type Editor } from "./AttendanceEditor";
import IconAction from "@/components/actions/IconAction";
function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
function Calendar({ today, onChange }: { today: string; onChange: () => void }) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [notice, setNotice] = useState("");
  const [day, select] = useState(today);
  const [attempt, retry] = useState(0);
  const [result, setResult] = useState<{
    month: string;
    attempt: number;
    rows: Entry[];
    failed?: boolean;
  }>();
  const month = day.slice(0, 7);
  const first = new Date(month + "-01T12:00:00");
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  useEffect(() => {
    const controller = new AbortController();
    async function read() {
      const response = await apiRequest("/api/attendance/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: month + "-01", endDate: month + "-" + days }),
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      const rows: Entry[] = await response.json();
      if (!controller.signal.aborted) setResult({ month, attempt, rows });
    }
    read().catch(() => {
      if (!controller.signal.aborted)
        setResult({ month, attempt, rows: [], failed: true });
    });
    return () => controller.abort();
  }, [month, days, attempt]);
  function move(delta: number) {
    select(dateKey(new Date(first.getFullYear(), first.getMonth() + delta, 1)));
  }
  const current =
    result?.month === month && result.attempt === attempt ? result : undefined;
  const marked = new Set(current?.rows.map((row) => row.attendanceDate));
  const entries = current?.rows.filter((row) => row.attendanceDate === day) ?? [];
  return (
    <>
      {" "}
      <PageHeader title="Attendance" subtitle="Select a date to view the daily register.">
        <IconAction
          disabled={!current || current.failed}
          icon="group"
          label="Add group attendance"
          onClick={() => setEditor({ action: "create-bulk" })}
        />
        <IconAction
          disabled={!current || current.failed}
          icon="add"
          label="Add attendance"
          onClick={() => setEditor({ action: "create" })}
        />
      </PageHeader>
      <div className={styles.layout}>
        <section className={styles.panel} aria-label="Attendance calendar">
          <header>
            <h2>
              {first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </h2>
            <IconAction icon="today" label="Today" onClick={() => select(today)} />
          </header>
          <div className={styles.controls}>
            <IconAction
              icon="back"
              label="Previous month"
              onClick={() => move(-1)}
              aria-label="Previous month"
            />
            <input
              aria-label="Jump to date"
              type="date"
              value={day}
              onChange={(e) => {
                if (e.target.value && e.target.validity.valid) select(e.target.value);
              }}
            />
            <IconAction
              icon="next"
              label="Next month"
              onClick={() => move(1)}
              aria-label="Next month"
            />
          </div>
          <div className={styles.grid}>
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
              <small key={d}>{d}</small>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={"blank" + i} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const key = month + "-" + String(i + 1).padStart(2, "0");
              return (
                <button
                  key={key}
                  aria-label={key + (marked.has(key) ? " with attendance" : "")}
                  aria-pressed={key === day}
                  data-records={marked.has(key)}
                  onClick={() => select(key)}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </section>
        <section className={styles.panel} aria-live="polite">
          <header>
            <h2>
              {new Date(day + "T12:00:00").toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h2>
            {current && !current.failed && <small>{entries.length} records</small>}
          </header>

          {notice && <p role="status">{notice}</p>}
          {!current ? (
            <p>Loading attendance…</p>
          ) : current.failed ? (
            <p role="alert">
              Attendance could not be loaded.{" "}
              <IconAction icon="reset" label="Retry" onClick={() => retry(attempt + 1)} />
            </p>
          ) : !entries.length ? (
            <p>No attendance recorded for this date.</p>
          ) : (
            <div className={styles.scroll}>
              <table>
                <thead>
                  <tr>
                    {[
                      "Employee",
                      "Job title",
                      "Check-in",
                      "Check-out",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <th key={h} scope="col">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((row) => (
                    <tr key={row.attendanceId}>
                      <th scope="row">
                        {row.employee.firstName} {row.employee.lastName}
                      </th>
                      <td>{row.employee.jobTitle?.titleName || "Unassigned"}</td>
                      <td>{row.checkIn?.slice(0, 5) ?? "—"}</td>
                      <td>{row.checkOut?.slice(0, 5) ?? "—"}</td>
                      <td>
                        <StatusBadge value={row.status} />
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <IconAction
                            icon="edit"
                            label={`Edit attendance for ${row.employee.firstName} ${row.employee.lastName}`}
                            onClick={() => setEditor({ action: "update", record: row })}
                          />
                          <IconAction
                            icon="delete"
                            label={`Delete attendance for ${row.employee.firstName} ${row.employee.lastName}`}
                            onClick={() => setEditor({ action: "delete", record: row })}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {editor && (
          <AttendanceEditor
            editor={editor}
            entries={entries}
            day={day}
            onClose={() => setEditor(null)}
            onSaved={(message) => {
              setEditor(null);
              setNotice(message);
              retry((v) => v + 1);
              onChange();
            }}
          />
        )}
      </div>
    </>
  );
}
export default function Page() {
  const [today, setToday] = useState("");
  const [revision, setRevision] = useState(0);
  const [advanced, setAdvanced] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setToday(dateKey(new Date())), 0);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className={styles.workspace}>
      {today && <Calendar today={today} onChange={() => setRevision((v) => v + 1)} />}
      <IconAction
        icon="search"
        label="Advanced attendance search"
        aria-expanded={advanced}
        onClick={() => setAdvanced(!advanced)}
      />
      {advanced && (
        <Records showHeader={false} key={revision} area={areaForRoute("attendance")} />
      )}
    </div>
  );
}
