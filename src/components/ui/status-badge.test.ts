import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders a non-interactive semantic status", () => {
    const html = renderToStaticMarkup(createElement(StatusBadge, { variant: "success" }, "Ativo"));
    expect(html).toContain("status-badge-success");
    expect(html).toContain(">Ativo</span>");
    expect(html).not.toContain("button");
  });
});
