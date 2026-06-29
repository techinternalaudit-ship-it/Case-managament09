"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";

type IconName = React.ComponentProps<typeof Icon>["name"];

export function SidebarLink({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`nav-item group ${active ? "nav-item-active" : ""}`}
    >
      <div className={`h-7 w-7 rounded-lg grid place-items-center transition-colors duration-200 ${
        active
          ? "bg-primary-500 text-white shadow-sm"
          : "bg-ink-100/80 dark:bg-white/[0.06] text-ink-500 dark:text-gray-500 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/20 group-hover:text-primary-700 dark:group-hover:text-primary-400"
      }`}>
        <Icon name={icon} className="h-3.5 w-3.5" />
      </div>
      <span className="truncate">{label}</span>
    </Link>
  );
}
