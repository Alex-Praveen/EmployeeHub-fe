import Records from "@/components/records/Records";
import { areaForRoute } from "../workspace";
import styles from "./page.module.css";

export default function Page() {
  return (
    <section className={styles.workspace}>
      <Records area={areaForRoute("performance-reviews")} />
    </section>
  );
}
