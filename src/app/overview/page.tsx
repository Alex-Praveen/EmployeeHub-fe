import DepartmentSummary from "./DepartmentSummary";
import Link from "next/link";
import { Icon, modules } from "../navigation";
import styles from "./page.module.css";

export default function Overview() {
  return (
    <>
      <section className={styles.banner}>
        <div>
          <p>Employee Hub / People operations</p>
          <h1>Workforce overview</h1>
          <p>Your workspace for teams, time and talent.</p>
        </div>
        <div className={styles.orbit} aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </section>
      <DepartmentSummary />
      <h2 className={styles.heading}>HR workspace</h2>
      <div className={styles.grid}>
        {modules.map((area) => (
          <Link className={styles.card} key={area.slug} href={"/" + area.slug}>
            <div className={styles.icon}>
              <Icon name={area.slug} />
            </div>
            <h3>{area.name}</h3>
            <p>{area.subtitle}</p>
            <span aria-hidden="true">↗</span>
          </Link>
        ))}
      </div>
    </>
  );
}
