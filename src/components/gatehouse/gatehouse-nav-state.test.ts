import { describe, expect, it } from "vitest";
import { isGatehouseNavItemActive } from "./gatehouse-nav-state";

const links = [
  "/app/gatehouse",
  "/app/gatehouse/access",
  "/app/gatehouse/authorizations",
  "/app/gatehouse/packages",
  "/app/gatehouse/visitors",
  "/app/gatehouse/providers",
  "/app/gatehouse/history",
  "/app/gatehouse/access-points",
];

describe("gatehouse navigation active state", () => {
  it.each(links)("marks only %s active", (pathname) => {
    expect(links.filter((href) => isGatehouseNavItemActive(pathname, href))).toEqual([pathname]);
  });
});

