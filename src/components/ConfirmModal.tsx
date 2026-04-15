"use client";

import Modal from "@/components/Modal";

type Props = {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "danger" | "primary";
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmModal({
  isOpen,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "danger",
  isLoading = false,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal
      isOpen={isOpen}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className={`cursor-pointer rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 ${
              isLoading ? "" : "hover:bg-slate-200"
            }`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`cursor-pointer rounded-2xl px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
              confirmVariant === "danger"
                ? `bg-rose-700 ${isLoading ? "" : "hover:bg-rose-800"}`
                : `bg-slate-950 ${isLoading ? "" : "hover:bg-slate-800"}`
            }`}
          >
            {isLoading ? "Please wait..." : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-700">{message}</p>
    </Modal>
  );
}
