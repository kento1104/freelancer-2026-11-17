const sendButton = document.querySelector("#send-button");
const startButton = document.querySelector("#start-button");
const stopButton = document.querySelector("#stop-button");
const statusElement = document.querySelector("#status");
const resultsElement = document.querySelector("#results");
const projectCountElement = document.querySelector("#project-count");
const tableHeadElement = document.querySelector("thead");
const tableBodyElement = document.querySelector("tbody");
const destinationElement = document.querySelector("#destination");
const AUTO_FETCH_INTERVAL_MS = 10_000;
let requestInProgress = false;
let autoFetchActive = false;
let autoFetchCommandInProgress = false;
let autoFetchRunId = 0;
let autoFetchTimer = null;
let autoFetchAbortController = null;
const SERVER_BASE_URL = /^https?:$/.test(globalThis.location.protocol)
  ? globalThis.location.origin
  : globalThis.SERVER_BASE_URL.replace(/\/+$/, "");
destinationElement.textContent =
  `Server endpoint: ${SERVER_BASE_URL}/fetch_projects`;

async function postToServer(endpoint, signal) {
  const response = await fetch(
    `${SERVER_BASE_URL}${endpoint}`,
    { method: "POST", signal },
  );
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`Local server returned invalid JSON (HTTP ${response.status}).`);
  }
  if (!response.ok || !result?.ok) {
    throw new Error(result?.error || `Local server returned HTTP ${response.status}.`);
  }
  return result;
}

function flattenProject(project) {
  const fields = {};

  function visit(value, path) {
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length > 0
    ) {
      for (const [key, nestedValue] of Object.entries(value)) {
        visit(nestedValue, path ? `${path}.${key}` : key);
      }
      return;
    }

    fields[path] =
      value !== null && typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  }

  for (const [key, value] of Object.entries(project)) {
    visit(value, key);
  }

  return fields;
}

function renderProjects(projects) {
  const flattenedProjects = projects.map(flattenProject);
  const columns = [...new Set(flattenedProjects.flatMap(Object.keys))];

  tableHeadElement.replaceChildren();
  tableBodyElement.replaceChildren();

  const headerRow = document.createElement("tr");
  for (const column of columns) {
    const header = document.createElement("th");
    header.scope = "col";
    header.textContent = column;
    headerRow.append(header);
  }
  tableHeadElement.append(headerRow);

  for (const project of flattenedProjects) {
    const row = document.createElement("tr");
    for (const column of columns) {
      const cell = document.createElement("td");
      cell.textContent = project[column] ?? "";
      row.append(cell);
    }
    tableBodyElement.append(row);
  }

  projectCountElement.textContent = `(${projects.length})`;
  resultsElement.hidden = false;
}

async function fetchAndForwardProjects(
  runId = null,
  isAutoFetch = false,
  signal,
) {
  if (requestInProgress && !isAutoFetch) return false;
  if (!isAutoFetch) {
    requestInProgress = true;
    updateRepeatControls();
  }
  statusElement.dataset.state = "working";
  statusElement.textContent = "Fetching projects...";

  try {
    const result = await postToServer("/fetch_projects", signal);
    if (Array.isArray(result.projects)) {
      renderProjects(result.projects);
    }

    if (runId === null || runId === autoFetchRunId) {
      statusElement.dataset.state = "success";
      statusElement.textContent = result.message;
    }
    return true;
  } catch (error) {
    if (runId === null || runId === autoFetchRunId) {
      statusElement.dataset.state = "error";
      statusElement.textContent = error.message;
    }
    return false;
  } finally {
    if (!isAutoFetch) {
      requestInProgress = false;
      updateRepeatControls();
    }
  }
}

sendButton.addEventListener("click", () => void fetchAndForwardProjects());

function updateRepeatControls() {
  startButton.disabled =
    autoFetchActive || autoFetchCommandInProgress || requestInProgress;
  stopButton.disabled = !autoFetchActive || autoFetchCommandInProgress;
  sendButton.disabled =
    autoFetchActive || autoFetchCommandInProgress || requestInProgress;
}

startButton.addEventListener("click", () => {
  autoFetchActive = true;
  const runId = ++autoFetchRunId;
  autoFetchAbortController = new AbortController();
  updateRepeatControls();
  statusElement.dataset.state = "working";
  statusElement.textContent =
    "Frontend auto-fetch started. Requests will be sent every 10 seconds.";
  void fetchAndForwardProjects(runId, true, autoFetchAbortController.signal);
  autoFetchTimer = setInterval(() => {
    if (autoFetchActive && runId === autoFetchRunId) {
      void fetchAndForwardProjects(
        runId,
        true,
        autoFetchAbortController.signal,
      );
    }
  }, AUTO_FETCH_INTERVAL_MS);
});

stopButton.addEventListener("click", async () => {
  autoFetchActive = false;
  autoFetchRunId += 1;
  if (autoFetchTimer !== null) {
    clearInterval(autoFetchTimer);
    autoFetchTimer = null;
  }
  autoFetchAbortController?.abort();
  autoFetchAbortController = null;
  autoFetchCommandInProgress = true;
  updateRepeatControls();
  try {
    const result = await postToServer("/auto_fetch/stop");
    statusElement.dataset.state = "success";
    statusElement.textContent = result.message;
  } catch (error) {
    statusElement.dataset.state = "error";
    statusElement.textContent = error.message;
  } finally {
    autoFetchCommandInProgress = false;
    updateRepeatControls();
  }
});

updateRepeatControls();
