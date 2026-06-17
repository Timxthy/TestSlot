import { GOVUK_BOOKING_URL } from "@testslot/shared";
import { ExternalIcon } from "@/components/icons";

const govukUrl = process.env.NEXT_PUBLIC_GOVUK_BOOKING_URL ?? GOVUK_BOOKING_URL;

/**
 * Opens the official GOV.UK booking service in a new tab. The user checks
 * availability themselves — the app never inspects or automates this.
 */
export function GovUkLink({
  className = "",
  children = "Open GOV.UK yourself",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <a
      href={govukUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className || "btn-secondary"}
    >
      {children}
      <ExternalIcon className="ml-2 h-4 w-4" />
    </a>
  );
}
