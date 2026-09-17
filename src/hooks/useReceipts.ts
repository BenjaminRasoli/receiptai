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
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/firebaseConfig";
import type { ReceiptRow } from "@/types/receipt";
import { parseStoredStatus, toFirestoreItem } from "@/utils/receipt";

export function useReceipts() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [isRowsLoading, setIsRowsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

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
        setLoadError("");
        const snapshot = await getDocs(
          query(
            receiptsCollection,
            where("userId", "==", uid),
            orderBy("purchaseDate", "desc"),
          ),
        );
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
          } as ReceiptRow;
        });
        setRows(loadedRows);
      } catch (error: unknown) {
        const err = error as FirebaseError;
        const message = err.message ?? "Unknown error";
        const code = err.code ? ` (${err.code})` : "";
        setLoadError(
          `Unable to load saved receipts from Firebase${code}: ${message}`,
        );
      } finally {
        setIsRowsLoading(false);
      }
    };

    void loadUserReceipts(user.uid);
  }, [user, receiptsCollection]);

  const saveRowToFirestore = async (row: ReceiptRow) => {
    if (!user) return;
    await setDoc(
      doc(receiptsCollection, row.id),
      toFirestoreItem(row, user.uid),
      { merge: true },
    );
  };

  return {
    router,
    user,
    authReady,
    rows,
    setRows,
    isRowsLoading,
    loadError,
    receiptsCollection,
    saveRowToFirestore,
  };
}
