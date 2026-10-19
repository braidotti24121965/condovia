"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function MaintenanceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep the fallback quiet for users while preserving the error boundary contract.
  }, []);

  return (
    <section className="no-permission">
      <h1>Acesso à manutenção indisponível</h1>
      <p>
        Não foi possível carregar esta área com o contexto e as permissões atuais.
      </p>
      <div className="cv-actions">
        <Button type="button" onClick={() => reset()}>
          Tentar novamente
        </Button>
        <Link href="/app/dashboard">Voltar ao painel</Link>
      </div>
    </section>
  );
}
