import { describe, expect, it } from "vitest";
import { evaluateVote } from "./quorum";

describe("statute change and member removal", () => {
  it("first call needs an absolute majority of associates present (counted by person)", () => {
    expect(evaluateVote({ matter: "statute_change", convocation: "first", totalAssociates: 30, presentAssociates: 15, presentVotes: 40, votesInFavor: 30 })).toMatchObject({ quorumMet: false });
    expect(evaluateVote({ matter: "statute_change", convocation: "first", totalAssociates: 30, presentAssociates: 16, presentVotes: 40, votesInFavor: 30 })).toMatchObject({ quorumMet: true, approved: true });
  });

  it("second call needs at least 1/3 of associates (counted by person)", () => {
    expect(evaluateVote({ matter: "member_removal", convocation: "second", totalAssociates: 30, presentAssociates: 10, presentVotes: 12, votesInFavor: 9 })).toMatchObject({ quorumMet: true, approved: true });
    expect(evaluateVote({ matter: "member_removal", convocation: "second", totalAssociates: 30, presentAssociates: 9, presentVotes: 12, votesInFavor: 9 })).toMatchObject({ quorumMet: false });
  });

  it("approval needs two thirds of the present votes, not of persons", () => {
    expect(evaluateVote({ matter: "statute_change", convocation: "second", totalAssociates: 30, presentAssociates: 12, presentVotes: 18, votesInFavor: 12 })).toMatchObject({ approved: true });
    expect(evaluateVote({ matter: "statute_change", convocation: "second", totalAssociates: 30, presentAssociates: 12, presentVotes: 18, votesInFavor: 11 })).toMatchObject({ approved: false });
  });
});

describe("property sale and dissolution", () => {
  it("needs every associate present, in any call", () => {
    expect(evaluateVote({ matter: "dissolution", convocation: "second", totalAssociates: 10, presentAssociates: 9, presentVotes: 12, votesInFavor: 12 })).toMatchObject({ quorumMet: false });
    expect(evaluateVote({ matter: "property_sale", convocation: "first", totalAssociates: 10, presentAssociates: 10, presentVotes: 14, votesInFavor: 10 })).toMatchObject({ quorumMet: true, approved: true });
  });
});

describe("other matters", () => {
  it("need a simple majority of the present votes", () => {
    expect(evaluateVote({ matter: "other", convocation: "first", totalAssociates: 10, presentAssociates: 6, presentVotes: 8, votesInFavor: 4 })).toMatchObject({ approved: false });
    expect(evaluateVote({ matter: "other", convocation: "first", totalAssociates: 10, presentAssociates: 6, presentVotes: 8, votesInFavor: 5 })).toMatchObject({ approved: true });
  });
});

describe("invalid counts", () => {
  it("rejects more votes in favor than present votes", () => {
    expect(evaluateVote({ matter: "other", convocation: "first", totalAssociates: 10, presentAssociates: 5, presentVotes: 5, votesInFavor: 6 })).toMatchObject({ quorumMet: false });
  });
});
