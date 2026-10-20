import type { Metadata } from "next";
import { Suspense } from "react";
import "@fontsource-variable/inter";
import "./globals.css";
import { NavigationFeedback } from "@/components/ui/navigation-feedback";

export const metadata: Metadata = {
  title: { default: "CondoVia — Gestão inteligente de condomínios", template: "%s | CondoVia" },
  description: "Seu condomínio conectado. Sua gestão simplificada.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}<Suspense fallback={null}><NavigationFeedback /></Suspense></body></html>;
}
