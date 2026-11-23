import { areas } from "./workspace";

export const modules = areas.map((area) => ({
  ...area,
  slug: area.operations[0].path.split("/")[0],
}));

const paths: Record<string, string> = {
  employees: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 7 0 0 1 16 0",
  overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  departments:
    "M3 21h18 M5 21V5l10-2v18 M15 10h4v11 M8 8h1 M11 7h1 M8 12h1 M11 11h1 M8 16h1 M11 15h1",
  projects: "M3 7h7l2 2h9v11H3z M3 7V4h7l2 2h7v3",
  attendance: "M5 5h14v16H5z M8 3v4 M16 3v4 M5 10h14 M8 15l3 3 5-6",
  "leave-requests": "M3 13l18-9-6 17-4-7z M11 14L21 4",
  "performance-reviews": "M3 21h18 M5 17v-4 M11 17v-7 M17 17V6 M3 9l6-5 4 2 6-4",
  salaries: "M3 6h18v13H3z M3 10h18 M6 15h4",
};
export function Icon({ name }: { name: string }) {
  return (
    <svg
      aria-hidden="true"
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}
