import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
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

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
  }

  // Send users without a postcode to onboarding.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let next = "/dashboard";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("postcode_area")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.postcode_area) next = "/onboarding";
  }
  return NextResponse.json({ ok: true, next });
}
