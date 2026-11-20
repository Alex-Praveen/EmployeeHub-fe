import type { Metadata } from "next";
import "./globals.css";
import Shell from "@/components/shell/Shell";

export const metadata: Metadata = { icons: { icon: "/hub.svg" }, title: "Employee Hub | People workspace", description: "Departments, teams and employee records" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Shell>{children}</Shell></body></html>;
}


