import { useEffect, useState } from "react";
import TeamRoster from "@/components/team/TeamRoster";

import type { Member } from "@/components/team/EmployeeProfile";

export default function DepartmentTeam({ departmentId }: { departmentId: string }) {

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
  if (!members.length) return <p>No team members are assigned to this department.</p>;
  return <TeamRoster members={members} />;
}
