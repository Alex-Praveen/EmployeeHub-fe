import styles from "./StatusBadge.module.css";

const tones: Record<string, string> = {
  REJECTED: "red",
  ABSENT: "red",
  FAILED: "red",
  BLOCKED: "red",
  OVERDUE: "red",
  PENDING: "orange",
  ON_HOLD: "orange",
  LATE: "orange",
  AWAITING_APPROVAL: "orange",
  APPROVED: "green",
  PRESENT: "green",
  ACTIVE: "green",
  COMPLETED: "green",
  REMOTE: "blue",
  IN_PROGRESS: "blue",
  PLANNED: "blue",
  HALF_DAY: "purple",
  ON_LEAVE: "purple",
  TERMINATED: "red",
};

export function isStatusField(field: string) {
  return /(?:status|state)$/i.test(field);
}

function normalize(value: string) {
  return value
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[ -]+/g, "_")
    .toUpperCase();
}

export function statusClass(value: string) {
  return styles[tones[normalize(value)] ?? "neutral"];
}

export function statusLabel(value: string) {
  return normalize(value)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (c) => c.toUpperCase());
}

export default function StatusBadge({ value }: { value: string }) {
  return (
    <span className={styles.badge + " " + statusClass(value)}>{statusLabel(value)}</span>
  );
}
