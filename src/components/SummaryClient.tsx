"use client";

import { FirebaseError } from "firebase/app";
import { signOut } from "firebase/auth";
import { doc, deleteDoc } from "firebase/firestore";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import Modal from "@/components/Modal";
import ReceiptFormModal from "@/components/ReceiptFormModal";
import ReceiptTable from "@/components/ReceiptTable";
import TopNav from "@/components/TopNav";
import { auth, db } from "@/firebaseConfig";
import { useReceipts } from "@/hooks/useReceipts";
import type { ReceiptRow } from "@/types/receipt";
import { formatSek } from "@/utils/format";
import { STATUS_META, createEmptyRow } from "@/utils/receipt";
import { getCloudinaryThumbnail } from "@/utils/receiptImage";

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
  const {
    router,
    user,
    authReady,
    rows,
    setRows,
    isRowsLoading,
    loadError,
    receiptsCollection,
    saveRowToFirestore,
  } = useReceipts();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [isSavingItem, setIsSavingItem] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("edit");
  const [editingRow, setEditingRow] = useState<ReceiptRow | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingRow, setDeletingRow] = useState<ReceiptRow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState<ReceiptRow | null>(null);
  const [detailsImageLoaded, setDetailsImageLoaded] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut(auth);
    router.replace("/auth");
  };

  const handleSaveModal = async (row: ReceiptRow) => {
    setIsSavingItem(true);
    try {
      await saveRowToFirestore(row);
      setRows((current) =>
        current.map((item) => (item.id === row.id ? row : item)),
      );
      setFormOpen(false);
      setEditingRow(null);
    } catch (error: unknown) {
      const saveError = error as FirebaseError;
      const message = saveError.message ?? "Unknown error";
      const code = saveError.code ? ` (${saveError.code})` : "";
      console.error(`Unable to save to Firebase${code}: ${message}`);
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deletingRow) return;
    setIsDeletingItem(true);
    try {
      await deleteDoc(doc(receiptsCollection, deletingRow.id));
      setRows((current) => current.filter((row) => row.id !== deletingRow.id));
      setDeleteOpen(false);
      setDeletingRow(null);
    } catch (error: unknown) {
      const deleteError = error as FirebaseError;
      const message = deleteError.message ?? "Unknown error";
      const code = deleteError.code ? ` (${deleteError.code})` : "";
      console.error(`Unable to delete from Firebase${code}: ${message}`);
    } finally {
      setIsDeletingItem(false);
    }
  };

  const openEditModal = (row: ReceiptRow) => {
    setFormMode("edit");
    setEditingRow(row);
    setFormOpen(true);
  };

  const requestDelete = (row: ReceiptRow) => {
    setDeletingRow(row);
    setDeleteOpen(true);
  };

  const showDetails = (row: ReceiptRow) => {
    setDetailsRow(row);
    setDetailsOpen(true);
  };

  useEffect(() => {
    setDetailsImageLoaded(false);
  }, [detailsRow?.id]);

  const platformOptions = useMemo(() => {
    const values = new Set<string>();
    rows.forEach((row) => {
      const platform = row.platform.trim();
      const soldPlatform = row.soldPlatform.trim();
      if (platform) values.add(platform);
      if (soldPlatform) values.add(soldPlatform);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const paymentMethodOptions = useMemo(() => {
    const values = new Set<string>();
    rows.forEach((row) => {
      const paymentMethod = row.paymentMethod.trim();
      if (paymentMethod) values.add(paymentMethod);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const openCreateModal = () => {
    setFormMode("create");
    setEditingRow(createEmptyRow());
    setFormOpen(true);
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
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto w-full max-w-500 px-4 py-10 sm:px-6">
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
                              <ReceiptTable
                                rows={s.items}
                                platformOptions={platformOptions}
                                onCreate={openCreateModal}
                                onEdit={openEditModal}
                                onDelete={requestDelete}
                                onShowDetails={showDetails}
                                hideDateFilter={true}
                                hideHeader={true}
                                hidePurchaseDateColumn={true}
                              />
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

      <ReceiptFormModal
        key={`${formMode}-${editingRow?.id ?? "new"}-${formOpen ? "open" : "closed"}`}
        isOpen={formOpen}
        mode={formMode}
        initialRow={editingRow}
        isSaving={isSavingItem}
        platformOptions={platformOptions}
        paymentMethodOptions={paymentMethodOptions}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveModal}
      />

      <ConfirmModal
        isOpen={deleteOpen}
        title="Delete item?"
        message={`This will permanently remove "${deletingRow?.item || "this item"}".`}
        confirmLabel="Delete item"
        isLoading={isDeletingItem}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void handleDeleteConfirmed()}
      />

      <Modal
        isOpen={detailsOpen}
        title={detailsRow?.item || "Item details"}
        onClose={() => setDetailsOpen(false)}
        extraHeaderAction={
          <button
            type="button"
            onClick={() => {
              if (detailsRow) {
                openEditModal(detailsRow);
                setDetailsOpen(false);
              }
            }}
            className="cursor-pointer rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Edit
          </button>
        }
      >
        {detailsRow?.imageUrl ? (
          <div className="relative mb-2 flex h-72 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
            {!detailsImageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-slate-700 dark:border-slate-600 dark:border-t-slate-200" />
              </div>
            )}
            <img
              key={detailsRow.id}
              src={getCloudinaryThumbnail(detailsRow.imageUrl, 900)}
              alt={detailsRow.item}
              fetchPriority="high"
              decoding="async"
              onLoad={() => setDetailsImageLoaded(true)}
              className="h-full w-full object-contain"
            />
          </div>
        ) : null}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Item
              </label>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {detailsRow?.item || "-"}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Status
              </label>
              {detailsRow && (
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${STATUS_META[detailsRow.status].badgeClassName}`}
                >
                  {STATUS_META[detailsRow.status].label}
                </span>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Purchase date
              </label>
              <p className="text-sm text-slate-900 dark:text-slate-100">
                {detailsRow?.purchaseDate || "-"}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Platform
              </label>
              <p className="text-sm text-slate-900 dark:text-slate-100">
                {detailsRow?.platform || "-"}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Purchase price
              </label>
              <p className="text-sm text-slate-900 dark:text-slate-100">
                {detailsRow?.totalPrice || detailsRow?.purchasePrice
                  ? formatSek(
                      Number(detailsRow.totalPrice || detailsRow.purchasePrice) ||
                        0,
                    )
                  : "-"}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Sold date
              </label>
              <p className="text-sm text-slate-900 dark:text-slate-100">
                {detailsRow?.soldDate || "-"}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Sold price
              </label>
              <p className="text-sm text-slate-900 dark:text-slate-100">
                {detailsRow?.soldPrice
                  ? formatSek(Number(detailsRow.soldPrice) || 0)
                  : "-"}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Sold platform
              </label>
              <p className="text-sm text-slate-900 dark:text-slate-100">
                {detailsRow?.soldPlatform || "-"}
              </p>
            </div>
          </div>
          {detailsRow?.soldReceiptText ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Sold receipt text
              </label>
              <p className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                {detailsRow.soldReceiptText}
              </p>
            </div>
          ) : null}
        </div>
      </Modal>

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
