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
