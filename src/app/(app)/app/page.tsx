import { redirect } from "next/navigation";
import { getPostLoginDestination, requireUser } from "@/lib/auth/context";

export default async function AppIndex() {
  await requireUser();
  redirect(await getPostLoginDestination());
}
