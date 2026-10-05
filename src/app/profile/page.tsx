import type { Metadata } from "next";
import ProfileClient from "@/components/ProfileClient";

export const metadata: Metadata = {
  title: "Profile – ReceiptAI",
  description: "Manage your preferences and export your data.",
};

export default function ProfilePage() {
  return <ProfileClient />;
}
