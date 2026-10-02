"use client";

import { AlertTriangle } from "lucide-react";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="page-error" role="alert"><span><AlertTriangle size={23} /></span><h1>Não foi possível carregar esta página</h1><p>Ocorreu um erro ao carregar as informações. Tente novamente em instantes.</p><button className="button button-primary" onClick={() => reset()}>Tentar novamente</button></section>;
}
