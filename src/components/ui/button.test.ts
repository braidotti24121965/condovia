import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "./button";

describe("Button", () => {
  it("renders semantic variant and compact size classes while preserving props", () => {
    const html = renderToStaticMarkup(createElement(Button, { variant: "primary", size: "compact", type: "submit", "aria-label": "Salvar" }, "Salvar"));
    expect(html).toContain("button-primary");
    expect(html).toContain("button-compact");
    expect(html).toContain('type="submit"');
    expect(html).toContain('aria-label="Salvar"');
  });
});
