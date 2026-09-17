import type { ItemStatus, ReceiptRow } from "@/types/receipt";

export const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const getToday = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const STATUS_OPTIONS: { value: ItemStatus; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "on_hold", label: "On hold" },
  { value: "not_for_sale", label: "Not for sale" },
  { value: "sold", label: "Sold" },
];

export const STATUS_META: Record<
  ItemStatus,
  { label: string; badgeClassName: string }
> = {
  available: {
    label: "Available",
    badgeClassName:
      "bg-emerald-200 text-emerald-900 dark:bg-emerald-800/70 dark:text-emerald-200",
  },
  on_hold: {
    label: "On hold",
    badgeClassName:
      "bg-amber-200 text-amber-900 dark:bg-amber-800/70 dark:text-amber-200",
  },
  not_for_sale: {
    label: "Not for sale",
    badgeClassName:
      "bg-slate-300 text-slate-900 dark:bg-slate-700 dark:text-slate-200",
  },
  sold: {
    label: "Sold",
    badgeClassName:
      "bg-rose-200 text-rose-900 dark:bg-rose-800/70 dark:text-rose-200",
  },
};

const STATUS_RANK: Record<ItemStatus, number> = {
  available: 0,
  on_hold: 1,
  not_for_sale: 2,
  sold: 3,
};

export const statusRank = (status: ItemStatus) => STATUS_RANK[status] ?? 0;

export const parseStoredStatus = (
  rawStatus: unknown,
  soldFallback: boolean,
): ItemStatus => {
  const value = String(rawStatus ?? "");
  const known = STATUS_OPTIONS.map((option) => option.value) as string[];
  if (known.includes(value)) return value as ItemStatus;
  return soldFallback ? "sold" : "available";
};

export const applyStatus = (
  row: ReceiptRow,
  status: ItemStatus,
): ReceiptRow => {
  if (status === "sold") {
    return {
      ...row,
      status,
      sold: true,
      soldDate: row.soldDate || getToday(),
    };
  }
  return {
    ...row,
    status,
    sold: false,
    soldDate: "",
    soldPrice: "",
    soldPlatform: "",
  };
};

export const createEmptyRow = (): ReceiptRow => ({
  id: createId(),
  seller: "",
  itemName: "",
  item: "",
  purchaseDate: "",
  platform: "",
  purchasePrice: "",
  totalPrice: "",
  itemPrice: "",
  shipping: "",
  buyerProtectionFee: "",
  paymentMethod: "",
  transactionId: "",
  status: "available",
  sold: false,
  soldDate: "",
  soldPrice: "",
  soldPlatform: "",
  soldReceiptText: "",
  notes: "",
  imageUrl: "",
  imagePublicId: "",
});

export const normalizeAIParsed = (item: unknown): ReceiptRow => {
  const result = item as Record<string, unknown>;
  const seller = String(result.seller ?? "").trim();
  const itemName =
    String(result.itemName ?? result.item ?? "").trim() || "Item";
  const purchaseDate = String(
    result.paymentDate ?? result.purchaseDate ?? result.date ?? "",
  ).trim();
  const paymentMethod = String(result.paymentMethod ?? "").trim();
  const platform = String(result.platform ?? result.source ?? "").trim();

  return {
    id: createId(),
    seller,
    itemName,
    item: itemName,
    purchaseDate,
    platform,
    purchasePrice: String(
      result.totalPrice ?? result.purchasePrice ?? result.price ?? "",
    ).trim(),
    totalPrice: String(result.totalPrice ?? "").trim(),
    itemPrice: String(result.itemPrice ?? "").trim(),
    shipping: String(result.shipping ?? "").trim(),
    buyerProtectionFee: String(result.buyerProtectionFee ?? "").trim(),
    paymentMethod,
    transactionId: String(result.transactionId ?? "").trim(),
    status: "available",
    sold: false,
    soldDate: "",
    soldPrice: "",
    soldPlatform: "",
    soldReceiptText: "",
    notes: "",
    imageUrl: "",
    imagePublicId: "",
  };
};

export const toFirestoreItem = (
  row: ReceiptRow,
  userId: string,
  existingCreatedAt?: string,
) => {
  const now = new Date().toISOString();
  return {
    ...row,
    id: row.id,
    name: row.item || row.itemName || "",
    userId,
    purchasePrice: Number(row.purchasePrice) || 0,
    status: row.status,
    sold: row.status === "sold",
    sellingPrice: row.soldPrice ? Number(row.soldPrice) : null,
    sellingDate: row.soldDate || null,
    soldPlatform: row.soldPlatform || null,
    sellingReceiptText: row.soldReceiptText || null,
    purchaseReceiptText: row.soldReceiptText || null,
    createdAt: existingCreatedAt ?? now,
    updatedAt: now,
  };
};
