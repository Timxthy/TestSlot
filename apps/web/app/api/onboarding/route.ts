import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const schema = z.object({
  postcodeArea: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{1,2}\d{1,2}[A-Z]?$/, "Enter a postcode area, e.g. HP13."),
  centres: z.array(z.string()).max(10).optional(),
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  await supabaseAdmin
    .from("profiles")
    .update({ postcode_area: parsed.data.postcodeArea })
    .eq("id", user.id);

  const centres = parsed.data.centres ?? [];
  if (centres.length > 0) {
    await supabaseAdmin
      .from("user_centres")
      .upsert(
        centres.map((slug) => ({ user_id: user.id, centre_slug: slug })),
        { onConflict: "user_id,centre_slug", ignoreDuplicates: true },
      );
  }

  return NextResponse.json({ ok: true });
}
