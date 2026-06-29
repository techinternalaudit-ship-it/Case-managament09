"use client";

import { deleteUser } from "./actions";
import { useTransition } from "react";

export function DeleteButton({
  userId,
  userName,
  currentUserId,
}: {
  userId: string;
  userName: string;
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  const isSelf = userId === currentUserId;

  function handleClick() {
    if (isSelf) return;
    if (!confirm(`Permanently delete user "${userName}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append("id", userId);
      try {
        await deleteUser(fd);
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Failed to delete user");
      }
    });
  }

  if (isSelf) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="text-xs text-rose-600 hover:underline disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
