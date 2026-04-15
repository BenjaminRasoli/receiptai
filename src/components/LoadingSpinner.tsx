"use client";

import { LoaderCircle } from "lucide-react";

type Props = {
  label?: string;
  fullPage?: boolean;
  size?: number;
  hideLabel?: boolean;
};

export default function LoadingSpinner({
  label = "Loading...",
  fullPage = false,
  size = 28,
  hideLabel = false,
}: Props) {
  const content = (
    <div className="flex items-center gap-3 text-slate-700">
      <LoaderCircle
        className="animate-spin text-slate-900"
        style={{ width: size, height: size }}
      />
      {!hideLabel ? <span className="text-sm">{label}</span> : null}
    </div>
  );

  if (fullPage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        {content}
      </main>
    );
  }

  return <div className="inline-flex items-center">{content}</div>;
}
