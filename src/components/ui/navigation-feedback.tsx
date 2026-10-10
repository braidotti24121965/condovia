"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const scrollKey = "condovia:pending-scroll-y";

export function NavigationFeedback() {
  const [pending, setPending] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const savedScroll = sessionStorage.getItem(scrollKey);
    if (savedScroll) {
      sessionStorage.removeItem(scrollKey);
      requestAnimationFrame(() => window.scrollTo(0, Number(savedScroll)));
    }

    const handleSubmit = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.target === "_blank" || form.dataset.navigationFeedback === "off") return;
      window.setTimeout(() => {
        if (event.defaultPrevented) return;
        sessionStorage.setItem(scrollKey, String(window.scrollY));
        setPending(true);
      }, 0);
    };
    document.addEventListener("submit", handleSubmit, true);
    return () => document.removeEventListener("submit", handleSubmit, true);
  }, []);

  useEffect(() => setPending(false), [pathname]);

  if (!pending) return null;
  return <div className="cv-navigation-feedback" role="status" aria-live="polite">Salvando…</div>;
}
