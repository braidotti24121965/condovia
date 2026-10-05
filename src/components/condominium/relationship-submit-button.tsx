"use client";

import { useFormStatus } from "react-dom";

export function RelationshipSubmitButton({ label = "Adicionar vínculo" }: { label?: string }) {
  const { pending } = useFormStatus();

  return (
    <button className="button button-primary" type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? "Salvando..." : label}
    </button>
  );
}
