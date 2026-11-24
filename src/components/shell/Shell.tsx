"use client";
import IconAction from "@/components/actions/IconAction";
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
        <IconAction
          icon="sidebar"
          label={side ? "Undock sidebar" : "Dock sidebar"}
          onClick={dockSide}
          aria-pressed={side}
        />
      </aside>
      <div className={styles.content}>
        <header className={styles.bar}>
          <span>
            Workspace　/　<strong>{current}</strong>
          </span>
          <div>
            <IconAction
              icon="navbar"
              label={top ? "Undock navbar" : "Dock navbar"}
              onClick={dockTop}
              aria-pressed={top}
            />
            <IconAction
              icon={dark ? "light" : "dark"}
              label={dark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={theme}
              aria-pressed={dark}
            />
          </div>
        </header>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
