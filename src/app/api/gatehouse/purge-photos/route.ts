import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "gatehouse-photos";
const BATCH_SIZE = 200;

/**
 * Removes photo files queued by purge_expired_person_registrations() from private storage.
 * Called by Vercel Cron (vercel.json), which sends Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "not configured" }, { status: 500 });

  const { data: queued, error: queueError } = await admin
    .from("gatehouse_photo_purge_queue")
    .select("id, photo_path")
    .is("deleted_at", null)
    .limit(BATCH_SIZE);
  if (queueError) return NextResponse.json({ error: queueError.message }, { status: 500 });
  if (!queued?.length) return NextResponse.json({ removed: 0 });

  const { error: removeError } = await admin.storage
    .from(BUCKET)
    .remove(queued.map((row) => row.photo_path));
  if (removeError) return NextResponse.json({ error: removeError.message }, { status: 500 });

  const { error: markError } = await admin
    .from("gatehouse_photo_purge_queue")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", queued.map((row) => row.id));
  if (markError) return NextResponse.json({ error: markError.message }, { status: 500 });

  return NextResponse.json({ removed: queued.length });
}
