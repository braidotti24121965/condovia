import { describe, expect, it } from "vitest";
import { evaluateVote } from "./quorum";

describe("statute change and member removal", () => {
  it("first call needs an absolute majority of associates present", () => {
    expect(evaluateVote({ matter: "statute_change", convocation: "first", totalAssociates: 30, present: 15, inFavor: 12, })).toMatchObject({ quorumMet: false });
    expect(evaluateVote({ matter: "statute_change", convocation: "first", totalAssociates: 30, present: 16, inFavor: 12, })).toMatchObject({ quorumMet: true, approved: true });
  });

  it("second call needs at least 1/3 of associates", () => {
    expect(evaluateVote({ matter: "member_removal", convocation: "second", totalAssociates: 30, present: 10, inFavor: 7, })).toMatchObject({ quorumMet: true, approved: true });
    expect(evaluateVote({ matter: "member_removal", convocation: "second", totalAssociates: 30, present: 9, inFavor: 6, })).toMatchObject({ quorumMet: false });
  });

  it("approval needs two thirds of those present", () => {
    expect(evaluateVote({ matter: "statute_change", convocation: "second", totalAssociates: 30, present: 12, inFavor: 8, })).toMatchObject({ approved: true });
    expect(evaluateVote({ matter: "statute_change", convocation: "second", totalAssociates: 30, present: 12, inFavor: 7, })).toMatchObject({ approved: false });
  });
});

describe("property sale and dissolution", () => {
  it("needs every associate present, in any call", () => {
    expect(evaluateVote({ matter: "dissolution", convocation: "second", totalAssociates: 10, present: 9, inFavor: 9, })).toMatchObject({ quorumMet: false });
    expect(evaluateVote({ matter: "property_sale", convocation: "first", totalAssociates: 10, present: 10, inFavor: 7, })).toMatchObject({ quorumMet: true, approved: true });
  });
});

describe("other matters", () => {
  it("need a simple majority of those present", () => {
    expect(evaluateVote({ matter: "other", convocation: "first", totalAssociates: 10, present: 6, inFavor: 3, })).toMatchObject({ approved: false });
    expect(evaluateVote({ matter: "other", convocation: "first", totalAssociates: 10, present: 6, inFavor: 4, })).toMatchObject({ approved: true });
  });
});

describe("invalid counts", () => {
  it("rejects more votes in favor than present", () => {
    expect(evaluateVote({ matter: "other", convocation: "first", totalAssociates: 10, present: 5, inFavor: 6, })).toMatchObject({ quorumMet: false });
  });
});
