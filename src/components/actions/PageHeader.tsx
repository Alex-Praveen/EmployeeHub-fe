import type { ReactNode } from "react";
import styles from "./PageHeader.module.css";

export default function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.header} aria-label={title}>
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className={styles.actions}>{children}</div>
    </section>
  );
}
