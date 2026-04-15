import type { ReceiptRow } from "@/types/receipt";

export const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

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
  sold: false,
  soldDate: "",
  soldPrice: "",
  soldPlatform: "",
  soldReceiptText: "",
  notes: "",
});

export const normalizeAIParsed = (item: unknown): ReceiptRow => {
  const result = item as Record<string, unknown>;
  const seller = String(result.seller ?? "").trim();
  const itemName = String(result.itemName ?? result.item ?? "").trim() || "Item";
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
    sold: false,
    soldDate: "",
    soldPrice: "",
    soldPlatform: "",
    soldReceiptText: "",
    notes: "",
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
    status: row.sold ? "sold" : "available",
    sellingPrice: row.soldPrice ? Number(row.soldPrice) : null,
    sellingDate: row.soldDate || null,
    soldPlatform: row.soldPlatform || null,
    sellingReceiptText: row.soldReceiptText || null,
    purchaseReceiptText: row.soldReceiptText || null,
    createdAt: existingCreatedAt ?? now,
    updatedAt: now,
  };
};
