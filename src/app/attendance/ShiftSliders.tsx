import { shiftMinutes, shiftTimes, type Adjustment } from "./bulkAttendance";
import styles from "./page.module.css";

function displayClock(clock: string) {
  const [hours, minutes] = clock.split(":");
  return (
    (Number(hours) % 12 || 12) + ":" + minutes + (Number(hours) < 12 ? " AM" : " PM")
  );
}

export default function ShiftSliders({
  name,
  value,
  onChange,
}: {
  name: string;
  value: Adjustment;
  onChange: (value: Adjustment) => void;
}) {
  const { checkIn, checkOut } = shiftTimes(value);
  return (
    <details className={styles.adjustments}>
      <summary>
        Adjust shift · {displayClock(checkIn)} – {displayClock(checkOut)}
      </summary>
      {(["late", "early"] as const).map((key) => {
        const duration = value[key];
        const max = shiftMinutes - 1 - value[key === "late" ? "early" : "late"];
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        const title = key === "late" ? "Late arrival" : "Early checkout";
        return (
          <fieldset key={key}>
            <legend>
              {title} · {hours}h {minutes}m
            </legend>
            <label>
              Hours
              <input
                type="range"
                min={0}
                max={Math.floor(max / 60)}
                value={hours}
                aria-label={name + " " + title + " hours"}
                onChange={(e) =>
                  onChange({
                    ...value,
                    [key]: Math.min(max, Number(e.target.value) * 60 + minutes),
                  })
                }
              />
            </label>
            <label>
              Minutes
              <input
                type="range"
                min={0}
                max={Math.min(59, max - hours * 60)}
                value={minutes}
                aria-label={name + " " + title + " minutes"}
                onChange={(e) =>
                  onChange({ ...value, [key]: hours * 60 + Number(e.target.value) })
                }
              />
            </label>
          </fieldset>
        );
      })}
    </details>
  );
}
