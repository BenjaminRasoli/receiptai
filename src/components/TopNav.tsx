"use client";

type Props = {
  appName: string;
  email?: string | null;
  onLogout: () => Promise<void> | void;
  isLoggingOut?: boolean;
};

export default function TopNav({
  appName,
  email,
  onLogout,
  isLoggingOut = false,
}: Props) {
  return (
    <nav className="mt-6 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/95 px-4 py-4 shadow-md shadow-slate-200/40 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <h1 className="text-2xl font-semibold text-slate-950">{appName}</h1>
      <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end sm:gap-4">
        <span className="max-w-[55vw] truncate text-sm text-slate-600 sm:max-w-none">{email}</span>
        <button
          type="button"
          onClick={() => void onLogout()}
          disabled={isLoggingOut}
          className={`cursor-pointer rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
            isLoggingOut ? "" : "hover:bg-slate-800"
          }`}
        >
          {isLoggingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </nav>
  );
}
