export type Operation = {
  name: string;
  path: string;
  fields: string[];
  method?: "POST";
  query?: boolean;
};
export type Area = { name: string; subtitle: string; operations: Operation[] };
const search = (path: string, fields: string[], name = "Search records"): Operation => ({
  name,
  path,
  fields,
  method: "POST",
});
export const areas: Area[] = [
  {
    name: "Departments",
    subtitle: "Explore departments, locations and the people on each team.",
    operations: [
      search(
        "departments/search",
        ["departmentName", "location", "createdFrom", "createdTo"],
        "Search departments",
      ),
      {
        name: "Exact location",
        path: "departments/location/{location}",
        fields: ["location"],
      },
    ],
  },
  {
    name: "Employees",
    subtitle: "Find people by name, contact details or employment status.",
    operations: [
      search(
        "employees/search",
        ["firstName", "lastName", "email", "employmentStatus"],
        "Find employees",
      ),
    ],
  },
  {
    name: "Attendance",
    subtitle: "Find attendance records by status, date and working hours.",
    operations: [
      search("attendance/search", [
        "status",
        "startDate",
        "endDate",
        "checkInFrom",
        "checkInTo",
        "checkOutFrom",
        "checkOutTo",
      ]),
    ],
  },
  {
    name: "Leave requests",
    subtitle: "Review employee leave by type, dates and reason.",
    operations: [
      search("leave-requests/search", [
        "employeeId",
        "leaveType",
        "startDate",
        "endDate",
        "reason",
      ]),
    ],
  },
  {
    name: "Projects",
    subtitle: "Find projects and explore employee assignments.",
    operations: [
      search(
        "projects/search",
        ["projectId", "projectName", "description", "startDate", "endDate", "budget"],
        "Find projects",
      ),
      search(
        "projects/search/employee-projects",
        ["employeeId", "projectId", "projectRole", "assignedDate"],
        "Find assignments",
      ),
      {
        name: "Project team",
        path: "projects/{projectId}/employees",
        fields: ["projectId"],
      },
    ],
  },
  {
    name: "Performance reviews",
    subtitle: "Explore employee feedback, reviewers and ratings.",
    operations: [
      {
        ...search("performance-reviews/search", [
          "employeeId",
          "reviewerId",
          "reviewDate",
          "rating",
          "comments",
        ]),
        query: true,
      },
    ],
  },
  {
    name: "Salaries",
    subtitle: "Explore compensation by employee, amount and effective date.",
    operations: [
      search("salaries/search", [
        "salaryId",
        "employeeId",
        "minAmount",
        "maxAmount",
        "effectiveFrom",
        "effectiveTo",
        "currency",
      ]),
    ],
  },
];
export const choices: Record<string, string[]> = {
  employmentStatus: ["ACTIVE", "ON_LEAVE", "RESIGNED", "TERMINATED"],
  status: ["PRESENT", "ABSENT", "REMOTE", "HALF_DAY"],
  leaveType: ["ANNUAL", "SICK", "PERSONAL", "PARENTAL"],
  currency: ["USD", "EUR", "INR", "AED"],
};
export function label(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/ Id$/, " ID");
}
export function typeOfField(key: string) {
  if (key === "createdFrom" || key === "createdTo") return "datetime-local";
  if (/^check/.test(key)) return "time";
  if (/Date|^effective/.test(key)) return "date";
  if (/Id$|Amount$|rating|budget/.test(key)) return "number";
  return "text";
}

export function isIdentifier(key: string) {
  return (
    /^(id|uuid)$/i.test(key) ||
    /(?:Id|ID|Uuid|UUID)s?$/.test(key) ||
    /_(id|uuid)s?$/i.test(key)
  );
}

export function areaForRoute(route: string): Area {
  const area = areas.find(({ operations }) => operations[0].path.split("/")[0] === route);
  if (!area) throw new Error(`Unknown workspace route: ${route}`);
  return area;
}
