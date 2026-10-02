import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginJson, noStore, ok } from "@/lib/supabase/api";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!isSameOriginJson(request)) return NextResponse.json({ ok: false }, { status: 403, headers: noStore });
  const supabase = await createSupabaseServer();
  await supabase?.auth.signOut();
  return ok(null);
}
