"use client";

import { FirebaseError } from "firebase/app";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  BadgeCheck,
  BanknoteArrowDown,
  BanknoteArrowUp,
  ChartLine,
} from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import Modal from "@/components/Modal";
import ReceiptFormModal from "@/components/ReceiptFormModal";
import ReceiptTable from "@/components/ReceiptTable";
import TopNav from "@/components/TopNav";
import { auth, db } from "@/firebaseConfig";
import type { ReceiptRow } from "@/types/receipt";
import { formatSek } from "@/utils/format";
import { createEmptyRow, normalizeAIParsed, toFirestoreItem } from "@/utils/receipt";

export default function DashboardClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [aiSuccessMessage, setAiSuccessMessage] = useState("");
  const [receiptText, setReceiptText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [parseTouched, setParseTouched] = useState(false);
  const [isRowsLoading, setIsRowsLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingRow, setEditingRow] = useState<ReceiptRow | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingRow, setDeletingRow] = useState<ReceiptRow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState<ReceiptRow | null>(null);
  const [signOutOpen, setSignOutOpen] = useState(false);

  const receiptsCollection = useMemo(() => collection(db, "items"), []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (!currentUser) {
        router.replace("/auth");
      }
    });
    return unsubscribe;
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const loadUserReceipts = async (uid: string) => {
      try {
        setIsRowsLoading(true);
        const snapshot = await getDocs(
          query(
            receiptsCollection,
            where("userId", "==", uid),
            orderBy("purchaseDate", "desc"),
          ),
        );
        const loadedRows = snapshot.docs.map((docItem) => {
          const data = docItem.data();
          return {
            id: docItem.id,
            seller: String(data.seller ?? ""),
            itemName: String(data.itemName ?? data.name ?? ""),
            item: String(data.item ?? data.name ?? ""),
            purchaseDate: String(data.purchaseDate ?? ""),
            platform: String(data.platform ?? ""),
            purchasePrice: String(data.purchasePrice ?? ""),
            totalPrice: String(data.totalPrice ?? ""),
            itemPrice: String(data.itemPrice ?? ""),
            shipping: String(data.shipping ?? ""),
            buyerProtectionFee: String(data.buyerProtectionFee ?? ""),
            paymentMethod: String(data.paymentMethod ?? ""),
            transactionId: String(data.transactionId ?? ""),
            sold: Boolean(data.sold ?? data.status === "sold"),
            soldDate: String(data.soldDate ?? data.sellingDate ?? ""),
            soldPrice: String(data.soldPrice ?? data.sellingPrice ?? ""),
            soldPlatform: String(data.soldPlatform ?? ""),
            soldReceiptText: String(data.soldReceiptText ?? data.sellingReceiptText ?? ""),
            notes: String(data.notes ?? ""),
          } as ReceiptRow;
        });
        setRows(loadedRows);
      } catch (error: unknown) {
        const loadError = error as FirebaseError;
        const message = loadError.message ?? "Unknown error";
        const code = loadError.code ? ` (${loadError.code})` : "";
        setStatusMessage(`Unable to load saved receipts from Firebase${code}: ${message}`);
      } finally {
        setIsRowsLoading(false);
      }
    };

    void loadUserReceipts(user.uid);
  }, [user, receiptsCollection]);

  const saveRowToFirestore = async (row: ReceiptRow) => {
    if (!user) return;
    await setDoc(doc(receiptsCollection, row.id), toFirestoreItem(row, user.uid), {
      merge: true,
    });
  };

  const handleSaveModal = async (row: ReceiptRow) => {
    setStatusMessage("");
    setIsSavingItem(true);
    try {
      await saveRowToFirestore(row);
      if (formMode === "create") {
        setRows((current) => [row, ...current]);
      } else {
        setRows((current) => current.map((item) => (item.id === row.id ? row : item)));
      }
      setFormOpen(false);
      setEditingRow(null);
    } catch (error: unknown) {
      const saveError = error as FirebaseError;
      const message = saveError.message ?? "Unknown error";
      const code = saveError.code ? ` (${saveError.code})` : "";
      setStatusMessage(`Unable to save to Firebase${code}: ${message}`);
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
      setStatusMessage(`Unable to delete from Firebase${code}: ${message}`);
    } finally {
      setIsDeletingItem(false);
    }
  };

  const handleParseWithAI = async () => {
    setParseTouched(true);
    setAiSuccessMessage("");
    if (!receiptText.trim()) {
      return;
    }

    setAiLoading(true);
    setStatusMessage("");

    try {
      const response = await fetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: receiptText }),
      });
      const result = await response.json();

      if (!response.ok) {
        setStatusMessage(result.error ?? "Google AI parse failed.");
        return;
      }

      const aiResult = result.parsed;
      const parsed: ReceiptRow[] = aiResult
        ? Array.isArray(aiResult)
          ? (aiResult as unknown[]).map(normalizeAIParsed)
          : [normalizeAIParsed(aiResult)]
        : [];

      if (!parsed.length) {
        setStatusMessage(
          "Google AI returned no structured items. Try a clearer receipt.",
        );
        return;
      }

      if (user) {
        await Promise.all(parsed.map((row) => saveRowToFirestore(row)));
      }
      setRows((current) => [...parsed, ...current]);
      setAiSuccessMessage("Google AI parsed receipt into table rows.");
      setReceiptText("");
      setParseTouched(false);
    } catch {
      setStatusMessage("Google AI request failed. Check your API key and server logs.");
    } finally {
      setAiLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormMode("create");
    setEditingRow(createEmptyRow());
    setFormOpen(true);
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

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut(auth);
    router.replace("/auth");
  };

  if (!authReady) {
    return <LoadingSpinner fullPage size={48} hideLabel />;
  }

  if (!user) {
    return <LoadingSpinner fullPage size={48} hideLabel />;
  }

  const totalSpent = rows.reduce((sum, row) => sum + (Number(row.purchasePrice) || 0), 0);
  const totalEarned = rows.reduce((sum, row) => sum + (Number(row.soldPrice) || 0), 0);
  const profit = totalEarned - totalSpent;
  const parseError = parseTouched && !receiptText.trim();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <TopNav
          appName="ReceiptAI"
          email={user.email}
          onLogout={() => setSignOutOpen(true)}
          isLoggingOut={isLoggingOut}
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Sold items</p>
              <BadgeCheck className="h-5 w-5 text-blue-600" />
            </div>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {isRowsLoading ? "-" : rows.filter((row) => row.sold).length}
            </p>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Current inventory</p>
              <Archive className="h-5 w-5 text-purple-600" />
            </div>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {isRowsLoading ? "-" : rows.filter((row) => !row.sold).length}
            </p>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Total spent</p>
              <BanknoteArrowDown className="h-5 w-5 text-orange-600" />
            </div>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {isRowsLoading ? "-" : formatSek(totalSpent)}
            </p>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Total earned</p>
              <BanknoteArrowUp className="h-5 w-5 text-blue-600" />
            </div>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {isRowsLoading ? "-" : formatSek(totalEarned)}
            </p>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Profit</p>
              <ChartLine
                className={`h-5 w-5 ${profit >= 0 ? "text-emerald-600" : "text-rose-700"}`}
              />
            </div>
            <p
              className={`mt-2 text-3xl font-semibold ${
                profit >= 0 ? "text-emerald-600" : "text-rose-700"
              }`}
            >
              {isRowsLoading ? "-" : formatSek(profit)}
            </p>
          </div>
        </div>

        <section className="mt-10 space-y-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">Paste purchase receipt</h2>
            <p className="mt-2 text-sm text-slate-600">
              Paste your receipt text and let Google AI extract structured item details.
            </p>

            <textarea
              value={receiptText}
              onChange={(event) => {
                setReceiptText(event.target.value);
                setAiSuccessMessage("");
                if (event.target.value.trim()) {
                  setParseTouched(false);
                }
              }}
              rows={10}
              className="mt-4 max-h-80 w-full resize-none overflow-y-auto rounded-3xl border border-slate-300 bg-slate-50 px-4 py-4 text-slate-900 outline-none transition focus:border-slate-900"
              placeholder="Copy in receipt text here..."
              disabled={aiLoading}
            />
            <div className="mt-2 min-h-5">
              {parseError ? (
                <p className="text-sm font-medium text-rose-600">
                  Copy in receipt text before parsing.
                </p>
              ) : null}
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleParseWithAI}
                disabled={aiLoading}
                className="cursor-pointer inline-flex min-w-52 items-center justify-center rounded-2xl bg-blue-950 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {aiLoading ? (
                  <LoadingSpinner label="Parsing with AI..." size={18} />
                ) : (
                  "Parse with Google AI"
                )}
              </button>
            </div>
            <div className="mt-2 min-h-10">
              {aiSuccessMessage ? (
                <p className="inline-flex rounded-xl bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800">
                  {aiSuccessMessage}
                </p>
              ) : null}
            </div>
          </div>

          {isRowsLoading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <LoadingSpinner label="Loading items..." size={24} />
            </div>
          ) : (
            <ReceiptTable
              rows={rows}
              onCreate={openCreateModal}
              onEdit={openEditModal}
              onDelete={requestDelete}
              onShowDetails={showDetails}
            />
          )}
        </section>

        {statusMessage ? (
          <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {statusMessage}
          </p>
        ) : null}
      </div>

      <ReceiptFormModal
        key={`${formMode}-${editingRow?.id ?? "new"}-${formOpen ? "open" : "closed"}`}
        isOpen={formOpen}
        mode={formMode}
        initialRow={editingRow}
        isSaving={isSavingItem}
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

      <Modal
        isOpen={detailsOpen}
        title={detailsRow?.item || "Item details"}
        onClose={() => setDetailsOpen(false)}
      >
        <div className="space-y-4 text-sm">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Bought information
            </p>
            <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-slate-500">Seller</p>
            <p className="font-medium text-slate-900">{detailsRow?.seller || "-"}</p>
          </div>
          <div>
            <p className="text-slate-500">Payment method</p>
            <p className="font-medium text-slate-900">
              {detailsRow?.paymentMethod || "-"}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Item price</p>
            <p className="font-medium text-slate-900">
              {detailsRow?.itemPrice
                ? formatSek(Number(detailsRow.itemPrice) || 0)
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Buyer protection fee</p>
            <p className="font-medium text-slate-900">
              {detailsRow?.buyerProtectionFee
                ? formatSek(Number(detailsRow.buyerProtectionFee) || 0)
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Shipping</p>
            <p className="font-medium text-slate-900">
              {detailsRow?.shipping
                ? formatSek(Number(detailsRow.shipping) || 0)
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Total price</p>
            <p className="font-medium text-slate-900">
              {detailsRow?.totalPrice
                ? formatSek(Number(detailsRow.totalPrice) || 0)
                : detailsRow?.purchasePrice
                  ? formatSek(Number(detailsRow.purchasePrice) || 0)
                  : "-"}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Platform</p>
            <p className="font-medium text-slate-900">{detailsRow?.platform || "-"}</p>
          </div>
            </div>
          </div>

          {detailsRow?.sold ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sold information
            </p>
            <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-slate-500">Sold platform</p>
            <p className="font-medium text-slate-900">{detailsRow?.soldPlatform || "-"}</p>
          </div>
          <div>
            <p className="text-slate-500">Sold price</p>
            <p className="font-medium text-slate-900">
              {detailsRow?.soldPrice ? formatSek(Number(detailsRow.soldPrice) || 0) : "-"}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Sold date</p>
            <p className="font-medium text-slate-900">{detailsRow?.soldDate || "-"}</p>
          </div>
          <div>
            <p className="text-slate-500">Status</p>
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                detailsRow?.sold
                  ? "bg-rose-100 text-rose-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {detailsRow?.sold ? "sold" : "available"}
            </span>
          </div>
            </div>
          </div>
          ) : null}
        </div>
      </Modal>
    </main>
  );
}
