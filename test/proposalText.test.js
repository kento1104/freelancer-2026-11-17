import assert from "node:assert/strict";
import test from "node:test";

import {
    buildProposalPrompt,
    normalizeProposalTime,
    normalizeProposalText,
} from "../_works/_codes/AI_ProjectThinker.js";
import { isRetryableFeasibilityError } from "../_works/_codes/projectFeasibilityEvaluator.js";

test("validates and cleans generated proposal text", () => {
    assert.equal(normalizeProposalText("Hello [internal note] there"), "Hello  there");
    assert.throws(() => normalizeProposalText(undefined), /non-empty string ProposalText/i);
    assert.throws(() => normalizeProposalText("  "), /non-empty string ProposalText/i);
});

test("builds the proposal prompt from profile-sheet content", () => {
    const prompt = buildProposalPrompt(
        { ProjectTitle: "Example project" },
        "Profile summary",
        "JavaScript, Node.js",
        "Write a concise proposal.",
    );

    assert.match(prompt, /Profile-specific proposal instructions from the profile sheet:\nWrite a concise proposal\./);
    assert.match(prompt, /Profile summary/);
    assert.match(prompt, /JavaScript, Node\.js/);
    assert.match(prompt, /Example project/);
    assert.match(prompt, /"ProposalText": "A non-empty string/);
    assert.match(prompt, /"ProposalTime": 7/);
    assert.match(prompt, /For Fixed projects it is the delivery time in days; for Hourly projects it is the weekly limit in hours/);
    assert.match(prompt, /Do not include or change ProposalBudget/);
    assert.throws(
        () => buildProposalPrompt({ ProjectTitle: "Example project" }, "Profile summary", "JavaScript, Node.js", ""),
        /proposal prompt is required from the selected profile sheet/i,
    );
    assert.throws(
        () => buildProposalPrompt({ ProjectTitle: "Example project" }, "Profile summary", "", "Write a proposal."),
        /profile skills are required/i,
    );
});

test("normalizes numeric delivery-time values and rejects text that cannot fill the bid field", () => {
    assert.equal(normalizeProposalTime("Fixed", "7"), 7);
    assert.equal(normalizeProposalTime("Hourly", 20), 20);
    assert.throws(() => normalizeProposalTime("Fixed", "one week"), /positive whole number of days/);
    assert.throws(() => normalizeProposalTime("Hourly", 0), /positive whole number of hours per week/);
});

test("retries feasibility requests for transient Gemini server errors", () => {
    assert.equal(isRetryableFeasibilityError({ status: 503 }), true);
    assert.equal(isRetryableFeasibilityError({ status: 502 }), true);
    assert.equal(isRetryableFeasibilityError({ status: 403 }), false);
    assert.equal(isRetryableFeasibilityError(undefined), false);
});
