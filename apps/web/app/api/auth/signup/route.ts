import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(1, "Enter your name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(8, "Use at least 8 characters."),
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

  // Instant-confirm via Admin API so there's no email round-trip.
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error || !created?.user) {
    const exists = /already|registered|exists/i.test(error?.message ?? "");
    return NextResponse.json(
      { error: exists ? "An account with that email already exists." : "Could not create your account." },
      { status: exists ? 409 : 500 },
    );
  }

  await supabaseAdmin
    .from("profiles")
    .upsert({ id: created.user.id, display_name: name, role: "learner", is_instructor_verified: false });

  const supabase = createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return NextResponse.json({ ok: true, next: "/login" });
  }
  return NextResponse.json({ ok: true, next: "/onboarding" });
}
