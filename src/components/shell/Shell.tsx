"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { Icon, modules } from "@/app/navigation";
import styles from "./shell.module.css";

function subscribe(update: () => void) {
  window.addEventListener("storage", update);
  return () => window.removeEventListener("storage", update);
}
function usePreference(key: string, initial: boolean) {
  const name = "employee-hub:" + key;
  const value = useSyncExternalStore(
    subscribe,
    () => {
      const saved = localStorage.getItem(name);
      return saved === null ? initial : saved === "true";
    },
    () => initial,
  );
  function toggle() {
    localStorage.setItem(name, String(!value));
    window.dispatchEvent(new Event("storage"));
  }
  return [value, toggle] as const;
}
export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [dark, theme] = usePreference("dark", false);
  const [side, dockSide] = usePreference("sidebar", true);
  const [top, dockTop] = usePreference("navbar", true);
  useEffect(() => {
    const legacy = modules.find((item) => "#" + item.slug === location.hash);
    if (path === "/" && legacy) router.replace("/" + legacy.slug);
  }, [path, router]);
  if (path === "/") return children;
  const links = [{ slug: "overview", name: "Overview" }, ...modules];
  const current = modules.find((item) => "/" + item.slug === path)?.name ?? "Overview";
  return (
    <div
      className={styles.shell}
      data-theme={dark ? "dark" : "light"}
      data-side={side}
      data-top={top}
    >
      <aside className={styles.side}>
        <Link href="/" className={styles.brand} aria-label="EmployeeHub home">
          <b>H</b>
          <span>Employee Hub</span>
        </Link>
        <nav aria-label="Workspace">
          {links.map(({ slug, name }) => {
            const href = "/" + slug;
            return (
              <Link
                key={slug}
                href={href}
                title={name}
                aria-label={name}
                aria-current={path === href ? "page" : undefined}
              >
                <Icon name={slug} />
                <span>{name}</span>
              </Link>
            );
          })}
        </nav>
        <button
          onClick={dockSide}
          aria-pressed={side}
          aria-label={side ? "Undock sidebar" : "Dock sidebar"}
          title={side ? "Undock sidebar" : "Dock sidebar"}
        >
          ◧ <span>{side ? "Undock sidebar" : "Dock sidebar"}</span>
        </button>
      </aside>
      <div className={styles.content}>
        <header className={styles.bar}>
          <span>
            Workspace　/　<strong>{current}</strong>
          </span>
          <div>
            <button onClick={dockTop} aria-pressed={top}>
              {top ? "Undock navbar" : "Dock navbar"}
            </button>
            <button onClick={theme} aria-pressed={dark}>
              {dark ? "☀ Light" : "☾ Dark"}
            </button>
          </div>
        </header>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
