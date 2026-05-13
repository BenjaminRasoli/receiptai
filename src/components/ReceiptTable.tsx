"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import type { ReceiptRow } from "@/types/receipt";
import { formatSek } from "@/utils/format";

type SortKey = "item" | "purchaseDate" | "soldDate" | "status";
type SortDir = "asc" | "desc";

type Props = {
  rows: ReceiptRow[];
  onCreate: () => void;
  onEdit: (row: ReceiptRow) => void;
  onDelete: (row: ReceiptRow) => void;
  onShowDetails: (row: ReceiptRow) => void;
};

export default function ReceiptTable({
  rows,
  onCreate,
  onEdit,
  onDelete,
  onShowDetails,
}: Props) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("purchaseDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter(
      (row) =>
        !q ||
        (row.item || "").toLowerCase().includes(q) ||
        (row.platform || "").toLowerCase().includes(q) ||
        (row.purchaseDate || "").includes(q),
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortKey === "status") {
        const av = a.sold ? 1 : 0;
        const bv = b.sold ? 1 : 0;

        return sortDir === "asc" ? av - bv : bv - av;
      }

      const av = (a[sortKey] ?? "").toString();
      const bv = (b[sortKey] ?? "").toString();

      const cmp = av.localeCompare(bv);

      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col)
      return <ArrowUpDown className="inline ml-1 h-3 w-3 text-slate-400" />;
    return sortDir === "asc" ? (
      <ArrowUp className="inline ml-1 h-3 w-3 text-slate-700" />
    ) : (
      <ArrowDown className="inline ml-1 h-3 w-3 text-slate-700" />
    );
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Receipt items</h2>
          <p className="mt-1 text-sm text-slate-600">
            Add, edit, and remove items using the modal form.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="cursor-pointer inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto sm:px-6 sm:py-3"
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
          className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-full table-auto text-sm text-slate-900">
          <thead className="text-left text-slate-700">
            <tr className="border-b border-slate-200">
              <th
                className="whitespace-nowrap px-3 py-3 cursor-pointer select-none hover:text-slate-950 focus:outline-none active:bg-transparent"
                onClick={() => handleSort("item")}
              >
                Item <SortIcon col="item" />
              </th>
              <th
                className="whitespace-nowrap px-3 py-3 cursor-pointer select-none hover:text-slate-950 focus:outline-none active:bg-transparent"
                onClick={() => handleSort("purchaseDate")}
              >
                Purchase date <SortIcon col="purchaseDate" />
              </th>
              <th className="whitespace-nowrap px-3 py-3">Platform</th>
              <th className="whitespace-nowrap px-3 py-3">Total price</th>
              <th
                className="whitespace-nowrap px-3 py-3 cursor-pointer select-none hover:text-slate-950 focus:outline-none active:bg-transparent"
                onClick={() => handleSort("status")}
              >
                Sold <SortIcon col="status" />
              </th>
              <th
                className="whitespace-nowrap px-3 py-3 cursor-pointer select-none hover:text-slate-950 focus:outline-none active:bg-transparent"
                onClick={() => handleSort("soldDate")}
              >
                Sold date <SortIcon col="soldDate" />
              </th>
              <th className="whitespace-nowrap px-3 py-3">Sold price</th>
              <th className="whitespace-nowrap px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-8 text-center text-slate-400 text-sm"
                >
                  {search ? "No items match your search." : "No items yet."}
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer align-top transition hover:bg-slate-50 border-b border-slate-200"
                  onClick={() => onShowDetails(row)}
                >
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className="rounded-lg px-2 py-1 text-slate-900">
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
                    {row.purchasePrice
                      ? formatSek(Number(row.purchasePrice) || 0)
                      : "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        row.sold
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {row.sold ? "Sold" : "Available"}
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
                        className="cursor-pointer rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(row);
                        }}
                        className="cursor-pointer rounded-2xl bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-200"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
