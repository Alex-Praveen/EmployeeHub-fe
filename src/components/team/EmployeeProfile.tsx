import { useEffect, useRef } from "react";
import dialogStyles from "@/components/records/RecordDialog.module.css";
import styles from "./team.module.css";

export type Member = {
  employeeId: number;
  projectRole?: string;
  assignedDate?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  hireDate?: string;
  jobTitle?: { titleName?: string; description?: string };
};

export function employeeName(member: Member) {
  return (
    [member.firstName, member.lastName].filter(Boolean).join(" ") || "Name unavailable"
  );
}

export function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
}

export default function EmployeeProfile({
  member,
  onClose,
}: {
  member: Member;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={dialogStyles.dialog}
      aria-labelledby="employee-name"
      onCancel={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={dialogStyles.panel}>
        <header className={dialogStyles.header}>
          <div>
            <p>Employee profile</p>
            <h2 id="employee-name">{employeeName(member)}</h2>
            <span>{member.jobTitle?.titleName || "Role unassigned"}</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close employee profile">
            &times;
          </button>
        </header>
        <dl className={styles.profile}>
          {member.projectRole && (
            <>
              <dt>Project role</dt>
              <dd>{member.projectRole}</dd>
            </>
          )}
          {member.assignedDate && (
            <>
              <dt>Assigned</dt>
              <dd>{formatDate(member.assignedDate)}</dd>
            </>
          )}
          <dt>Email</dt>
          <dd>
            {member.email ? (
              <a href={"mailto:" + member.email}>{member.email}</a>
            ) : (
              "Not provided"
            )}
          </dd>
          <dt>Phone</dt>
          <dd>
            {member.phone ? (
              <a href={"tel:" + member.phone}>{member.phone}</a>
            ) : (
              "Not provided"
            )}
          </dd>
          <dt>Hire date</dt>
          <dd>{member.hireDate ? formatDate(member.hireDate) : "Not provided"}</dd>
          {member.jobTitle?.description && (
            <>
              <dt>Responsibilities</dt>
              <dd>{member.jobTitle.description}</dd>
            </>
          )}
        </dl>
      </div>
    </dialog>
  );
}
