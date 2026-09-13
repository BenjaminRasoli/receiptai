"use client";

import { signOut } from "firebase/auth";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import TopNav from "@/components/TopNav";
import { auth } from "@/firebaseConfig";
import { useReceipts } from "@/hooks/useReceipts";
import type { ReceiptRow } from "@/types/receipt";
import { formatSek } from "@/utils/format";
import { STATUS_META } from "@/utils/receipt";

type DateSummary = {
  date: string;
  items: ReceiptRow[];
  itemsBought: number;
  spent: number;
  itemsSold: number;
  earned: number;
  profit: number;
};

type SortKey =
  | "date"
  | "itemsBought"
  | "spent"
  | "itemsSold"
  | "earned"
  | "profit";
type SortDir = "asc" | "desc";

export default function SummaryClient() {
  const { router, user, authReady, rows, isRowsLoading, loadError } =
    useReceipts();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut(auth);
    router.replace("/auth");
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const toggleExpanded = (date: string) => {
    setExpandedDates((current) => {
      const next = new Set(current);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const summaries = useMemo<DateSummary[]>(() => {
    const byDate = new Map<string, DateSummary>();

    rows.forEach((row) => {
      const date = row.purchaseDate || "Unknown date";
      const entry = byDate.get(date) ?? {
        date,
        items: [],
        itemsBought: 0,
        spent: 0,
        itemsSold: 0,
        earned: 0,
        profit: 0,
      };

      entry.items.push(row);
      entry.itemsBought += 1;
      entry.spent += Number(row.totalPrice || row.purchasePrice) || 0;

      if (row.status === "sold") {
        entry.itemsSold += 1;
        entry.earned += Number(row.soldPrice) || 0;
      }

      entry.profit = entry.earned - entry.spent;
      byDate.set(date, entry);
    });

    return Array.from(byDate.values());
  }, [rows]);

  const sortedSummaries = useMemo(() => {
    return [...summaries].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "date":
          cmp = a.date.localeCompare(b.date);
          break;
        case "itemsBought":
          cmp = a.itemsBought - b.itemsBought;
          break;
        case "spent":
          cmp = a.spent - b.spent;
          break;
        case "itemsSold":
          cmp = a.itemsSold - b.itemsSold;
          break;
        case "earned":
          cmp = a.earned - b.earned;
          break;
        case "profit":
          cmp = a.profit - b.profit;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [summaries, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col)
      return <ArrowUpDown className="inline ml-1 h-3 w-3 text-slate-400" />;
    return sortDir === "asc" ? (
      <ArrowUp className="inline ml-1 h-3 w-3 text-slate-700 dark:text-slate-300" />
    ) : (
      <ArrowDown className="inline ml-1 h-3 w-3 text-slate-700 dark:text-slate-300" />
    );
  };

  if (!authReady || !user) {
    return <LoadingSpinner fullPage size={48} hideLabel />;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <TopNav
          appName="ReceiptAI"
          email={user.email}
          onLogout={() => setSignOutOpen(true)}
          isLoggingOut={isLoggingOut}
        />

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="px-2 text-2xl font-semibold dark:text-slate-50">
            Summary by purchase date
          </h2>
          <p className="mt-1 px-2 text-sm text-slate-600 dark:text-slate-400">
            Everything bought on a date, what it cost, what&apos;s sold from
            that batch so far, and the resulting profit. Click a row to see the
            items.
          </p>

          {loadError ? (
            <p className="mx-2 mt-4 inline-flex rounded-xl bg-rose-100 px-4 py-2 text-sm font-medium text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
              {loadError}
            </p>
          ) : null}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-full table-auto text-sm text-slate-900 dark:text-slate-100">
              <thead className="text-left text-slate-700 dark:text-slate-300">
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="whitespace-nowrap px-3 py-3" />
                  <th
                    className="whitespace-nowrap px-3 py-3 cursor-pointer select-none hover:text-slate-950 dark:hover:text-slate-50"
                    onClick={() => handleSort("date")}
                  >
                    Date <SortIcon col="date" />
                  </th>
                  <th
                    className="whitespace-nowrap px-3 py-3 cursor-pointer select-none hover:text-slate-950 dark:hover:text-slate-50"
                    onClick={() => handleSort("itemsBought")}
                  >
                    Items bought <SortIcon col="itemsBought" />
                  </th>
                  <th
                    className="whitespace-nowrap px-3 py-3 cursor-pointer select-none hover:text-slate-950 dark:hover:text-slate-50"
                    onClick={() => handleSort("spent")}
                  >
                    Spent <SortIcon col="spent" />
                  </th>
                  <th
                    className="whitespace-nowrap px-3 py-3 cursor-pointer select-none hover:text-slate-950 dark:hover:text-slate-50"
                    onClick={() => handleSort("itemsSold")}
                  >
                    Items sold <SortIcon col="itemsSold" />
                  </th>
                  <th
                    className="whitespace-nowrap px-3 py-3 cursor-pointer select-none hover:text-slate-950 dark:hover:text-slate-50"
                    onClick={() => handleSort("earned")}
                  >
                    Earned <SortIcon col="earned" />
                  </th>
                  <th
                    className="whitespace-nowrap px-3 py-3 cursor-pointer select-none hover:text-slate-950 dark:hover:text-slate-50"
                    onClick={() => handleSort("profit")}
                  >
                    Profit <SortIcon col="profit" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {isRowsLoading ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8">
                      <LoadingSpinner label="Loading summary..." size={24} />
                    </td>
                  </tr>
                ) : sortedSummaries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-slate-400 text-sm"
                    >
                      No items yet.
                    </td>
                  </tr>
                ) : (
                  sortedSummaries.map((s) => {
                    const isExpanded = expandedDates.has(s.date);
                    return (
                      <Fragment key={s.date}>
                        <tr
                          onClick={() => toggleExpanded(s.date)}
                          className="cursor-pointer border-b border-slate-200 align-top transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                        >
                          <td className="whitespace-nowrap px-3 py-3 text-slate-400">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 font-medium">
                            {s.date}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            {s.itemsBought}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            {formatSek(s.spent)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            {s.itemsSold}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            {formatSek(s.earned)}
                          </td>
                          <td
                            className={`whitespace-nowrap px-3 py-3 font-semibold ${
                              s.profit >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {formatSek(s.profit)}
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/30">
                            <td colSpan={7} className="px-3 py-3">
                              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                                <table className="w-full min-w-full table-auto text-sm">
                                  <thead className="text-left text-slate-500 dark:text-slate-400">
                                    <tr className="border-b border-slate-100 dark:border-slate-800">
                                      <th className="whitespace-nowrap px-3 py-2">
                                        Item
                                      </th>
                                      <th className="whitespace-nowrap px-3 py-2">
                                        Status
                                      </th>
                                      <th className="whitespace-nowrap px-3 py-2">
                                        Platform
                                      </th>
                                      <th className="whitespace-nowrap px-3 py-2">
                                        Purchase price
                                      </th>
                                      <th className="whitespace-nowrap px-3 py-2">
                                        Sold price
                                      </th>
                                      <th className="whitespace-nowrap px-3 py-2">
                                        Sold date
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {s.items.map((item) => {
                                      const meta = STATUS_META[item.status];
                                      const price =
                                        Number(
                                          item.totalPrice || item.purchasePrice,
                                        ) || 0;
                                      return (
                                        <tr
                                          key={item.id}
                                          className="border-b border-slate-100 last:border-0 dark:border-slate-800 dark:text-slate-100"
                                        >
                                          <td className="whitespace-nowrap px-3 py-2">
                                            {item.item || "-"}
                                          </td>
                                          <td className="whitespace-nowrap px-3 py-2">
                                            <span
                                              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${meta.badgeClassName}`}
                                            >
                                              {meta.label}
                                            </span>
                                          </td>
                                          <td className="whitespace-nowrap px-3 py-2">
                                            {item.platform || "-"}
                                          </td>
                                          <td className="whitespace-nowrap px-3 py-2">
                                            {price ? formatSek(price) : "-"}
                                          </td>
                                          <td className="whitespace-nowrap px-3 py-2">
                                            {item.soldPrice
                                              ? formatSek(
                                                  Number(item.soldPrice) || 0,
                                                )
                                              : "-"}
                                          </td>
                                          <td className="whitespace-nowrap px-3 py-2">
                                            {item.soldDate || "-"}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={signOutOpen}
        title="Sign out?"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign out"
        confirmVariant="primary"
        isLoading={isLoggingOut}
        onCancel={() => setSignOutOpen(false)}
        onConfirm={() => void handleLogout()}
      />
    </main>
  );
}
