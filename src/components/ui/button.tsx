import React, { type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost" | "icon" | "outline";
export type ButtonSize = "default" | "compact";
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant = "primary", size = "default", className = "", ...props }: Props) {
  return <button className={`button button-${variant} button-${size} ${className}`} {...props} />;
}
