import { useState, useEffect } from "react";
import StatusBadge from "@/components/records/StatusBadge";
import TeamRoster from "@/components/team/TeamRoster";
import { formatDate, type Member } from "@/components/team/EmployeeProfile";

type Project = {
  projectId: number;
  projectName: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  projectStatus?: string;
};
type Assignment = { employee: Member; projectRole?: string; assignedDate?: string };
export type ProjectRecord = Project | { project: Project; employees: Assignment[] };

export default function ProjectDetails({ record }: { record: ProjectRecord }) {
  const project = "project" in record ? record.project : record;
  const included = "employees" in record ? record.employees : undefined;
  const [loaded, setLoaded] = useState<Assignment[]>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (included) return;
    const controller = new AbortController();
    async function readRoster() {
      const response = await fetch("/api/projects/" + project.projectId + "/employees", {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Team unavailable");
      const result = await response.json();
      if (!Array.isArray(result.employees)) throw new Error("Missing team");
      if (!controller.signal.aborted) setLoaded(result.employees);
    }
    readRoster().catch(() => {
      if (!controller.signal.aborted) setFailed(true);
    });
    return () => controller.abort();
  }, [included, project.projectId, attempt]);

  const assignments = included ?? loaded;
  return (
    <>
      {project.description && <p>{project.description}</p>}
      <table aria-label="Project overview">
        <tbody>
          {project.projectStatus && (
            <tr>
              <th scope="row">Status</th>
              <td>
                <StatusBadge value={project.projectStatus} />
              </td>
            </tr>
          )}
          {project.startDate && (
            <tr>
              <th scope="row">Start date</th>
              <td>{formatDate(project.startDate)}</td>
            </tr>
          )}
          {project.endDate && (
            <tr>
              <th scope="row">End date</th>
              <td>{formatDate(project.endDate)}</td>
            </tr>
          )}
          {project.budget != null && (
            <tr>
              <th scope="row">Budget</th>
              <td>{project.budget.toLocaleString("en-GB")}</td>
            </tr>
          )}
        </tbody>
      </table>
      {failed ? (
        <p role="alert">
          Team members could not be loaded.{" "}
          <button
            onClick={() => {
              setFailed(false);
              setAttempt((value) => value + 1);
            }}
          >
            Retry
          </button>
        </p>
      ) : !assignments ? (
        <p role="status">Loading team members.</p>
      ) : assignments.length ? (
        <TeamRoster
          members={assignments.map(({ employee, projectRole, assignedDate }) => ({
            ...employee,
            projectRole,
            assignedDate,
          }))}
        />
      ) : (
        <p>No team members are assigned to this project.</p>
      )}
    </>
  );
}
