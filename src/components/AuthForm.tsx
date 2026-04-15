"use client";

import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  type User,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { FaGoogle } from "react-icons/fa";
import LoadingSpinner from "@/components/LoadingSpinner";
import { auth } from "@/firebaseConfig";

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
      if (user) {
        router.replace("/");
      }
    });
    return unsubscribe;
  }, [router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage("");
    setFieldErrors({});
    if (!email.trim() || !password.trim()) {
      setFieldErrors({
        email: email.trim() ? "" : "Enter a valid email.",
        password: password.trim() ? "" : "Enter password.",
      });
      return;
    }
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      router.replace("/");
    } catch (error: unknown) {
      const authError = error as FirebaseError;
      if (
        authError.code === "auth/operation-not-allowed" ||
        authError.message?.includes("OPERATION_NOT_ALLOWED")
      ) {
        setStatusMessage(
          "Sign-up is disabled in Firebase. Enable Email/Password sign-in in Firebase console.",
        );
      } else {
        setStatusMessage(
          authError.message ?? "Unable to sign in. Check your credentials.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setStatusMessage("");
    setIsGoogleSubmitting(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.replace("/");
    } catch (error: unknown) {
      const authError = error as FirebaseError;
      setStatusMessage(authError.message ?? "Unable to sign in with Google.");
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  if (!authReady || currentUser) {
    return <LoadingSpinner fullPage label="Checking session..." />;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-lg px-6 py-16">
        <section className="rounded-3xl border border-slate-200 bg-white p-10 shadow-lg shadow-slate-200/50">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold text-slate-950">ReceiptAI</h1>
          </div>
          <p className="mt-3 text-slate-600">
            Log in or create an account to manage your receipts.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="mx-auto grid w-full max-w-sm grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`cursor-pointer rounded-2xl px-4 py-2 transition ${mode === "login" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}
              >
                <span className="inline-flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Login
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`cursor-pointer rounded-2xl px-4 py-2 transition ${mode === "register" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}
              >
                <span className="inline-flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Register
                </span>
              </button>
            </div>

            <label className="mx-auto block w-full max-w-sm space-y-1 text-sm text-slate-700">
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
              />
              <p className="min-h-4 text-xs font-medium text-rose-600">
                {fieldErrors.email ?? ""}
              </p>
            </label>
            <label className="mx-auto block w-full max-w-sm space-y-1 text-sm text-slate-700">
              Password
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
              />
              <p className="min-h-4 text-xs font-medium text-rose-600">
                {fieldErrors.password ?? ""}
              </p>
            </label>

            <div className="mx-auto w-full max-w-sm min-h-5">
              <p className="text-xs font-medium text-rose-600">
                {statusMessage}
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`mx-auto cursor-pointer inline-flex w-full max-w-sm items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isSubmitting ? "" : "hover:bg-slate-800"
              }`}
            >
              {isSubmitting ? (
                <LoadingSpinner label="Please wait..." size={18} />
              ) : mode === "login" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </button>

            <div className="mx-auto flex w-full max-w-sm items-center gap-3 pt-1">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs uppercase tracking-wide text-slate-400">
                or
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              disabled={isGoogleSubmitting}
              className={`mx-auto cursor-pointer inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isGoogleSubmitting ? "" : "hover:bg-slate-50"
              }`}
            >
              {isGoogleSubmitting ? (
                "Connecting..."
              ) : (
                <>
                  <FaGoogle className="h-4 w-4" />
                  Continue with Google
                </>
              )}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
