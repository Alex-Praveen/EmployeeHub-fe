"use client";
import PageHeader from "@/components/actions/PageHeader";
import { useState, type FormEvent } from "react";
import IconAction from "@/components/actions/IconAction";
import Records from "@/components/records/Records";
import { areaForRoute } from "../workspace";
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
    if (!departmentName) {
      setMessage("Enter a department name.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await postDepartment("create", {
        departmentName,
        location: String(data.get("location")).trim(),
      });
      setOpen(false);
      setMessage(departmentName + " created.");
      setVersion((value) => value + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create department.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.workspace}>
      <PageHeader title="Departments" subtitle={areaForRoute("departments").subtitle}>
        <IconAction
          icon={open ? "back" : "add"}
          label={open ? "Cancel" : "New department"}
          disabled={busy}
          aria-expanded={open}
          onClick={() => {
            setOpen(!open);
            setMessage("");
          }}
        />
      </PageHeader>
      {open && (
        <form className={styles.form} onSubmit={create}>
          <label>
            Department name
            <input name="name" required maxLength={100} />
          </label>
          <label>
            Location (optional)
            <input name="location" maxLength={100} />
          </label>
          <IconAction
            icon="save"
            label={busy ? "Creating…" : "Create department"}
            type="submit"
            disabled={busy}
          />
        </form>
      )}
      {message && <p role="status">{message}</p>}
      <Records showHeader={false} key={version} area={areaForRoute("departments")} />
    </section>
  );
}
