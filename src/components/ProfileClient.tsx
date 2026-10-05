"use client";

import { FirebaseError } from "firebase/app";
import { signOut } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Download, Eye, EyeOff, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import TopNav from "@/components/TopNav";
import { auth, db } from "@/firebaseConfig";
import { useReceipts } from "@/hooks/useReceipts";

const DEFAULT_PREFERENCES = [
  { key: "hidePurchaseSection", label: "Hide purchase receipt section" },
  { key: "hideSoldSection", label: "Hide sold receipt section" },
  { key: "hideStats", label: "Hide stats cards" },
  { key: "hideInventoryChat", label: "Hide inventory chat" },
] as const;

type PreferenceKey = (typeof DEFAULT_PREFERENCES)[number]["key"];
type Preference = {
  key: PreferenceKey;
  label: string;
  value: boolean;
};

export default function ProfileClient() {
  const { router, user, authReady } = useReceipts();
  const [preferences, setPreferences] = useState<Preference[]>(
    DEFAULT_PREFERENCES.map((preference) => ({ ...preference, value: false })),
  );
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setPreferences(
      DEFAULT_PREFERENCES.map((preference) => ({
        ...preference,
        value: localStorage.getItem(preference.key) === "true",
      })),
    );
    setPreferencesLoaded(true);
  }, []);

  const togglePreference = (key: PreferenceKey) => {
    const preference = preferences.find((item) => item.key === key);
    if (!preference) return;

    const value = !preference.value;
    setPreferences((current) =>
      current.map((item) => (item.key === key ? { ...item, value } : item)),
    );
    localStorage.setItem(key, value.toString());
  };

  const revertAll = () => {
    setPreferences(
      DEFAULT_PREFERENCES.map((preference) => ({
        ...preference,
        value: false,
      })),
    );
    DEFAULT_PREFERENCES.forEach((preference) =>
      localStorage.removeItem(preference.key),
    );
  };

  const revertSpecific = (key: PreferenceKey) => {
    setPreferences((current) =>
      current.map((preference) =>
        preference.key === key ? { ...preference, value: false } : preference,
      ),
    );
    localStorage.removeItem(key);
  };

  const exportData = async () => {
    if (!user) return;

    setIsExporting(true);
    setExportError("");

    try {
      const snapshot = await getDocs(
        query(collection(db, "items"), where("userId", "==", user.uid)),
      );
      const data = snapshot.docs.map((item) => ({
        ...item.data(),
        id: item.id,
      }));
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `receiptai-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      const message =
        error instanceof FirebaseError || error instanceof Error
          ? error.message
          : "Unknown error";
      setExportError(`Failed to export your Firebase data: ${message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      router.replace("/auth");
    } catch (error: unknown) {
      setIsLoggingOut(false);
      setExportError(
        `Unable to sign out: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  if (!authReady || !user || !preferencesLoaded) {
    return <LoadingSpinner fullPage size={48} hideLabel />;
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto w-full max-w-500 px-4 py-10 sm:px-6">
        <TopNav
          appName="ReceiptAI"
          email={user.email}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />

        <h1 className="mt-8 text-3xl font-semibold dark:text-slate-50">
          Profile &amp; Preferences
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Manage your dashboard preferences and export your Firebase data.
        </p>

        <div className="mt-8 space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold dark:text-slate-50">
                UI Preferences
              </h2>
              <button
                type="button"
                onClick={revertAll}
                className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <RotateCcw className="h-4 w-4" />
                Revert all to default
              </button>
            </div>

            <div className="space-y-3">
              {preferences.map((preference) => (
                <div
                  key={preference.key}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    {preference.value ? (
                      <EyeOff className="h-5 w-5 text-slate-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-slate-400" />
                    )}
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {preference.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => revertSpecific(preference.key)}
                      disabled={!preference.value}
                      className="cursor-pointer rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                    >
                      Revert
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePreference(preference.key)}
                      aria-pressed={preference.value}
                      className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        preference.value
                          ? "bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-950"
                          : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-950"
                      }`}
                    >
                      {preference.value ? "Hidden" : "Visible"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-xl font-semibold dark:text-slate-50">
              Export Data
            </h2>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              Download all receipt items belonging to your account as a JSON
              file.
            </p>

            {exportError && (
              <p
                role="alert"
                className="mb-4 inline-flex rounded-xl bg-rose-100 px-4 py-2 text-sm font-medium text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
              >
                {exportError}
              </p>
            )}

            <button
              type="button"
              onClick={() => void exportData()}
              disabled={isExporting}
              className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Exporting..." : "Export all data"}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
