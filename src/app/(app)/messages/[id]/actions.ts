"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { NOTE_LIMIT, isLeadStage, type MessageStatus } from "@/lib/contact";
import { getStore } from "@/lib/store";

const NEXT: Record<string, { status: MessageStatus; back: boolean }> = {
  unread: { status: "new", back: true },
  archive: { status: "archived", back: true },
  restore: { status: "read", back: false },
};

const field = (form: FormData, name: string) => String(form.get(name) ?? "");

/** Marks unread, archives or restores one message. Unread and archive go back to the inbox. */
export async function changeStatus(form: FormData): Promise<void> {
  await requireOwner();
  const id = field(form, "id");
  const change = NEXT[field(form, "change")];
  if (!id || !change) return;
  await getStore().setStatus(id, change.status);
  revalidatePath("/");
  if (change.back) redirect("/");
  revalidatePath(`/messages/${id}`);
}

/** Moves a message to another lead stage: open, replied, won or lost. */
export async function changeStage(form: FormData): Promise<void> {
  await requireOwner();
  const id = field(form, "id");
  const stage = field(form, "stage");
  if (!id || !isLeadStage(stage)) return;
  await getStore().setStage(id, stage);
  revalidatePath("/");
  revalidatePath(`/messages/${id}`);
}

/** Adds a dated note to a message. Blank notes are ignored; long ones are cut at the limit. */
export async function addNote(form: FormData): Promise<void> {
  await requireOwner();
  const id = field(form, "id");
  const body = field(form, "body").trim().slice(0, NOTE_LIMIT);
  if (!id || !body) return;
  await getStore().addNote(id, body);
  revalidatePath(`/messages/${id}`);
}

export async function deleteNote(form: FormData): Promise<void> {
  await requireOwner();
  const id = field(form, "id");
  const noteId = field(form, "noteId");
  if (!noteId) return;
  await getStore().deleteNote(noteId);
  revalidatePath(`/messages/${id}`);
}
