"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import type { ReceiptRow } from "@/types/receipt";
import { createEmptyRow } from "@/utils/receipt";

type Props = {
  isOpen: boolean;
  mode: "create" | "edit";
  initialRow?: ReceiptRow | null;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (row: ReceiptRow) => Promise<void> | void;
};

export default function ReceiptFormModal({
  isOpen,
  mode,
  initialRow,
  isSaving = false,
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<ReceiptRow>(
    initialRow ?? createEmptyRow(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (key: keyof ReceiptRow, value: string | boolean) => {
    // When unchecking "sold", clear all sold-related fields
    if (key === "sold" && value === false) {
      setDraft((current) => ({
        ...current,
        sold: false,
        soldDate: "",
        soldPrice: "",
        soldPlatform: "",
      }));
      setErrors((current) => {
        const next = { ...current };
        delete next.soldDate;
        delete next.soldPrice;
        delete next.soldPlatform;
        return next;
      });
      return;
    }
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!draft.item.trim()) {
      nextErrors.item = "Item is required.";
    }

    const purchasePrice = Number(draft.purchasePrice);
    if (
      !draft.purchasePrice.trim() ||
      Number.isNaN(purchasePrice) ||
      purchasePrice <= 0
    ) {
      nextErrors.purchasePrice = "Purchase price must be greater than 0.";
    }

    if (draft.sold) {
      const soldPrice = Number(draft.soldPrice);
      if (
        !draft.soldPrice.trim() ||
        Number.isNaN(soldPrice) ||
        soldPrice <= 0
      ) {
        nextErrors.soldPrice = "Sold price must be greater than 0.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  return (
    <Modal
      isOpen={isOpen}
      title={mode === "create" ? "Add item" : "Edit item"}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className={`cursor-pointer rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 ${
              isSaving ? "" : "hover:bg-slate-200"
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="receipt-form"
            disabled={isSaving}
            className={`cursor-pointer rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
              isSaving ? "" : "hover:bg-slate-800"
            }`}
          >
            {isSaving
              ? "Saving..."
              : mode === "create"
                ? "Create item"
                : "Save changes"}
          </button>
        </>
      }
    >
      <form
        id="receipt-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!validate()) return;
          void onSave(draft);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-700">
            Item <span className="text-rose-500">*</span>
            <input
              value={draft.item}
              onChange={(event) => updateField("item", event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
            />
            <p className="min-h-4 text-xs font-medium text-rose-600">
              {errors.item ?? ""}
            </p>
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            Seller
            <input
              value={draft.seller}
              onChange={(event) => updateField("seller", event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
            />
            <p className="min-h-4 text-xs font-medium text-rose-600">
              {errors.seller ?? ""}
            </p>
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            Payment method
            <input
              value={draft.paymentMethod}
              onChange={(event) =>
                updateField("paymentMethod", event.target.value)
              }
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
            />
            <p className="min-h-4 text-xs font-medium text-rose-600">
              {errors.paymentMethod ?? ""}
            </p>
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            Platform
            <input
              value={draft.platform}
              onChange={(event) => updateField("platform", event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
            />
            <p className="min-h-4 text-xs font-medium text-rose-600">
              {errors.platform ?? ""}
            </p>
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            Purchase date
            <input
              type="date"
              value={draft.purchaseDate}
              onChange={(event) =>
                updateField("purchaseDate", event.target.value)
              }
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            Purchase price (kr) <span className="text-rose-500">*</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={draft.purchasePrice}
              onChange={(event) =>
                updateField("purchasePrice", event.target.value)
              }
              placeholder="0.00"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
            />
            <p className="min-h-4 text-xs font-medium text-rose-600">
              {errors.purchasePrice ?? ""}
            </p>
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            Item price (kr)
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.itemPrice}
              onChange={(event) => updateField("itemPrice", event.target.value)}
              placeholder="0.00"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
            />
            <p className="min-h-4 text-xs font-medium text-rose-600">
              {errors.itemPrice ?? ""}
            </p>
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            Buyer protection fee (kr)
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.buyerProtectionFee}
              onChange={(event) =>
                updateField("buyerProtectionFee", event.target.value)
              }
              placeholder="0.00"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
            />
            <p className="min-h-4 text-xs font-medium text-rose-600">
              {errors.buyerProtectionFee ?? ""}
            </p>
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            Shipping (kr)
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.shipping}
              onChange={(event) => updateField("shipping", event.target.value)}
              placeholder="0.00"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
            />
            <p className="min-h-4 text-xs font-medium text-rose-600">
              {errors.shipping ?? ""}
            </p>
          </label>
        </div>

        <label className="mt-4 inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={draft.sold}
            onChange={(event) => updateField("sold", event.target.checked)}
          />
          Mark item as sold
        </label>

        {draft.sold ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-700">
              Sold date
              <input
                type="date"
                value={draft.soldDate}
                onChange={(event) =>
                  updateField("soldDate", event.target.value)
                }
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
              />
              <p className="min-h-4 text-xs font-medium text-rose-600">
                {errors.soldDate ?? ""}
              </p>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              Sold price (kr) <span className="text-rose-500">*</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={draft.soldPrice}
                onChange={(event) =>
                  updateField("soldPrice", event.target.value)
                }
                placeholder="0.00"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
              />
              <p className="min-h-4 text-xs font-medium text-rose-600">
                {errors.soldPrice ?? ""}
              </p>
            </label>

            <label className="space-y-1 text-sm text-slate-700 sm:col-span-2">
              Sold platform
              <input
                value={draft.soldPlatform}
                onChange={(event) =>
                  updateField("soldPlatform", event.target.value)
                }
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
              />
              <p className="min-h-4 text-xs font-medium text-rose-600">
                {errors.soldPlatform ?? ""}
              </p>
            </label>
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
