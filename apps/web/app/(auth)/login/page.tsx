import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; checkEmail?: string };
}) {
  const next = typeof searchParams.next === "string" ? searchParams.next : undefined;
  const notice =
    searchParams.checkEmail === "1"
      ? "Check your email to confirm your account, then log in."
      : undefined;
  return <LoginForm next={next} notice={notice} />;
}
