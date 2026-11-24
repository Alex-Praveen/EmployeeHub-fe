export type Adjustment = { late: number; early: number };
export const standardShift: Adjustment = { late: 0, early: 0 };
export const shiftMinutes = 9 * 60;

function clock(minutes: number) {
  return [Math.floor(minutes / 60), minutes % 60]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}
export function shiftTimes({ late, early }: Adjustment) {
  return { checkIn: clock(9 * 60 + late), checkOut: clock(18 * 60 - early) };
}
export function bulkAttendanceRows(
  statuses: Record<number, string>,
  attendanceDate: string,
  adjustments: Record<number, Adjustment>,
) {
  return Object.entries(statuses)
    .filter(([, status]) => status !== "")
    .map(([id, attendanceStatus]) => ({
      employeeId: Number(id),
      attendanceDate,
      attendanceStatus,
      ...(attendanceStatus === "ABSENT"
        ? { checkIn: null, checkOut: null }
        : shiftTimes(adjustments[Number(id)] ?? standardShift)),
    }));
}
