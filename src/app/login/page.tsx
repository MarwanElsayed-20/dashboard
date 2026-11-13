import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/auth";
import { Mark } from "@/lib/mark";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await isSignedIn()) redirect("/");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-10 px-6 py-[max(3rem,env(safe-area-inset-top))]">
      <div className="flex flex-col gap-6">
        <Mark size={48} />
        <h1 className="text-4xl leading-none font-light tracking-tight">Dashboard</h1>
      </div>
      <LoginForm />
    </main>
  );
}
