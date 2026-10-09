"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Feedback } from "@/components/maintenance/management-ui";

const ClearContractFeedback = createContext<() => void>(() => {});

export function useClearContractFeedback() {
  return useContext(ClearContractFeedback);
}

export function ContractFeedback({ params, children }: { params: { error?: string; updated?: string }; children: ReactNode }) {
  const [showSuccess, setShowSuccess] = useState(Boolean(params.updated));
  return <ClearContractFeedback.Provider value={() => setShowSuccess(false)}>
    <Feedback params={{ error: params.error, updated: showSuccess ? params.updated : undefined }} />
    {children}
  </ClearContractFeedback.Provider>;
}
