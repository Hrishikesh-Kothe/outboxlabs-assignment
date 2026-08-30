import { FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMe, googleLoginUrl } from "../lib/api";

export function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    void getMe().then((me) => {
      if (me) {
        navigate("/inbox", { replace: true });
      }
    });
  }, [navigate]);

  function onEmailLogin(event: FormEvent) {
    event.preventDefault();
    window.alert("Use Login with Google — email/password is display-only (assignment requires real Google OAuth).");
  }

  return (
    <main className="min-h-screen bg-neutral-100 flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] rounded-2xl border border-neutral-200 bg-white px-10 py-12">
        <h1 className="text-center text-3xl font-semibold text-neutral-900">
          Login
        </h1>

        <a
          href={googleLoginUrl()}
          className="mt-8 flex h-12 items-center justify-center gap-3 rounded-lg bg-[#c8e6c9] text-neutral-800 font-medium"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt=""
            className="size-5"
          />
          Login with Google
        </a>

        <div className="mt-6 flex items-center gap-3 text-xs text-neutral-400">
          <span className="h-px flex-1 bg-neutral-200" />
          or sign up through email
          <span className="h-px flex-1 bg-neutral-200" />
        </div>

        <form className="mt-6 space-y-3" onSubmit={onEmailLogin}>
          <input
            type="email"
            placeholder="Email ID"
            className="h-12 w-full rounded-lg bg-neutral-100 px-4 text-sm outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            className="h-12 w-full rounded-lg bg-neutral-100 px-4 text-sm outline-none"
          />
          <button
            type="submit"
            className="h-12 w-full rounded-lg bg-[#22A45A] text-white font-semibold"
          >
            Login
          </button>
        </form>
      </div>
    </main>
  );
}
