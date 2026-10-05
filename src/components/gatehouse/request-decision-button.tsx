"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    return <span className="cv-status cv-status-active">Aprovado</span>;
  }
  if (done === "denied") {
    return <span className="cv-status cv-status-inactive">Recusado</span>;
  }

  return (
    <div style={{ display: "inline-flex", gap: "6px" }}>
      <Button
        type="button"
        variant="primary"
        className="button-small"
        disabled={loading}
        onClick={() => handleDecision("approved")}
        title="Aprovar entrada"
      >
        <Check size={14} /> Aprovar
      </Button>
      <Button
        type="button"
        variant="destructive"
        className="button-small"
        disabled={loading}
        onClick={() => handleDecision("denied")}
        title="Recusar entrada"
      >
        <X size={14} /> Recusar
      </Button>
    </div>
  );
}
