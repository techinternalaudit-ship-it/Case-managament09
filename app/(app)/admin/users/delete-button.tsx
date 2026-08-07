"use client";

import { deleteUser } from "./actions";
import { useActionState } from "react";

export type DeleteState = { error?: string } | null;

export function DeleteButton({
  userId,
  userName,
  currentUserId,
}: {
  userId: string;
  userName: string;
  currentUserId: string;
}) {
  // useActionState rather than useTransition + a direct call: a server action
  // refreshes the route when it finishes, which remounts this button and wipes
  // plain useState. React keeps action state across that refresh, so the
  // refusal message survives long enough to be read.
  const [state, formAction, pending] = useActionState(deleteUser, null);
  const isSelf = userId === currentUserId;

  if (isSelf) return null;

  return (
    <form
      action={formAction}
      className="inline"
      onSubmit={(e) => {
        if (!confirm(`Permanently delete user "${userName}"? This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={userId} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs text-rose-600 hover:underline disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {state?.error && (
        <p className="mt-1 text-[11px] leading-snug text-rose-600 dark:text-rose-400 max-w-[16rem] whitespace-normal text-left">
          {state.error}
        </p>
      )}
    </form>
  );
}
