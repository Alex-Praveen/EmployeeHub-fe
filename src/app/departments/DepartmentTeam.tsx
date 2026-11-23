import { useEffect, useState } from "react";
import TransferForm from "./TransferForm";
import TeamRoster from "@/components/team/TeamRoster";

import type { Member } from "@/components/team/EmployeeProfile";

export default function DepartmentTeam({ departmentId }: { departmentId: string }) {

  const [transfer, setTransfer] = useState(false);
  const [notice, setNotice] = useState("");
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function readTeam() {
      const response = await fetch("/api/departments/employees/" + encodeURIComponent(departmentId), {
        signal: controller.signal, cache: "no-store",
      });
      if (!response.ok) throw new Error("Team unavailable");
      const department = await response.json();
      if (!Array.isArray(department.employees)) throw new Error("Missing team");
      if (!controller.signal.aborted) setMembers(department.employees);
    }
    readTeam().catch(() => {
      if (!controller.signal.aborted) setError(true);
    });
    return () => controller.abort();
  }, [departmentId, attempt]);

  if (error) return <p role="alert">Team members could not be loaded. <button onClick={() => {
    setError(false);
    setAttempt(attempt + 1);
  }}>Retry</button></p>;
  if (!members) return <p role="status">Loading team members…</p>;
  return <>
    {notice && <p role="status">{notice}</p>}
    {members.length ? <>
      <TeamRoster members={members} />
      <button aria-expanded={transfer} onClick={() => setTransfer(!transfer)}>{transfer ? "Close transfer form" : "Transfer employee"}</button>
      {transfer && <TransferForm members={members} source={departmentId} onTransferred={(id, message) => {
        setMembers(current => current?.filter(member => member.employeeId !== id) ?? null);
        setNotice(message);
        setTransfer(false);
      }} />}
    </> : <p>No team members are assigned to this department.</p>}
  </>;
}
