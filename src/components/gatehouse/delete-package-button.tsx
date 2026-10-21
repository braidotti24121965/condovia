"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { deleteReceivedPackageAction } from "@/lib/gatehouse/actions";

/** Removes a package still waiting for pickup, after confirmation. Released packages cannot be removed. */
export function DeletePackageButton({ packageId, packageDescription }: { packageId: string; packageDescription: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();

  const handleDelete = () => {
    setConfirming(false);
    startDeleting(async () => {
      const result = await deleteReceivedPackageAction(packageId);
      if ("error" in result) setError(result.error ?? "Não foi possível excluir a encomenda.");
    });
  };

  return (
    <>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Button type="button" variant="ghost" size="compact" disabled={isDeleting} onClick={() => setConfirming(true)}>
        <Trash2 size={14} /> {isDeleting ? "Excluindo..." : "Excluir"}
      </Button>
      <ConfirmationDialog
        open={confirming}
        title="Excluir encomenda"
        description={`A encomenda "${packageDescription}" será removida do sistema e não poderá ser recuperada.`}
        confirmLabel="Excluir"
        onCancel={() => setConfirming(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}
