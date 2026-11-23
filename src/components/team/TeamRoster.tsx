import { useState } from "react";
import EmployeeProfile, { employeeName, type Member } from "./EmployeeProfile";
import styles from "./team.module.css";

export default function TeamRoster({ members }: { members: Member[] }) {
  const [selected, setSelected] = useState<Member | null>(null);
  return (
    <>
      <h3 className={styles.teamHeading}>Team members ({members.length})</h3>
      <ul className={styles.members}>
        {members.map((member, index) => (
          <li key={member.employeeId + "-" + index}>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setSelected(member)}
            >
              <span>
                <strong>{employeeName(member)}</strong>
                <small>{member.projectRole || member.jobTitle?.titleName}</small>
              </span>
              <span aria-hidden="true">&rsaquo;</span>
            </button>
          </li>
        ))}
      </ul>
      {selected && (
        <EmployeeProfile member={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
