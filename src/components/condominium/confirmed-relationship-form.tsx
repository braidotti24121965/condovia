"use client";

import { useRef, useState } from "react";
import type { FormHTMLAttributes, SubmitEvent } from "react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export function ConfirmedRelationshipForm({ confirmPrimary, onSubmit, ...props }: FormHTMLAttributes<HTMLFormElement> & { confirmPrimary: boolean }) {
  const [open, setOpen] = useState(false);
  const [pendingForm, setPendingForm] = useState<HTMLFormElement | null>(null);
  const confirmed = useRef(false);
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    onSubmit?.(event);
    if (event.defaultPrevented) return;
    if (confirmed.current) {
      confirmed.current = false;
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
    <ConfirmationDialog open={open} title="Confirmar morador principal" description="Um período principal anterior será encerrado no início informado, preservando o histórico." confirmLabel="Confirmar morador principal" onCancel={() => { setOpen(false); setPendingForm(null); }} onConfirm={() => { setOpen(false); confirmed.current = true; pendingForm?.requestSubmit(); setPendingForm(null); }} />
  </>;
}
