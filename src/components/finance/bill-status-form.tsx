"use client";

import { useFormStatus } from "react-dom";

export function BillStatusForm({ action, id, status, label, variant = "primary" }: { action: (formData: FormData) => void | Promise<void>; id: string; status: "received" | "cancelled"; label: string; variant?: "primary" | "secondary" }) {
  return <form action={action}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} /><SubmitButton label={label} variant={variant} /></form>;
}

function SubmitButton({ label, variant }: { label: string; variant: "primary" | "secondary" }) {
  const { pending } = useFormStatus();
  return <button className={`button button-${variant} button-compact`} type="submit" disabled={pending}>{pending ? "Salvando..." : label}</button>;
}
