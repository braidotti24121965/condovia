"use client";

import { useState } from "react";
import type { FormEvent, FormHTMLAttributes } from "react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export function ConfirmedRelationshipForm({ confirmPrimary, ...props }: FormHTMLAttributes<HTMLFormElement> & { confirmPrimary: boolean }) {
  const [open, setOpen] = useState(false);
  const [pendingForm, setPendingForm] = useState<HTMLFormElement | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    if (confirmed) {
      setConfirmed(false);
      return;
    }
    if (confirmPrimary && new FormData(event.currentTarget).get("is_primary") === "true") {
      event.preventDefault();
      setPendingForm(event.currentTarget);
      setOpen(true);
    }
  };
  return <>
    <form {...props} onSubmit={submit} />
    <ConfirmationDialog open={open} title="Confirmar morador principal" description="Um período principal anterior será encerrado no início informado, preservando o histórico." confirmLabel="Confirmar morador principal" onCancel={() => { setOpen(false); setPendingForm(null); }} onConfirm={() => { setOpen(false); setConfirmed(true); pendingForm?.requestSubmit(); setPendingForm(null); }} />
  </>;
}
