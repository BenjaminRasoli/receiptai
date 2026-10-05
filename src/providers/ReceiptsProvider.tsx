"use client";

import { FirebaseError } from "firebase/app";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { auth, db } from "@/firebaseConfig";
import type { ReceiptRow } from "@/types/receipt";
import { parseStoredStatus, toFirestoreItem } from "@/utils/receipt";

type ReceiptsContextValue = {
  user: User | null;
  authReady: boolean;
  rows: ReceiptRow[];
  setRows: Dispatch<SetStateAction<ReceiptRow[]>>;
  isRowsLoading: boolean;
  loadError: string;
  receiptsCollection: ReturnType<typeof collection>;
  saveRowToFirestore: (row: ReceiptRow) => Promise<void>;
};

export const ReceiptsContext = createContext<ReceiptsContextValue | null>(null);

export function ReceiptsProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [isRowsLoading, setIsRowsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const receiptsCollection = useMemo(() => collection(db, "items"), []);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setRows([]);
      setLoadError("");
      setIsRowsLoading(false);
      return;
    }

    const loadUserReceipts = async () => {
      setRows([]);
      setIsRowsLoading(true);
      setLoadError("");

      try {
        const snapshot = await getDocs(
          query(
            receiptsCollection,
            where("userId", "==", user.uid),
            orderBy("purchaseDate", "desc"),
          ),
        );
        if (cancelled) return;

        const loadedRows = snapshot.docs.map((docItem) => {
          const data = docItem.data();
          const sold = Boolean(data.sold ?? data.status === "sold");
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
            status: parseStoredStatus(data.status, sold),
            sold,
            soldDate: String(data.soldDate ?? data.sellingDate ?? ""),
            soldPrice: String(data.soldPrice ?? data.sellingPrice ?? ""),
            soldPlatform: String(data.soldPlatform ?? ""),
            soldReceiptText: String(
              data.soldReceiptText ?? data.sellingReceiptText ?? "",
            ),
            notes: String(data.notes ?? ""),
            imageUrl: String(data.imageUrl ?? ""),
            imagePublicId: String(data.imagePublicId ?? ""),
          } satisfies ReceiptRow;
        });
        setRows(loadedRows);
      } catch (error: unknown) {
        if (cancelled) return;
        const err = error as FirebaseError;
        const message = err.message ?? "Unknown error";
        const code = err.code ? ` (${err.code})` : "";
        setLoadError(
          `Unable to load saved receipts from Firebase${code}: ${message}`,
        );
      } finally {
        if (!cancelled) setIsRowsLoading(false);
      }
    };

    void loadUserReceipts();
    return () => {
      cancelled = true;
    };
  }, [user, receiptsCollection]);

  const saveRowToFirestore = useCallback(
    async (row: ReceiptRow) => {
      if (!user) return;
      await setDoc(
        doc(receiptsCollection, row.id),
        toFirestoreItem(row, user.uid),
        { merge: true },
      );
    },
    [receiptsCollection, user],
  );

  const value = useMemo(
    () => ({
      user,
      authReady,
      rows,
      setRows,
      isRowsLoading,
      loadError,
      receiptsCollection,
      saveRowToFirestore,
    }),
    [
      user,
      authReady,
      rows,
      isRowsLoading,
      loadError,
      receiptsCollection,
      saveRowToFirestore,
    ],
  );

  return (
    <ReceiptsContext.Provider value={value}>{children}</ReceiptsContext.Provider>
  );
}
