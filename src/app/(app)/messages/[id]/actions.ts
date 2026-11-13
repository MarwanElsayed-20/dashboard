"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import type { MessageStatus } from "@/lib/contact";
import { getStore } from "@/lib/store";

const NEXT: Record<string, { status: MessageStatus; back: boolean }> = {
  unread: { status: "new", back: true },
  archive: { status: "archived", back: true },
  restore: { status: "read", back: false },
};

/** Marks unread, archives or restores one message. Unread and archive go back to the inbox. */
export async function changeStatus(form: FormData): Promise<void> {
  await requireOwner();
  const id = String(form.get("id") ?? "");
  const change = NEXT[String(form.get("change") ?? "")];
  if (!id || !change) return;
  await getStore().setStatus(id, change.status);
  revalidatePath("/");
  if (change.back) redirect("/");
  revalidatePath(`/messages/${id}`);
}
