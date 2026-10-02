import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" };

export function Button({ variant = "primary", className = "", ...props }: Props) {
  return <button className={`button button-${variant} ${className}`} {...props} />;
}
