"use client";

import { useRef } from "react";

export function AutoSubmitSelect({
  name,
  defaultValue,
  children,
}: {
  name: string;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} method="get" className="cv-form cv-maintenance-inline-form">
      <label>
        Vincular a
        <select name={name} defaultValue={defaultValue} onChange={() => formRef.current?.requestSubmit()}>
          {children}
        </select>
      </label>
    </form>
  );
}
