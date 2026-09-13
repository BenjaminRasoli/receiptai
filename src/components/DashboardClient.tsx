"use client";

import { FirebaseError } from "firebase/app";
import { signOut } from "firebase/auth";
import { doc, deleteDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  BadgeCheck,
  BanknoteArrowDown,
  BanknoteArrowUp,
  ChartLine,
  ChevronDown,
} from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import Modal from "@/components/Modal";
import ReceiptFormModal from "@/components/ReceiptFormModal";
import ReceiptTable from "@/components/ReceiptTable";
import TopNav from "@/components/TopNav";
import { auth } from "@/firebaseConfig";
import { useReceipts } from "@/hooks/useReceipts";
import type { ReceiptRow } from "@/types/receipt";
import { formatSek } from "@/utils/format";
import { createEmptyRow, normalizeAIParsed } from "@/utils/receipt";
import InventoryChat from "./InventoryChat";

export default function DashboardClient() {
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

  const [purchaseStatusMessage, setPurchaseStatusMessage] = useState("");
  const [aiSuccessMessage, setAiSuccessMessage] = useState("");
  const [receiptText, setReceiptText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [parseTouched, setParseTouched] = useState(false);

  const [soldStatusMessage, setSoldStatusMessage] = useState("");
  const [soldAiSuccessMessage, setSoldAiSuccessMessage] = useState("");
  const [soldReceiptText, setSoldReceiptText] = useState("");
  const [soldAiLoading, setSoldAiLoading] = useState(false);
  const [soldParseTouched, setSoldParseTouched] = useState(false);
  const [soldConfirmOpen, setSoldConfirmOpen] = useState(false);
  const [pendingSoldItems, setPendingSoldItems] = useState<ReceiptRow[]>([]);
  const [purchaseSectionOpen, setPurchaseSectionOpen] = useState(false);
  const [soldSectionOpen, setSoldSectionOpen] = useState(false);

  const [matchExistingOpen, setMatchExistingOpen] = useState(false);
  const [parsedSoldData, setParsedSoldData] = useState<ReceiptRow | null>(null);
  const [selectedExistingId, setSelectedExistingId] = useState<string>("");
  const [matchLinkError, setMatchLinkError] = useState("");
  const [matchSoldPriceError, setMatchSoldPriceError] = useState("");

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingRow, setEditingRow] = useState<ReceiptRow | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingRow, setDeletingRow] = useState<ReceiptRow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState<ReceiptRow | null>(null);
  const [signOutOpen, setSignOutOpen] = useState(false);

  useEffect(() => {
    if (loadError) setPurchaseStatusMessage(loadError);
  }, [loadError]);

  const inventoryItems = useMemo(() => rows.filter((row) => !row.sold), [rows]);

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

  const handleSaveModal = async (row: ReceiptRow) => {
    setPurchaseStatusMessage("");
    setIsSavingItem(true);
    try {
      await saveRowToFirestore(row);
      if (formMode === "create") {
        setRows((current) => [row, ...current]);
      } else {
        setRows((current) =>
          current.map((item) => (item.id === row.id ? row : item)),
        );
      }
      setFormOpen(false);
      setEditingRow(null);
    } catch (error: unknown) {
      const saveError = error as FirebaseError;
      const message = saveError.message ?? "Unknown error";
      const code = saveError.code ? ` (${saveError.code})` : "";
      setPurchaseStatusMessage(`Unable to save to Firebase${code}: ${message}`);
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
      setPurchaseStatusMessage(
        `Unable to delete from Firebase${code}: ${message}`,
      );
    } finally {
      setIsDeletingItem(false);
    }
  };

  const handleParseWithAI = async () => {
    setParseTouched(true);
    setAiSuccessMessage("");
    setPurchaseStatusMessage("");
    if (!receiptText.trim()) {
      return;
    }

    setAiLoading(true);

    try {
      const response = await fetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: receiptText }),
      });
      const result = await response.json();

      if (!response.ok) {
        setPurchaseStatusMessage(result.error ?? "Google AI parse failed.");
        return;
      }

      const aiResult = result.parsed;
      const parsed: ReceiptRow[] = aiResult
        ? Array.isArray(aiResult)
          ? (aiResult as unknown[]).map(normalizeAIParsed)
          : [normalizeAIParsed(aiResult)]
        : [];

      if (!parsed.length) {
        setPurchaseStatusMessage(
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
      setPurchaseStatusMessage(
        "Google AI request failed. Check your API key and server logs.",
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleParseSoldWithAI = async () => {
    setSoldParseTouched(true);
    setSoldAiSuccessMessage("");
    setSoldStatusMessage("");
    if (!soldReceiptText.trim()) {
      return;
    }

    setSoldAiLoading(true);

    try {
      const response = await fetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: soldReceiptText }),
      });
      const result = await response.json();

      if (!response.ok) {
        setSoldStatusMessage(result.error ?? "Google AI parse failed.");
        return;
      }

      const aiResult = result.parsed;
      const firstParsed = aiResult
        ? Array.isArray(aiResult)
          ? normalizeAIParsed((aiResult as unknown[])[0])
          : normalizeAIParsed(aiResult)
        : null;

      if (!firstParsed) {
        setSoldStatusMessage(
          "Google AI returned no structured items. Try a clearer receipt.",
        );
        return;
      }

      const soldParsed: ReceiptRow = {
        ...firstParsed,
        status: "sold",
        sold: true,
        soldDate:
          firstParsed.soldDate || new Date().toISOString().split("T")[0],
        soldPrice: firstParsed.soldPrice || firstParsed.purchasePrice || "",
        soldPlatform: firstParsed.soldPlatform || firstParsed.platform || "",
      };
      setParsedSoldData(soldParsed);
      setSelectedExistingId(inventoryItems[0]?.id ?? "");
      setMatchLinkError("");
      setMatchSoldPriceError("");
      setMatchExistingOpen(true);
      setSoldReceiptText("");
      setSoldParseTouched(false);
    } catch {
      setSoldStatusMessage(
        "Google AI request failed. Check your API key and server logs.",
      );
    } finally {
      setSoldAiLoading(false);
    }
  };

  const handleMatchExistingConfirm = async () => {
    if (!parsedSoldData) return;
    let hasError = false;

    if (!selectedExistingId) {
      setMatchLinkError(
        "Please select an inventory item to link this sale to.",
      );
      hasError = true;
    }

    const soldPriceNum = Number(parsedSoldData.soldPrice);
    if (
      !parsedSoldData.soldPrice.trim() ||
      Number.isNaN(soldPriceNum) ||
      soldPriceNum <= 0
    ) {
      setMatchSoldPriceError("Sold price must be greater than 0.");
      hasError = true;
    }

    if (hasError) return;

    setIsSavingItem(true);
    setMatchLinkError("");
    setMatchSoldPriceError("");

    try {
      const existingRow = rows.find((r) => r.id === selectedExistingId);
      if (!existingRow) throw new Error("Item not found");
      const updatedRow: ReceiptRow = {
        ...existingRow,
        status: "sold",
        sold: true,
        soldDate: parsedSoldData.soldDate,
        soldPrice: parsedSoldData.soldPrice,
        soldPlatform: parsedSoldData.soldPlatform,
        soldReceiptText: parsedSoldData.soldReceiptText,
      };
      await saveRowToFirestore(updatedRow);
      setRows((current) =>
        current.map((r) => (r.id === selectedExistingId ? updatedRow : r)),
      );
      setSoldAiSuccessMessage(
        `"${existingRow.item}" marked as sold for ${formatSek(Number(parsedSoldData.soldPrice) || 0)}.`,
      );

      setMatchExistingOpen(false);
      setParsedSoldData(null);
    } catch (error: unknown) {
      const saveError = error as FirebaseError;
      const message = saveError.message ?? "Unknown error";
      const code = saveError.code ? ` (${saveError.code})` : "";
      setSoldStatusMessage(`Unable to save to Firebase${code}: ${message}`);
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleSoldConfirm = async (confirmedItems: ReceiptRow[]) => {
    if (!user) return;

    setIsSavingItem(true);
    try {
      await Promise.all(confirmedItems.map((row) => saveRowToFirestore(row)));
      setRows((current) => [...confirmedItems, ...current]);
      setSoldAiSuccessMessage(
        `Marked ${confirmedItems.length} item(s) as sold.`,
      );
      setSoldConfirmOpen(false);
      setPendingSoldItems([]);
    } catch (error: unknown) {
      const saveError = error as FirebaseError;
      const message = saveError.message ?? "Unknown error";
      const code = saveError.code ? ` (${saveError.code})` : "";
      setSoldStatusMessage(`Unable to save to Firebase${code}: ${message}`);
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleSoldConfirmCancel = () => {
    setSoldConfirmOpen(false);
    setPendingSoldItems([]);
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

  const totalSpent = rows.reduce(
    (sum, row) => sum + (Number(row.purchasePrice) || 0),
    0,
  );
  const totalEarned = rows.reduce(
    (sum, row) => sum + (Number(row.soldPrice) || 0),
    0,
  );
  const profit = totalEarned - totalSpent;
  const parseError = parseTouched && !receiptText.trim();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <TopNav
          appName="ReceiptAI"
          email={user.email}
          onLogout={() => setSignOutOpen(true)}
          isLoggingOut={isLoggingOut}
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Sold items
              </p>
              <BadgeCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-slate-50">
              {isRowsLoading ? "-" : rows.filter((row) => row.sold).length}
            </p>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Current inventory
              </p>
              <Archive className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-slate-50">
              {isRowsLoading ? "-" : rows.filter((row) => !row.sold).length}
            </p>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Total spent
              </p>
              <BanknoteArrowDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-slate-50">
              {isRowsLoading ? "-" : formatSek(totalSpent)}
            </p>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Total earned
              </p>
              <BanknoteArrowUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-slate-50">
              {isRowsLoading ? "-" : formatSek(totalEarned)}
            </p>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Profit
              </p>
              <ChartLine
                className={`h-5 w-5 ${profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
              />
            </div>
            <p
              className={`mt-2 text-3xl font-semibold ${
                profit >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {isRowsLoading ? "-" : formatSek(profit)}
            </p>
          </div>
        </div>

        <section className="mt-10 space-y-8">
          <InventoryChat rows={rows} />
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <div className="flex flex-col rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setPurchaseSectionOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-3xl px-6 py-6 text-left"
              >
                <div>
                  <h2 className="text-2xl font-semibold dark:text-slate-50">
                    Paste purchase receipt
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Paste your receipt text and let Google AI extract structured
                    item details.
                  </p>
                </div>
                <ChevronDown
                  className={`h-5 w-5 flex-shrink-0 cursor-pointer text-slate-400 transition-transform ${
                    purchaseSectionOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {purchaseSectionOpen ? (
                <div className="flex flex-col px-6 pb-6">
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
                    className="max-h-80 w-full flex-1 resize-none overflow-y-auto rounded-3xl border border-slate-300 bg-slate-50 px-4 py-4 text-slate-900 outline-none transition focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                    placeholder="Copy in receipt text here..."
                    disabled={aiLoading}
                  />
                  <div className="mt-2 h-5">
                    {parseError ? (
                      <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                        Copy in receipt text before parsing.
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={handleParseWithAI}
                      disabled={aiLoading}
                      className="inline-flex min-w-52 cursor-pointer items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-slate-950 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                    >
                      {aiLoading ? (
                        <LoadingSpinner label="Parsing with AI..." size={18} />
                      ) : (
                        "Parse with Google AI"
                      )}
                    </button>
                  </div>
                  <div className="mt-3 h-10">
                    {purchaseStatusMessage && !parseError ? (
                      <p className="inline-flex rounded-xl bg-rose-100 px-4 py-2 text-sm font-medium text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                        {purchaseStatusMessage}
                      </p>
                    ) : aiSuccessMessage ? (
                      <p className="inline-flex rounded-xl bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                        {aiSuccessMessage}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setSoldSectionOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-3xl px-6 py-6 text-left"
              >
                <div>
                  <h2 className="text-2xl font-semibold dark:text-slate-50">
                    Paste sold receipt
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Paste your sold item receipt and let Google AI extract the
                    sale details.
                  </p>
                </div>
                <ChevronDown
                  className={`h-5 w-5 flex-shrink-0 cursor-pointer text-slate-400 transition-transform ${
                    soldSectionOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {soldSectionOpen ? (
                <div className="flex flex-col px-6 pb-6">
                  <textarea
                    value={soldReceiptText}
                    onChange={(event) => {
                      setSoldReceiptText(event.target.value);
                      setSoldAiSuccessMessage("");
                      if (event.target.value.trim()) {
                        setSoldParseTouched(false);
                      }
                    }}
                    rows={10}
                    className="max-h-80 w-full flex-1 resize-none overflow-y-auto rounded-3xl border border-slate-300 bg-slate-50 px-4 py-4 text-slate-900 outline-none transition focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                    placeholder="Copy in sold receipt text here..."
                    disabled={soldAiLoading}
                  />
                  <div className="mt-2 h-5">
                    {soldParseTouched && !soldReceiptText.trim() ? (
                      <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                        Copy in receipt text before parsing.
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={handleParseSoldWithAI}
                      disabled={soldAiLoading}
                      className="inline-flex min-w-52 cursor-pointer items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-slate-950 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                    >
                      {soldAiLoading ? (
                        <LoadingSpinner label="Parsing with AI..." size={18} />
                      ) : (
                        "Parse with Google AI"
                      )}
                    </button>
                  </div>
                  <div className="mt-3 h-10">
                    {soldStatusMessage ? (
                      <p className="inline-flex rounded-xl bg-rose-100 px-4 py-2 text-sm font-medium text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                        {soldStatusMessage}
                      </p>
                    ) : soldAiSuccessMessage ? (
                      <p className="inline-flex rounded-xl bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                        {soldAiSuccessMessage}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {isRowsLoading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <LoadingSpinner label="Loading items..." size={24} />
            </div>
          ) : (
            <ReceiptTable
              rows={rows}
              platformOptions={platformOptions}
              onCreate={openCreateModal}
              onEdit={openEditModal}
              onDelete={requestDelete}
              onShowDetails={showDetails}
            />
          )}
        </section>
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
        isOpen={matchExistingOpen}
        title="Link to existing item"
        onClose={() => {
          setMatchExistingOpen(false);
          setParsedSoldData(null);
          setMatchLinkError("");
          setMatchSoldPriceError("");
        }}
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Select an existing inventory item to mark as sold and merge the sale
            details into it.
          </p>

          {parsedSoldData && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-800/50">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Parsed sale details
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    Sold Price (SEK) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={parsedSoldData.soldPrice}
                    onChange={(e) => {
                      setParsedSoldData((prev) =>
                        prev ? { ...prev, soldPrice: e.target.value } : prev,
                      );
                      if (e.target.value.trim() && Number(e.target.value) > 0) {
                        setMatchSoldPriceError("");
                      }
                    }}
                    className={`w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-400 ${
                      matchSoldPriceError
                        ? "border-rose-400"
                        : "border-slate-300 dark:border-slate-700"
                    }`}
                    placeholder="0"
                  />
                  {matchSoldPriceError && (
                    <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                      {matchSoldPriceError}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    Sold Date
                  </label>
                  <input
                    type="date"
                    value={parsedSoldData.soldDate}
                    onChange={(e) =>
                      setParsedSoldData((prev) =>
                        prev ? { ...prev, soldDate: e.target.value } : prev,
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-400"
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    Platform (optional)
                  </label>
                  <input
                    type="text"
                    value={parsedSoldData.soldPlatform}
                    onChange={(e) =>
                      setParsedSoldData((prev) =>
                        prev ? { ...prev, soldPlatform: e.target.value } : prev,
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-400"
                    placeholder="Tradera, Vinted, eBay, etc."
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Inventory item <span className="text-rose-500">*</span>
            </label>
            {inventoryItems.length > 0 ? (
              <select
                value={selectedExistingId}
                onChange={(e) => {
                  setSelectedExistingId(e.target.value);
                  if (e.target.value) setMatchLinkError("");
                }}
                className="w-full cursor-pointer rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-400"
              >
                <option value="" disabled>
                  — Select an item —
                </option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.item || item.itemName || "Unnamed item"}
                    {item.purchaseDate ? ` · ${item.purchaseDate}` : ""}
                    {item.purchasePrice
                      ? ` · ${formatSek(Number(item.purchasePrice) || 0)}`
                      : ""}
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                No unsold inventory items found. Add a purchase receipt first
                before linking a sale.
              </div>
            )}
            {matchLinkError && (
              <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                {matchLinkError}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setMatchExistingOpen(false);
                setParsedSoldData(null);
                setMatchLinkError("");
                setMatchSoldPriceError("");
              }}
              className="flex-1 cursor-pointer rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleMatchExistingConfirm()}
              disabled={isSavingItem || inventoryItems.length === 0}
              className="flex-1 cursor-pointer rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-slate-950 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
            >
              {isSavingItem ? "Saving..." : "Mark as sold"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={soldConfirmOpen}
        title="Confirm sold item"
        onClose={handleSoldConfirmCancel}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Review and edit the sold item details before confirming.
          </p>
          <div className="max-h-96 space-y-4 overflow-y-auto">
            {pendingSoldItems.map((item, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50"
              >
                <div className="mb-3 flex items-center justify-between">
                  <input
                    type="text"
                    value={item.item}
                    onChange={(e) => {
                      const newItems = [...pendingSoldItems];
                      newItems[index] = {
                        ...newItems[index],
                        item: e.target.value,
                      };
                      setPendingSoldItems(newItems);
                    }}
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-400"
                    placeholder="Item name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                      Sold Price (SEK)
                    </label>
                    <input
                      type="number"
                      value={item.soldPrice}
                      onChange={(e) => {
                        const newItems = [...pendingSoldItems];
                        newItems[index] = {
                          ...newItems[index],
                          soldPrice: e.target.value,
                        };
                        setPendingSoldItems(newItems);
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-400"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                      Sold Date
                    </label>
                    <input
                      type="date"
                      value={item.soldDate}
                      onChange={(e) => {
                        const newItems = [...pendingSoldItems];
                        newItems[index] = {
                          ...newItems[index],
                          soldDate: e.target.value,
                        };
                        setPendingSoldItems(newItems);
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-400"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                      Platform (optional)
                    </label>
                    <input
                      type="text"
                      value={item.soldPlatform}
                      onChange={(e) => {
                        const newItems = [...pendingSoldItems];
                        newItems[index] = {
                          ...newItems[index],
                          soldPlatform: e.target.value,
                        };
                        setPendingSoldItems(newItems);
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-400"
                      placeholder="Tradera, Vinted, eBay, etc."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleSoldConfirmCancel}
              className="flex-1 cursor-pointer rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSoldConfirm(pendingSoldItems)}
              disabled={isSavingItem}
              className="flex-1 cursor-pointer rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-emerald-600"
            >
              {isSavingItem ? "Saving..." : "Confirm Sale"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={detailsOpen}
        title={detailsRow?.item || "Item details"}
        onClose={() => setDetailsOpen(false)}
      >
        <div className="space-y-4 text-sm">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Bought information
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Seller</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {detailsRow?.seller || "-"}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">
                  Payment method
                </p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {detailsRow?.paymentMethod || "-"}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Item price</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {detailsRow?.itemPrice
                    ? formatSek(Number(detailsRow.itemPrice) || 0)
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">
                  Buyer protection fee
                </p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {detailsRow?.buyerProtectionFee
                    ? formatSek(Number(detailsRow.buyerProtectionFee) || 0)
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Shipping</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {detailsRow?.shipping
                    ? formatSek(Number(detailsRow.shipping) || 0)
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">
                  Total price
                </p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {detailsRow?.totalPrice
                    ? formatSek(Number(detailsRow.totalPrice) || 0)
                    : detailsRow?.purchasePrice
                      ? formatSek(Number(detailsRow.purchasePrice) || 0)
                      : "-"}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Platform</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {detailsRow?.platform || "-"}
                </p>
              </div>
            </div>
          </div>

          {detailsRow?.sold ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Sold information
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Sold platform
                  </p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {detailsRow?.soldPlatform || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Sold price
                  </p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {detailsRow?.soldPrice
                      ? formatSek(Number(detailsRow.soldPrice) || 0)
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Sold date
                  </p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {detailsRow?.soldDate || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Status</p>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      detailsRow?.sold
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
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
