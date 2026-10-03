"use client";

import type { FormHTMLAttributes } from "react";

export function ConfirmedRelationshipForm({ confirmPrimary, ...props }: FormHTMLAttributes<HTMLFormElement> & { confirmPrimary: boolean }) {
  return <form {...props} onSubmit={(event) => {
    if (confirmPrimary && new FormData(event.currentTarget).get("is_primary") === "true"
      && !window.confirm("Confirmar o morador principal nesta data? Um período principal anterior será encerrado no início informado, preservando o histórico.")) {
      event.preventDefault();
    }
  }} />;
}
