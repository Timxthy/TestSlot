"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function ModerationActions({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function act(action: "approve" | "reject") {
    await fetch("/api/admin/cancellations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => act("approve")}
        disabled={pending}
        className="btn-primary !py-2 text-sm"
      >
        Approve
      </button>
      <button
        type="button"
        onClick={() => act("reject")}
        disabled={pending}
        className="btn-secondary !py-2 text-sm"
      >
        Reject
      </button>
    </div>
  );
}
