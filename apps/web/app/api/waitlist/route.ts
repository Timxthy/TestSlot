import { NextResponse } from "next/server";
import { waitlistSchema } from "@testslot/shared";
import { saveWaitlistEntry } from "@/lib/waitlist";

// fs-based local fallback needs the Node runtime.
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = waitlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please check the details and try again.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  try {
    const result = await saveWaitlistEntry(parsed.data);
    if (result.status === "duplicate") {
      return NextResponse.json(
        { ok: true, status: "duplicate", message: "You’re already on the list — thanks!" },
        { status: 200 },
      );
    }
    return NextResponse.json(
      { ok: true, status: "created", message: "You’re on the list. We’ll be in touch." },
      { status: 201 },
    );
  } catch (err) {
    console.error("waitlist save failed", err);
    return NextResponse.json(
      { error: "Something went wrong saving your details. Please try again." },
      { status: 500 },
    );
  }
}
