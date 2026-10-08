"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Alert } from "@/components/ui/feedback";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { registerExitAction } from "@/lib/gatehouse/actions";

interface Props {
  targetKind: "visitor" | "provider";
  targetId: string;
  accessPointId: string;
  targetName: string;
}

export function QuickExitButton({ targetKind, targetId, accessPointId, targetName }: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExit = async () => {
    setConfirming(false);
    setLoading(true);
    const fd = new FormData();
    fd.append("target_type", targetKind);
    fd.append("target_id", targetId);
    fd.append("access_point_id", accessPointId);
    const res = await registerExitAction(null, fd);
    setLoading(false);
    if (!res?.error) {
      setDone(true);
    } else {
      setError(`Erro ao registrar saída: ${res.error}`);
    }
  };

  if (done) {
    return <StatusBadge variant="success">Saída registrada</StatusBadge>;
  }

  return (
    <>
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="button" variant="primary" size="compact" disabled={loading} onClick={() => setConfirming(true)} title="Registrar saída imediata">
        <LogOut size={14} /> Registrar saída
      </Button>
      <ConfirmationDialog open={confirming} title="Confirmar saída" description={`A saída de ${targetName} será registrada agora e a pessoa deixará de aparecer como presente.`} confirmLabel="Confirmar saída" onCancel={() => setConfirming(false)} onConfirm={handleExit} />
    </>
  );
}
