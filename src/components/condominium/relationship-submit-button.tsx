"use client";

import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";

export function RelationshipSubmitButton({ label = "Adicionar vínculo" }: { label?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? "Salvando..." : label}
    </Button>
  );
}
