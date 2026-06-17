import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "learner" | "instructor" | "moderator" | "admin";
  isInstructor: boolean;
}

/** Fallback used only in mock mode (no Supabase configured). */
export const DEMO_USER: SessionUser = {
  id: "demo-user",
  name: "Demo Learner",
  email: "demo@testslotradar.app",
  role: "learner",
  isInstructor: false,
};

const useSupabase = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

/** The signed-in user, or null. In mock mode returns the demo user. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  if (!useSupabase) return DEMO_USER;

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role, is_instructor_verified")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role as SessionUser["role"]) ?? "learner";
  return {
    id: user.id,
    name: profile?.display_name ?? user.email?.split("@")[0] ?? "Learner",
    email: user.email ?? "",
    role,
    isInstructor: Boolean(profile?.is_instructor_verified) || role === "instructor",
  };
}

/** For pages/layouts: returns the user or redirects to /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
