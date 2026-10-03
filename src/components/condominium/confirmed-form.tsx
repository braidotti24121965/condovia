"use client";

import type { FormHTMLAttributes, ReactNode } from "react";

export function ConfirmedForm({ children, confirmation, ...props }: FormHTMLAttributes<HTMLFormElement> & { confirmation: string; children: ReactNode }) {
  return <form {...props} onSubmit={(event) => { if (!window.confirm(confirmation)) event.preventDefault(); }}>
    {children}
  </form>;
}
