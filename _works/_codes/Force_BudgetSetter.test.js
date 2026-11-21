import test from "node:test";
import assert from "node:assert/strict";

import Force_BudgetSetter from "./Force_BudgetSetter.js";

test("hourly projects in budget group 20 use the minimum budget", () => {
    const project = {
        ProjectType: "Hourly",
        MinBudgetGroup: 20,
        MinBudget: 20,
        MaxBudget: 30,
    };

    Force_BudgetSetter(project);

    assert.equal(project.ProposalBudget, 20);
});

test("fixed projects use the lowest bid in the selected budget range", () => {
    const project = {
        ProjectType: "Fixed",
        MinBudgetGroup: 5,
        MinBudget: 10,
        MaxBudget: 50,
        MaxBudget_USD: 50,
    };

    Force_BudgetSetter(project);

    assert.equal(project.ProposalBudget, 22);
});

test("hourly projects use the lowest bid in the selected budget range", () => {
    const project = {
        ProjectType: "Hourly",
        MinBudgetGroup: 10,
        MinBudget: 10,
        MaxBudget: 20,
    };

    Force_BudgetSetter(project);

    assert.equal(project.ProposalBudget, 10);
});
