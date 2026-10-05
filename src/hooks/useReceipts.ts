"use client";

import { useRouter } from "next/navigation";
import { useContext, useEffect } from "react";
import { ReceiptsContext } from "@/providers/ReceiptsProvider";

export function useReceipts() {
  const router = useRouter();
  const receipts = useContext(ReceiptsContext);

  useEffect(() => {
    if (receipts?.authReady && !receipts.user) router.replace("/auth");
  }, [receipts?.authReady, receipts?.user, router]);

  if (!receipts) {
    throw new Error("useReceipts must be used within a ReceiptsProvider.");
  }

  return {
    ...receipts,
    router,
  };
}
