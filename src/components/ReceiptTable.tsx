"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  ChevronDown,
  Search,
  X,
} from "lucide-react";
import type { ItemStatus, ReceiptRow } from "@/types/receipt";
import { getCloudinaryThumbnail } from "@/utils/receiptImage";
import { formatSek } from "@/utils/format";
import { STATUS_META, STATUS_OPTIONS, statusRank } from "@/utils/receipt";

type SortKey =
  | "item"
  | "purchaseDate"
  | "platform"
  | "totalPrice"
  | "status"
  | "soldDate"
  | "soldPrice";
type SortDir = "asc" | "desc";

type Props = {
  rows: ReceiptRow[];
  platformOptions: string[];
  onCreate: () => void;
  onEdit: (row: ReceiptRow) => void;
  onDelete: (row: ReceiptRow) => void;
  onShowDetails: (row: ReceiptRow) => void;
};

const getTotal = (row: ReceiptRow) =>
  Number(row.totalPrice || row.purchasePrice) || 0;

export default function ReceiptTable({
  rows,
  platformOptions,
  onCreate,
  onEdit,
  onDelete,
  onShowDetails,
}: Props) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("purchaseDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [statusFilter, setStatusFilter] = useState<Set<ItemStatus>>(new Set());
  const [platformFilter, setPlatformFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const toggleStatusFilter = (status: ItemStatus) => {
    setStatusFilter((current) => {
      const next = new Set(current);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setStatusFilter(new Set());
    setPlatformFilter("");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters =
    statusFilter.size > 0 || platformFilter || dateFrom || dateTo;

  const preStatusFiltered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((row) => {
      if (q) {
        const matchesSearch =
          (row.item || "").toLowerCase().includes(q) ||
          (row.platform || "").toLowerCase().includes(q) ||
          (row.purchaseDate || "").includes(q);
        if (!matchesSearch) return false;
      }

      if (platformFilter && row.platform !== platformFilter) {
        return false;
      }

      if (dateFrom && row.purchaseDate && row.purchaseDate < dateFrom) {
        return false;
      }
      if (dateTo && row.purchaseDate && row.purchaseDate > dateTo) {
        return false;
      }

      return true;
    });
  }, [rows, search, platformFilter, dateFrom, dateTo]);

  const statusCounts = useMemo(() => {
    const counts: Record<ItemStatus, number> = {
      available: 0,
      on_hold: 0,
      not_for_sale: 0,
      sold: 0,
    };
    preStatusFiltered.forEach((row) => {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
    });
    return counts;
  }, [preStatusFiltered]);

  const filtered = useMemo(() => {
    if (statusFilter.size === 0) return preStatusFiltered;
    return preStatusFiltered.filter((row) => statusFilter.has(row.status));
  }, [preStatusFiltered, statusFilter]);

  const filterSummary = useMemo(() => {
    const itemsCount = filtered.length;
    const spent = filtered.reduce((sum, row) => sum + getTotal(row), 0);
    const soldItems = filtered.filter((row) => row.status === "sold");
    const earned = soldItems.reduce(
      (sum, row) => sum + (Number(row.soldPrice) || 0),
      0,
    );
    return {
      itemsCount,
      spent,
      earned,
      profit: earned - spent,
      soldCount: soldItems.length,
    };
  }, [filtered]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;

      switch (sortKey) {
        case "status":
          cmp = statusRank(a.status) - statusRank(b.status);
          break;
        case "totalPrice":
          cmp = getTotal(a) - getTotal(b);
          break;
        case "soldPrice":
          cmp = (Number(a.soldPrice) || 0) - (Number(b.soldPrice) || 0);
          break;
        default: {
          const av = (a[sortKey] ?? "").toString();
          const bv = (b[sortKey] ?? "").toString();
          cmp = av.localeCompare(bv);
        }
      }

      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col)
      return <ArrowUpDown className="inline ml-1 h-3 w-3 text-slate-400" />;
    return sortDir === "asc" ? (
      <ArrowUp className="inline ml-1 h-3 w-3 text-slate-700 dark:text-slate-300" />
    ) : (
      <ArrowDown className="inline ml-1 h-3 w-3 text-slate-700 dark:text-slate-300" />
    );
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold dark:text-slate-50">
            Receipt items
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Add, edit, and remove items using the modal form.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="cursor-pointer inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto sm:px-6 sm:py-3 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          Add item manually
        </button>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by item name, platform, or date…"
          className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400 dark:focus:bg-slate-800"
        />
      </div>

      <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50 sm:p-3">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 sm:hidden"
        >
          <span className="inline-flex items-center gap-1.5">
            Filters
            {hasActiveFilters ? (
              <span className="inline-flex h-2 w-2 rounded-full bg-slate-900 dark:bg-slate-100" />
            ) : null}
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              filtersOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        <div
          className={`${
            filtersOpen ? "flex" : "hidden"
          } flex-col gap-3 px-4 pb-4 sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:px-0 sm:pb-0`}
        >
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((option) => {
              const active = statusFilter.has(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleStatusFilter(option.value)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "bg-white text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
                  }`}
                >
                  {option.label} ({statusCounts[option.value] ?? 0})
                </button>
              );
            })}
          </div>

          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:focus:border-slate-400"
          >
            <option value="">All platforms</option>
            {platformOptions.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>

          <div className="flex sm:w-1/2 min-w-0 flex-col gap-1">
            <span className="inline-flex items-center gap-1 py-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Calendar className="h-3.5 w-3.5" />
              Purchased
            </span>

            <div className="flex w-full min-w-0 flex-nowrap items-center gap-1.5">
              <label className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900">
                <span className="whitespace-nowrap text-xs text-slate-400 dark:text-slate-500">
                  From
                </span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full min-w-0 border-0 bg-transparent p-0 text-xs text-slate-700 outline-none dark:text-slate-300"
                  style={{ colorScheme: "light dark" }}
                />
              </label>

              <span className="text-xs text-slate-400 dark:text-slate-500">
                –
              </span>

              <label className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900">
                <span className="whitespace-nowrap text-xs text-slate-400 dark:text-slate-500">
                  To
                </span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full min-w-0 border-0 bg-transparent p-0 text-xs text-slate-700 outline-none dark:text-slate-300"
                  style={{ colorScheme: "light dark" }}
                />
              </label>
            </div>
          </div>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800 sm:ml-auto"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-x-3 gap-y-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-800/50 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-1">
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {filterSummary.itemsCount} item
          {filterSummary.itemsCount === 1 ? "" : "s"}
        </span>
        <span className="text-slate-500 dark:text-slate-400">
          Spent:{" "}
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {formatSek(filterSummary.spent)}
          </span>
        </span>
        <span
          className={`font-semibold ${
            filterSummary.profit >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}
        >
          Profit: {formatSek(filterSummary.profit)}
        </span>
        <span className="text-slate-500 dark:text-slate-400">
          Earned ({filterSummary.soldCount} sold):{" "}
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {formatSek(filterSummary.earned)}
          </span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-full table-auto text-sm text-slate-900 dark:text-slate-100">
          <thead className="text-left text-slate-700 dark:text-slate-300">
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="whitespace-nowrap px-3 py-3">Icon</th>
              <th
                className="whitespace-nowrap px-3 py-3 cursor-pointer select-none hover:text-slate-950 focus:outline-none active:bg-transparent dark:hover:text-slate-50"
                onClick={() => handleSort("item")}
              >
                Item <SortIcon col="item" />
              </th>
              <th
                className="whitespace-nowrap px-3 py-3 cursor-pointer select-none hover:text-slate-950 focus:outline-none active:bg-transparent dark:hover:text-slate-50"
                onClick={() => handleSort("purchaseDate")}
              >
                Purchase date <SortIcon col="purchaseDate" />
              </th>
              <th
                className="whitespace-nowrap px-3 py-3 cursor-pointer select-none hover:text-slate-950 focus:outline-none active:bg-transparent dark:hover:text-slate-50"
                onClick={() => handleSort("platform")}
              >
                Platform <SortIcon col="platform" />
              </th>
              <th
                className="whitespace-nowrap px-3 py-3 cursor-pointer select-none hover:text-slate-950 focus:outline-none active:bg-transparent dark:hover:text-slate-50"
                onClick={() => handleSort("totalPrice")}
              >
                Total price <SortIcon col="totalPrice" />
              </th>
              <th
                className="whitespace-nowrap px-3 py-3 cursor-pointer select-none hover:text-slate-950 focus:outline-none active:bg-transparent dark:hover:text-slate-50"
                onClick={() => handleSort("status")}
              >
                Status <SortIcon col="status" />
              </th>
              <th
                className="whitespace-nowrap px-3 py-3 cursor-pointer select-none hover:text-slate-950 focus:outline-none active:bg-transparent dark:hover:text-slate-50"
                onClick={() => handleSort("soldDate")}
              >
                Sold date <SortIcon col="soldDate" />
              </th>
              <th
                className="whitespace-nowrap px-3 py-3 cursor-pointer select-none hover:text-slate-950 focus:outline-none active:bg-transparent dark:hover:text-slate-50"
                onClick={() => handleSort("soldPrice")}
              >
                Sold price <SortIcon col="soldPrice" />
              </th>
              <th className="whitespace-nowrap px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-8 text-center text-slate-400 text-sm"
                >
                  {search || hasActiveFilters
                    ? "No items match your search or filters."
                    : "No items yet."}
                </td>
              </tr>
            ) : (
              sorted.map((row) => {
                const statusMeta = STATUS_META[row.status];
                return (
                  <tr
                    key={row.id}
                    className="cursor-pointer align-top transition hover:bg-slate-50 border-b border-slate-200 dark:border-slate-800 dark:hover:bg-slate-800/50"
                    style={{
                      contentVisibility: "auto",
                      containIntrinsicSize: "0 56px",
                    }}
                    onClick={() => onShowDetails(row)}
                  >
                    <td className="whitespace-nowrap px-3 py-3">
                      {row.imageUrl ? (
                        <img
                          src={getCloudinaryThumbnail(row.imageUrl, 80)}
                          alt={row.item}
                          width={40}
                          height={40}
                          loading="lazy"
                          decoding="async"
                          className="h-10 w-10 rounded-lg object-cover bg-slate-100 dark:bg-slate-800"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800" />
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className="block max-w-50 truncate rounded-lg px-2 py-1 text-slate-900 dark:text-slate-100">
                        {row.item || "-"}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-3 py-3">
                      {row.purchaseDate || "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {row.platform || "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {getTotal(row) ? formatSek(getTotal(row)) : "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusMeta.badgeClassName}`}
                      >
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {row.soldDate || "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {row.soldPrice || "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(row);
                          }}
                          className="cursor-pointer rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(row);
                          }}
                          className="cursor-pointer rounded-2xl bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-950"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
