"use client";

import { useState } from "react";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthorizationQrModal, type AuthorizationQrData } from "@/components/gatehouse/authorization-qr-modal";

interface Props {
  authorization: AuthorizationQrData;
}

export function AuthorizationQrButton({ authorization }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="compact"
        onClick={() => setOpen(true)}
        title="Visualizar e compartilhar QR Code"
      >
        <QrCode size={14} /> QR Code
      </Button>

      <AuthorizationQrModal
        open={open}
        onClose={() => setOpen(false)}
        authorization={authorization}
      />
    </>
  );
}
