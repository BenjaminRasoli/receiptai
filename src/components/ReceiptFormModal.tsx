"use client";

import { useEffect, useRef, useState, type WheelEvent } from "react";
import Modal from "@/components/Modal";
import type { ItemStatus, ReceiptRow } from "@/types/receipt";
import { applyStatus, createEmptyRow, STATUS_OPTIONS } from "@/utils/receipt";
import EditableSelect from "./Editableselect";
import { uploadReceiptImage } from "@/utils/receiptImage";

type Props = {
  isOpen: boolean;
  mode: "create" | "edit";
  initialRow?: ReceiptRow | null;
  isSaving?: boolean;
  platformOptions: string[];
  paymentMethodOptions: string[];
  onClose: () => void;
  onSave: (row: ReceiptRow) => Promise<void> | void;
};

const getToday = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const selectClassName =
  "w-full cursor-pointer rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400";
const inputClassName =
  "w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400";
const fileInputClassName =
  "h-12 min-w-0 w-full cursor-pointer rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs text-slate-900 outline-none transition file:mr-2 file:cursor-pointer file:rounded-lg file:border-0 file:bg-slate-200 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-300 focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:file:bg-slate-700 dark:file:text-slate-200 dark:hover:file:bg-slate-600 dark:focus:border-slate-400";

const blockWheelChange = (e: WheelEvent<HTMLInputElement>) => {
  e.currentTarget.blur();
};

export default function ReceiptFormModal({
  isOpen,
  mode,
  initialRow,
  isSaving = false,
  platformOptions,
  paymentMethodOptions,
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<ReceiptRow>(() => ({
    ...createEmptyRow(),
    purchaseDate: getToday(),
  }));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (mode === "edit" && initialRow) {
      setDraft(initialRow);
      setImagePreview(initialRow.imageUrl || "");
      setImageFile(null);
      setErrors({});
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setDraft({ ...createEmptyRow(), purchaseDate: getToday() });
    setImagePreview("");
    setImageFile(null);
    setErrors({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [isOpen, mode, initialRow]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (key: keyof ReceiptRow, value: string | boolean) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const updateStatus = (status: ItemStatus) => {
    setDraft((current) => applyStatus(current, status));
    setErrors((current) => ({
      ...current,
      status: "",
      soldDate: "",
      soldPrice: "",
      soldPlatform: "",
    }));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrors((current) => ({ ...current, image: "" }));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    setDraft((current) => ({ ...current, imageUrl: "", imagePublicId: "" }));
    setErrors((current) => ({ ...current, image: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
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

    if (draft.status === "sold") {
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
            disabled={isSaving || isUploadingImage}
            className={`cursor-pointer rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800 dark:text-slate-100 ${
              isSaving || isUploadingImage
                ? ""
                : "hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="receipt-form"
            disabled={isSaving || isUploadingImage}
            className={`cursor-pointer rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800 dark:text-slate-100 ${
              isSaving || isUploadingImage
                ? ""
                : "hover:bg-slate-800 dark:hover:bg-slate-700"
            }`}
          >
            {isUploadingImage
              ? "Uploading photo..."
              : isSaving
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
        onSubmit={async (event) => {
          event.preventDefault();
          if (!validate()) return;

          let finalRow = draft;
          if (imageFile) {
            setIsUploadingImage(true);
            try {
              const { url, publicId } = await uploadReceiptImage(imageFile);
              finalRow = { ...draft, imageUrl: url, imagePublicId: publicId };
            } catch {
              setErrors((current) => ({
                ...current,
                image: "Image upload failed. Try again.",
              }));
              setIsUploadingImage(false);
              return;
            }
            setIsUploadingImage(false);
          }

          void onSave(finalRow);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
            Item <span className="text-rose-500">*</span>
            <input
              value={draft.item}
              onChange={(event) => updateField("item", event.target.value)}
              className={inputClassName}
            />
            <p className="min-h-4 text-xs font-medium text-rose-600 dark:text-rose-400">
              {errors.item ?? ""}
            </p>
          </label>

          <div className="min-w-0 space-y-1 text-sm text-slate-700 dark:text-slate-300">
            <label htmlFor="receipt-image">Photo</label>

            {imagePreview ? (
              <div className="flex min-w-0 gap-3">
                <div className="flex shrink-0 flex-col items-center gap-1">
                  <img
                    src={imagePreview}
                    alt="Item preview"
                    className="h-12 w-12 rounded-xl object-cover border-slate-300 border dark:border-slate-700"
                  />

                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="w-fit cursor-pointer border-0 bg-transparent p-0 text-xs font-semibold leading-none text-rose-600 hover:underline dark:text-rose-400"
                  >
                    Remove
                  </button>
                </div>

                <input
                  id="receipt-image"
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  className={`${fileInputClassName} min-w-0 flex-1`}
                />
              </div>
            ) : (
              <input
                id="receipt-image"
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageChange}
                className={fileInputClassName}
              />
            )}

            <p className="min-h-4 text-xs font-medium text-rose-600 dark:text-rose-400">
              {errors.image ?? ""}
            </p>
          </div>

          <label className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
            Seller
            <input
              value={draft.seller}
              onChange={(event) => updateField("seller", event.target.value)}
              className={inputClassName}
            />
            <p className="min-h-4 text-xs font-medium text-rose-600 dark:text-rose-400">
              {errors.seller ?? ""}
            </p>
          </label>

          <label className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
            Payment method
            <EditableSelect
              value={draft.paymentMethod}
              options={paymentMethodOptions}
              onChange={(value) => updateField("paymentMethod", value)}
              selectClassName={selectClassName}
              inputClassName={inputClassName}
            />
            <p className="min-h-4 text-xs font-medium text-rose-600 dark:text-rose-400">
              {errors.paymentMethod ?? ""}
            </p>
          </label>

          <label className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
            Platform
            <EditableSelect
              value={draft.platform}
              options={platformOptions}
              onChange={(value) => updateField("platform", value)}
              selectClassName={selectClassName}
              inputClassName={inputClassName}
            />
            <p className="min-h-4 text-xs font-medium text-rose-600 dark:text-rose-400">
              {errors.platform ?? ""}
            </p>
          </label>

          <label className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
            Purchase date
            <input
              type="date"
              value={draft.purchaseDate}
              onChange={(event) =>
                updateField("purchaseDate", event.target.value)
              }
              className={inputClassName}
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
            Purchase price (kr) <span className="text-rose-500">*</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              onWheel={blockWheelChange}
              value={draft.purchasePrice}
              onChange={(event) =>
                updateField("purchasePrice", event.target.value)
              }
              placeholder="0.00"
              className={inputClassName}
            />
            <p className="min-h-4 text-xs font-medium text-rose-600 dark:text-rose-400">
              {errors.purchasePrice ?? ""}
            </p>
          </label>

          <label className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
            Item price (kr)
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              onWheel={blockWheelChange}
              value={draft.itemPrice}
              onChange={(event) => updateField("itemPrice", event.target.value)}
              placeholder="0.00"
              className={inputClassName}
            />
            <p className="min-h-4 text-xs font-medium text-rose-600 dark:text-rose-400">
              {errors.itemPrice ?? ""}
            </p>
          </label>

          <label className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
            Buyer protection fee (kr)
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              onWheel={blockWheelChange}
              value={draft.buyerProtectionFee}
              onChange={(event) =>
                updateField("buyerProtectionFee", event.target.value)
              }
              placeholder="0.00"
              className={inputClassName}
            />
            <p className="min-h-4 text-xs font-medium text-rose-600 dark:text-rose-400">
              {errors.buyerProtectionFee ?? ""}
            </p>
          </label>

          <label className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
            Shipping (kr)
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              onWheel={blockWheelChange}
              value={draft.shipping}
              onChange={(event) => updateField("shipping", event.target.value)}
              placeholder="0.00"
              className={inputClassName}
            />
            <p className="min-h-4 text-xs font-medium text-rose-600 dark:text-rose-400">
              {errors.shipping ?? ""}
            </p>
          </label>
        </div>

        <label className="mt-4 block max-w-xs space-y-1 text-sm text-slate-700 dark:text-slate-300">
          Status
          <select
            value={draft.status}
            onChange={(event) => updateStatus(event.target.value as ItemStatus)}
            className={selectClassName}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {draft.status === "sold" ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
              Sold date
              <input
                type="date"
                value={draft.soldDate}
                onChange={(event) =>
                  updateField("soldDate", event.target.value)
                }
                className={inputClassName}
              />
              <p className="min-h-4 text-xs font-medium text-rose-600 dark:text-rose-400">
                {errors.soldDate ?? ""}
              </p>
            </label>

            <label className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
              Sold price (kr) <span className="text-rose-500">*</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                onWheel={blockWheelChange}
                value={draft.soldPrice}
                onChange={(event) =>
                  updateField("soldPrice", event.target.value)
                }
                placeholder="0.00"
                className={inputClassName}
              />
              <p className="min-h-4 text-xs font-medium text-rose-600 dark:text-rose-400">
                {errors.soldPrice ?? ""}
              </p>
            </label>

            <label className="space-y-1 text-sm text-slate-700 dark:text-slate-300 sm:col-span-2">
              Sold platform
              <EditableSelect
                value={draft.soldPlatform}
                options={platformOptions}
                onChange={(value) => updateField("soldPlatform", value)}
                selectClassName={selectClassName}
                inputClassName={inputClassName}
              />
              <p className="min-h-4 text-xs font-medium text-rose-600 dark:text-rose-400">
                {errors.soldPlatform ?? ""}
              </p>
            </label>
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
