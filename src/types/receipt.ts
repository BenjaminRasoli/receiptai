export type ItemStatus = "available" | "on_hold" | "not_for_sale" | "sold";

export type ReceiptRow = {
  id: string;
  seller: string;
  itemName: string;
  item: string;
  purchaseDate: string;
  platform: string;
  purchasePrice: string;
  totalPrice: string;
  itemPrice: string;
  shipping: string;
  buyerProtectionFee: string;
  paymentMethod: string;
  transactionId: string;
  status: ItemStatus;
  sold: boolean;
  soldDate: string;
  soldPrice: string;
  soldPlatform: string;
  soldReceiptText: string;
  notes: string;
  imageUrl: string;
  imagePublicId: string;
};
