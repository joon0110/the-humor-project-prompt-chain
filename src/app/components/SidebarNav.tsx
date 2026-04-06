"use client";

import Link from "next/link";
import AccountMenu from "@/app/components/AccountMenu";
import ThemeToggle from "@/app/components/ThemeToggle";

const NAV_ITEMS = [
  { href: "/humor-flavor", label: "Humor Flavors", key: "humor-flavor" },
] as const;

type SidebarNavProps = {
  activeKey: (typeof NAV_ITEMS)[number]["key"];
  displayName: string;
  children: React.ReactNode;
};

export default function SidebarNav({
  activeKey,
  displayName,
  children,
}: SidebarNavProps) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <aside className="fixed left-0 top-0 flex h-screen w-56 flex-col border-r border-[var(--card-border)] bg-[var(--sidebar)] px-6 pb-8 pt-10">
        <nav className="space-y-3">
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === activeKey;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`block w-full rounded-full px-6 py-3 text-left text-sm font-semibold tracking-wide transition ${
                  isActive
                    ? "border border-[var(--card-border-strong)] bg-[var(--card-alt)] text-[var(--foreground)] shadow-[0_0_0_1px_rgba(63,63,70,0.35)]"
                    : "border border-[var(--card-border)] bg-[var(--card)] text-[var(--muted)] hover:bg-[var(--card-alt)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3 pb-2 pt-10">
          <ThemeToggle />
          <AccountMenu displayName={displayName} />
        </div>
      </aside>

      <main className="ml-56 px-12 pb-12 pt-12">{children}</main>
    </div>
  );
}
