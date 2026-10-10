"use client";

import { useEffect, useState } from "react";

const scrollKey = "condovia:pending-scroll-y";

export function NavigationFeedback() {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const savedScroll = sessionStorage.getItem(scrollKey);
    if (savedScroll) {
      sessionStorage.removeItem(scrollKey);
      requestAnimationFrame(() => window.scrollTo(0, Number(savedScroll)));
    }

    const handleSubmit = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.target === "_blank" || form.dataset.navigationFeedback === "off") return;
      sessionStorage.setItem(scrollKey, String(window.scrollY));
      setPending(true);
    };
    document.addEventListener("submit", handleSubmit, true);
    return () => document.removeEventListener("submit", handleSubmit, true);
  }, []);

  if (!pending) return null;
  return <div className="cv-navigation-feedback" role="status" aria-live="polite">Salvando…</div>;
}
