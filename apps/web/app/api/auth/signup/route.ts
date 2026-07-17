import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/config";
import { captureServer } from "@/lib/analytics/server";
import { checkSignupAttempt } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(100, "Keep your name under 100 characters."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "Enter a valid email.")
    .email("Enter a valid email."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(128, "Keep your password under 128 characters."),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid details." },
      { status: 422 },
    );
  }
  const { name, email, password } = parsed.data;

  if (!SUPABASE_ENABLED) {
    return NextResponse.json({ ok: true, next: "/onboarding" });
  }

  const attempt = await checkSignupAttempt(email, request.headers);
  if (!attempt.allowed) {
    return NextResponse.json(
      { error: attempt.message },
      { status: attempt.reason === "limited" ? 429 : 503 },
    );
  }

  const supabase = createSupabaseServerClient();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${siteUrl}/login`,
    },
  });
  if (error || !data?.user) {
    return NextResponse.json(
      { error: "Could not create your account. Please try again." },
      { status: 400 },
    );
  }

  await captureServer("signup_completed", data.user.id);

  if (data.session) {
    return NextResponse.json({ ok: true, next: "/onboarding" });
  }

  return NextResponse.json({
    ok: true,
    next: "/login?checkEmail=1",
    message: "Check your email to confirm your account, then log in.",
  });
}
