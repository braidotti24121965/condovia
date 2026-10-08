import React, { forwardRef, type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost" | "icon" | "outline";
export type ButtonSize = "default" | "compact";
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize };

export const Button = forwardRef<HTMLButtonElement, Props>(function Button({ variant = "primary", size = "default", className = "", ...props }, ref) {
  return <button ref={ref} className={`button button-${variant} button-${size} ${className}`} {...props} />;
});
