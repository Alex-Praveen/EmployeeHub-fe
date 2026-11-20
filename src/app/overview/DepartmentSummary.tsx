"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

type Department = { departmentName: string; location: string | null; createdAt: string };
type Summary = { departments: number; locations: number; latest: string };

export default function DepartmentSummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function readDirectory() {
      const response = await fetch("/api/departments/all-departments", {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Directory unavailable");
      const rows: Department[] = await response.json();
      const locations = new Set(rows.map(row => row.location?.trim().toLowerCase()).filter(Boolean));
      const latest = rows.reduce<Department | null>((recent, row) =>
        !recent || row.createdAt > recent.createdAt ? row : recent, null);
      if (!controller.signal.aborted) {
        setSummary({ departments: rows.length, locations: locations.size, latest: latest?.departmentName ?? "None" });
      }
    }
    readDirectory().catch(() => {
      if (!controller.signal.aborted) setFailed(true);
    });
    return () => controller.abort();
  }, []);

  if (failed) return <p className={styles.notice}>Department metrics are unavailable.</p>;
  return <dl className={styles.metrics} aria-label="Department overview" aria-busy={!summary}>
    <div><dt>Departments</dt><dd>{summary?.departments ?? "…"}</dd></div>
    <div><dt>Department locations</dt><dd>{summary?.locations ?? "…"}</dd></div>
    <div><dt>Newest department</dt><dd>{summary?.latest ?? "…"}</dd></div>
  </dl>;
}
