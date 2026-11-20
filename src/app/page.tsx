import Link from "next/link";
import WebThreads from "@/components/backgrounds/WebThreads";
import styles from "./page.module.css";

export default function Home() {
  return <main className={styles.landing}>
    <div aria-hidden="true" className={styles.backdrop}>
      <WebThreads className={styles.threads} colors={["#6966ff", "#cf54e6", "#548fff"]}
        backgroundColor="#0d0d24" coreColor="#eee7ff" />
    </div>
    <div className={styles.intro}>
      <h1>EmployeeHub</h1>
      <p>Your people, connected.</p>
      <Link href="/overview">Open overview <span aria-hidden="true">&rarr;</span></Link>
    </div>
  </main>;
}
