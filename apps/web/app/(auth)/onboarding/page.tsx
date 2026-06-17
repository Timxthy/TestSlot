import type { Metadata } from "next";
import { OnboardingForm } from "@/components/auth/OnboardingForm";

export const metadata: Metadata = { title: "Get set up" };

export default function OnboardingPage() {
  return <OnboardingForm />;
}
