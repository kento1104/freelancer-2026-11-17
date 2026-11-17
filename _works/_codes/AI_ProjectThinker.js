import convertStringValuesRecursive from './_toolkit/convertStringValuesRecursive.js';
import stringToObject from './_toolkit/stringToObject.js';

import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_REQUEST_INTERVAL_MS = 4100;
const nextModelRequestAt = new Map();

export async function waitForModelRequestSlot(model, apikey) {
    const key = `${apikey}:${model}`;
    const now = Date.now();
    const requestAt = Math.max(now, nextModelRequestAt.get(key) || now);
    nextModelRequestAt.set(key, requestAt + MODEL_REQUEST_INTERVAL_MS);

    const waitMs = requestAt - now;
    if (waitMs > 0) {
        await new Promise(resolve => setTimeout(resolve, waitMs));
    }
}

export function normalizeProposalText(input) {
    if (typeof input !== "string" || input.trim() === "") {
        throw new Error("Gemini response must include a non-empty string ProposalText field.");
    }
    return input.replace(/\[.*?\]/g, '');
}

export function normalizeProposalTime(projectType, input) {
    const time = typeof input === "number"
        ? input
        : typeof input === "string" && input.trim() !== ""
            ? Number(input.trim())
            : NaN;
    const unit = projectType === "Fixed" ? "days" : projectType === "Hourly" ? "hours per week" : "";

    if (!unit || !Number.isSafeInteger(time) || time < 1) {
        throw new Error(
            `Gemini response must include ProposalTime as a positive whole number of ${unit || "days or hours"}.`
        );
    }

    return time;
}

export function buildProposalPrompt(
    projectInfo,
    profileAboutMe = "",
    profileSkills = "",
    profilePrompt = "",
) {
    if (typeof profilePrompt !== "string" || profilePrompt.trim() === "") {
        throw new Error("A proposal prompt is required from the selected profile sheet.");
    }
    if (typeof profileSkills !== "string" || profileSkills.trim() === "") {
        throw new Error("Profile skills are required to generate a proposal.");
    }

    return `Profile-specific proposal instructions from the profile sheet:
${profilePrompt.trim()}

Freelancer profile "about me":
${profileAboutMe}

Freelancer profile skills:
${profileSkills.trim()}

JSON string of Project:
${JSON.stringify(projectInfo)}

Required response format:
Return only one valid JSON object, without Markdown fences or extra text. It must include:
{
  "ProposalText": "A non-empty string containing the complete proposal.",
  "ProposalTime": 7
}
ProposalTime must be a positive whole number only, with no units or other text. For Fixed projects it is the delivery time in days; for Hourly projects it is the weekly limit in hours.
Do not include or change ProposalBudget; the server calculates it.
`;
}

export default async (
    projectInfo,
    model,
    apikey,
    profileAboutMe = "",
    profileSkills = "",
    profilePrompt = ""
) => {
    const text_prompt = buildProposalPrompt(projectInfo, profileAboutMe, profileSkills, profilePrompt);
    let result;
    let result_text;
    try {


        const modelClient = new GoogleGenerativeAI(apikey).getGenerativeModel({ model });

        await waitForModelRequestSlot(model, apikey);
        result = await modelClient.generateContent([text_prompt]);
        result_text = result.response.text();
    } catch (error) {
        throw error;
    }
    //console.log('result_text', result_text);  

    let result_object;
    try {
        result_object = convertStringValuesRecursive(stringToObject(result_text));            
    } catch (error) {
        console.log ('_Parsing Answer Error:', error);
        return null;
    }
    //console.log('result_object', result_object);
    result_object['ProposalText'] = normalizeProposalText(result_object?.ProposalText);
    result_object['ProposalTime'] = normalizeProposalTime(
        projectInfo['ProjectType'],
        result_object?.ProposalTime
    );

    Object.assign(projectInfo, result_object);
    //const prettyJsonString = JSON.stringify(projectInfo, null, 2); 

    //let reportData = prettyJsonString;
    //reportData = prettyJsonString.replace(/_/g, ' ');

    //console.log('projectInfo:',projectInfo);
    return projectInfo;
};
