"use client";

import { useEffect } from "react";

export function EmptyDocumentsPopup() {
  useEffect(() => {
    window.alert("Nenhum documento anexado para este destino.");
  }, []);

  return null;
}
