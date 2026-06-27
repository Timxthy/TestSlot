import type { Metadata } from "next";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Get set up" };
export const dynamic = "force-dynamic";

// Onboarding only makes sense for a signed-in account (it sets the profile's
// postcode area and followed centres). A signed-out visitor is sent to /login.
export default async function OnboardingPage() {
  await requireUser();
  return <OnboardingForm />;
}
