import IconAction from "@/components/actions/IconAction";
import { useEffect, useRef } from "react";
import ProjectDetails, { type ProjectRecord } from "@/app/projects/ProjectDetails";
import DepartmentTeam from "@/app/departments/DepartmentTeam";
import { isIdentifier, label } from "@/app/workspace";
import StatusBadge, { isStatusField } from "./StatusBadge";
import styles from "./RecordDialog.module.css";

type Value = string | number | boolean | null | Value[] | Row;
export type Row = { [key: string]: Value };
export type Selection = { title: string; row: Row };

type Group = { name: string; fields: [string, string][] };

function collectGroups(value: Row | Value[], name: string): Group[] {
  const group: Group = { name, fields: [] };
  const children: Group[] = [];
  for (const [key, item] of Object.entries(value)) {
    if (isIdentifier(key)) continue;
    const field = Array.isArray(value) ? `Item ${Number(key) + 1}` : label(key);
    if (item !== null && typeof item === "object" && Object.keys(item).length) {
      children.push(
        ...collectGroups(item, name === "Record fields" ? field : `${name} / ${field}`),
      );
    } else {
      const display =
        item === null || item === ""
          ? "Not provided"
          : typeof item === "object"
            ? "None"
            : String(item);
      group.fields.push([field, display]);
    }
  }
  return group.fields.length ? [group, ...children] : children;
}

export default function RecordDialog({
  record,
  area,
  onClose,
}: {
  record: Selection;
  area: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="record-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <div>
            <p>{area}</p>
            <h2 id="record-title">{record.title}</h2>
            {area === "Departments" && typeof record.row.location === "string" && (
              <span>{String(record.row.location)}</span>
            )}
          </div>
          <IconAction
            icon="close"
            label="Close record details"
            type="button"
            onClick={onClose}
            aria-label="Close record details"
          />
        </header>
        <div
          className={styles.body}
          tabIndex={0}
          role="region"
          aria-label="Record information"
        >
          {area === "Departments" ? (
            <DepartmentTeam departmentId={String(record.row.departmentId)} />
          ) : area === "Projects" ? (
            <ProjectDetails record={record.row as ProjectRecord} />
          ) : (
            collectGroups(record.row, "Record fields").map((group, index) => (
              <table key={index}>
                <caption>{group.name}</caption>
                <tbody>
                  {group.fields.map(([field, value], i) => (
                    <tr key={i}>
                      <th scope="row">{field}</th>
                      <td>
                        {isStatusField(field) && value !== "Not provided" ? (
                          <StatusBadge value={value} />
                        ) : (
                          value
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))
          )}
        </div>
      </div>
    </dialog>
  );
}
