"use client";

import { Button, type ButtonVariant, type ButtonSize } from "@/components/ui/button";
import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes } from "react";

type SubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pendingLabel?: string;
};

export function SubmitButton({ pendingLabel = "Salvando...", children, name, value, ...props }: SubmitButtonProps) {
  const { pending, data } = useFormStatus();
  const isClicked = pending && (!name || value === undefined || data?.get(name) === String(value));

  return (
    <Button
      {...props}
      name={name}
      value={value}
      type="submit"
      disabled={pending || props.disabled}
      aria-disabled={pending || props.disabled || undefined}
      aria-busy={pending || undefined}
    >
      {isClicked ? pendingLabel : children}
    </Button>
  );
}
