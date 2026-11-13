"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, { error: null });
  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="password"
          className="text-xs font-semibold tracking-[0.12em] text-muted uppercase"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "password-error" : undefined}
          className="w-full rounded-none border-0 border-b border-foreground bg-transparent py-3 text-lg outline-none focus-visible:shadow-[0_2px_0_var(--color-foreground)]"
        />
        {state.error ? (
          <p id="password-error" role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        ) : null}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-full bg-foreground px-6 text-sm font-semibold tracking-wide text-surface uppercase disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
