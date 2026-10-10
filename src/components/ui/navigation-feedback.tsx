"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const scrollKey = "condovia:pending-scroll-y";

export function NavigationFeedback() {
  const [pending, setPending] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

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

      // Server Actions can complete through a partial navigation without
      // changing the pathname or query string. Never leave the global
      // indicator visible indefinitely in that case.
      window.setTimeout(() => setPending(false), 10000);
    };
    document.addEventListener("submit", handleSubmit, true);
    return () => document.removeEventListener("submit", handleSubmit, true);
  }, []);

  useEffect(() => setPending(false), [pathname, searchKey]);

  if (!pending) return null;
  return <div className="cv-navigation-feedback" role="status" aria-live="polite">Salvando…</div>;
}
