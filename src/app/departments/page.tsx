"use client";
import { useState, type FormEvent } from "react";
import Records from "@/components/records/Records";
import { areas } from "../workspace";
import { postDepartment } from "./api";
import styles from "./page.module.css";

export default function Page() {
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const departmentName = String(data.get("name")).trim();
    if (!departmentName) { setMessage("Enter a department name."); return; }
    setBusy(true);
    setMessage("");
    try {
      await postDepartment("create", { departmentName, location: String(data.get("location")).trim() });
      setOpen(false);
      setMessage(departmentName + " created.");
      setVersion(value => value + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create department.");
    } finally { setBusy(false); }
  }
  return <section className={styles.workspace}>
    <div className={styles.actions}><button disabled={busy} aria-expanded={open} onClick={() => {
      setOpen(!open); setMessage("");
    }}>{open ? "Cancel" : "New department"}</button></div>
    {open && <form className={styles.form} onSubmit={create}>
      <label>Department name<input name="name" required maxLength={100} /></label>
      <label>Location (optional)<input name="location" maxLength={100} /></label>
      <button disabled={busy}>{busy ? "Creating…" : "Create department"}</button>
    </form>}
    {message && <p role="status">{message}</p>}
    <Records key={version} area={areas[0]} />
  </section>;
}
