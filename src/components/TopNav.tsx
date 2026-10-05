"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

type Props = {
  appName: string;
  email?: string | null;
  onLogout: () => Promise<void> | void;
  isLoggingOut?: boolean;
};

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/summary", label: "Summary" },
  { href: "/profile", label: "Profile" },
];

const getThemeSnapshot = () => {
  const stored = localStorage.getItem("theme");
  return stored
    ? stored === "dark"
    : window.matchMedia("(prefers-color-scheme: dark)").matches;
};

const subscribeToTheme = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener("receiptai-theme-change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("receiptai-theme-change", onChange);
  };
};

export default function TopNav({
  appName,
  email,
  onLogout,
  isLoggingOut = false,
}: Props) {
  const pathname = usePathname();
  const isDark = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => false);

  const applyTheme = (dark: boolean) => {
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  };

  useEffect(() => applyTheme(isDark), [isDark]);

  const toggleTheme = () => {
    const next = !isDark;
    localStorage.setItem("theme", next ? "dark" : "light");
    window.dispatchEvent(new Event("receiptai-theme-change"));
  };

  return (
    <nav className="mt-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/95 px-4 py-4 shadow-md shadow-slate-200/40 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-none">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/"
          className="text-2xl font-semibold text-slate-950 dark:text-slate-50"
        >
          {appName}
        </Link>

        <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-end">
          {email ? (
            <Link
              href="/profile"
              className="min-w-0 flex-1 truncate text-sm text-slate-600 hover:underline dark:text-slate-400 sm:flex-none"
            >
              {email}
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => void onLogout()}
            disabled={isLoggingOut}
            className={`shrink-0 cursor-pointer rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800 dark:text-slate-100 ${
              isLoggingOut ? "" : "hover:bg-slate-800 dark:hover:bg-slate-700"
            }`}
          >
            {isLoggingOut ? "Signing out..." : "Sign out"}
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="shrink-0 cursor-pointer rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {isDark ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                active
                  ? "bg-slate-950 text-white dark:bg-slate-800 dark:text-slate-100"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
