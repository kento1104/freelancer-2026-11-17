import test from "node:test";
import assert from "node:assert/strict";

import Force_BudgetSetter from "./Force_BudgetSetter.js";

test("hourly projects use the minimum budget regardless of budget group", () => {
    const project = {
        ProjectType: "Hourly",
        MinBudgetGroup: 5,
        MinBudget: 10,
        MaxBudget: 30,
    };

    Force_BudgetSetter(project);

    assert.equal(project.ProposalBudget, 10);
});

test("fixed projects use the minimum of the budget range", () => {
    const project = {
        ProjectType: "Fixed",
        MinBudgetGroup: 5,
        MinBudget: 10,
        MaxBudget: 50,
        MaxBudget_USD: 50,
    };

    Force_BudgetSetter(project);

    assert.equal(project.ProposalBudget, 10);
});

test("hourly projects use the minimum of the budget range", () => {
    const project = {
        ProjectType: "Hourly",
        MinBudgetGroup: 10,
        MinBudget: 10,
        MaxBudget: 20,
    };

    Force_BudgetSetter(project);

    assert.equal(project.ProposalBudget, 10);
});

test("fixed projects use a specific budget unchanged", () => {
    const project = {
        ProjectType: "Fixed",
        MinBudgetGroup: 50,
        MinBudget: 75,
        MaxBudget: 75,
        MaxBudget_USD: 75,
    };

    Force_BudgetSetter(project);

    assert.equal(project.ProposalBudget, 75);
});

test("hourly projects use a specific rate unchanged", () => {
    const project = {
        ProjectType: "Hourly",
        MinBudgetGroup: 5,
        MinBudget: 25,
        MaxBudget: 25,
    };

    Force_BudgetSetter(project);

    assert.equal(project.ProposalBudget, 25);
});
