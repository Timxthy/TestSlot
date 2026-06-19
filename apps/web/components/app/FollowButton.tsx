"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function FollowButton({
  slug,
  initialFollowing,
}: {
  slug: string;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function toggle() {
    const next = !following;
    setFollowing(next); // optimistic
    setError(null);
    const res = await fetch("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, action: next ? "follow" : "unfollow" }),
    });
    if (!res.ok) {
      setFollowing(!next); // revert (e.g. follow-limit reached)
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't update. Please try again.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`${following ? "btn-secondary" : "btn-primary"} !py-2 text-sm`}
      >
        {following ? "Following ✓" : "Follow"}
      </button>
      {error ? (
        <p className="max-w-[16rem] text-right text-xs text-rose-600">{error}</p>
      ) : null}
    </div>
  );
}
