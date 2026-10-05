"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const handleExit = async () => {
    if (!confirm(`Confirmar saída de ${targetName}?`)) return;
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
      alert(`Erro ao registrar saída: ${res.error}`);
    }
  };

  if (done) {
    return <span className="cv-status">Saída registrada</span>;
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="button-small"
      disabled={loading}
      onClick={handleExit}
      title="Registrar saída imediata"
    >
      <LogOut size={14} /> Registrar saída
    </Button>
  );
}
