import type { ButtonHTMLAttributes } from "react";
import {
  CalendarDays,
  ArrowRight,
  ArrowRightLeft,
  UsersRound,
  Eye,
  Pencil,
  Check,
  X,
  Ban,
  Trash2,
  UserRoundMinus,
  Plus,
  Search,
  RotateCcw,
  ArrowLeft,
  Save,
  PanelLeft,
  PanelTop,
  Sun,
  Moon,
} from "lucide-react";
import styles from "./IconAction.module.css";

const icons = {
  today: CalendarDays,
  next: ArrowRight,
  transfer: ArrowRightLeft,
  close: X,
  group: UsersRound,
  details: Eye,
  edit: Pencil,
  approve: Check,
  reject: X,
  cancel: Ban,
  delete: Trash2,
  terminate: UserRoundMinus,
  add: Plus,
  search: Search,
  reset: RotateCcw,
  back: ArrowLeft,
  save: Save,
  sidebar: PanelLeft,
  navbar: PanelTop,
  light: Sun,
  dark: Moon,
};

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: keyof typeof icons;
  label: string;
};

export default function IconAction({
  icon,
  label,
  className = "",
  type = "button",
  ...props
}: Props) {
  const Glyph = icons[icon];
  return (
    <button
      type={type}
      data-label={label}
      title={label}
      aria-label={label}
      className={styles.action + " " + className}
      data-action={icon}
      {...props}
    >
      <Glyph size={17} strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
}
