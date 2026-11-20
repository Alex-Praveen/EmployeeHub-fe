import Records from "@/components/records/Records";
import { areas } from "../workspace";
import styles from "./page.module.css";

export default function Page() {
  return <section className={styles.workspace}><Records area={areas[5]} /></section>;
}
