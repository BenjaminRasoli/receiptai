"use client";

import type { ReceiptRow } from "@/types/receipt";
import { formatSek } from "@/utils/format";

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

      <div className="overflow-x-auto">
        <table className="w-full min-w-full table-auto text-sm text-slate-900">
          <thead className="border-b border-slate-200 text-left text-slate-700">
            <tr>
              <th className="whitespace-nowrap px-3 py-3">Item</th>
              <th className="whitespace-nowrap px-3 py-3">Purchase date</th>
              <th className="whitespace-nowrap px-3 py-3">Platform</th>
              <th className="whitespace-nowrap px-3 py-3">Total price</th>
              <th className="whitespace-nowrap px-3 py-3">Sold</th>
              <th className="whitespace-nowrap px-3 py-3">Sold date</th>
              <th className="whitespace-nowrap px-3 py-3">Sold price</th>
              <th className="whitespace-nowrap px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer align-top transition hover:bg-slate-50"
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
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(row);
                      }}
                      className="cursor-pointer rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-200"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(row);
                      }}
                      className="cursor-pointer rounded-2xl bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-200"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
