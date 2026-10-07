"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { decideAccessRequestAction } from "@/lib/gatehouse/actions";

interface Props {
  requestId: string;
}

export function RequestDecisionButtons({ requestId }: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<"approved" | "denied" | null>(null);

  const handleDecision = async (decision: "approved" | "denied") => {
    setLoading(true);
    const fd = new FormData();
    fd.append("request_id", requestId);
    fd.append("decision", decision);
    const res = await decideAccessRequestAction(null, fd);
    setLoading(false);
    if (!res?.error) {
      setDone(decision);
    }
  };

  if (done === "approved") {
    return <StatusBadge variant="success">Aprovado</StatusBadge>;
  }
  if (done === "denied") {
    return <StatusBadge variant="danger">Recusado</StatusBadge>;
  }

  return (
    <div style={{ display: "inline-flex", gap: "6px" }}>
      <Button
        type="button"
        variant="primary"
        size="compact"
        disabled={loading}
        onClick={() => handleDecision("approved")}
        title="Aprovar entrada"
      >
        <Check size={14} /> Aprovar
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="compact"
        disabled={loading}
        onClick={() => handleDecision("denied")}
        title="Recusar entrada"
      >
        <X size={14} /> Recusar
      </Button>
    </div>
  );
}
