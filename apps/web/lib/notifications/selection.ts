export function shouldConsiderCancellationForDelivery({
  moderationStatus,
  status,
  expiresAt,
  now,
}: {
  moderationStatus: string;
  status: string;
  expiresAt: string;
  now: string;
}): boolean {
  const expiry = new Date(expiresAt).getTime();
  const currentTime = new Date(now).getTime();

  return (
    moderationStatus === "approved" &&
    status === "active" &&
    Number.isFinite(expiry) &&
    Number.isFinite(currentTime) &&
    expiry > currentTime
  );
}
