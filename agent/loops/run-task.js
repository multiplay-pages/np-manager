import { execSync } from "child_process";
import fs from "fs";

const MAX_ITERATIONS = 3;

function readUtf8(path) {
  return fs.readFileSync(path, "utf-8");
}

function runCommand(command) {
  try {
    return execSync(command, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (error) {
    const stdout = error?.stdout?.toString?.() ?? "";
    const stderr = error?.stderr?.toString?.() ?? "";
    return `${stdout}\n${stderr}`.trim();
  }
}

function runTests() {
  return runCommand("npm test");
}

function getDiff() {
  return runCommand("git diff");
}

function toBulletList(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "- brak";
  }

  return items.map((item) => `- ${item}`).join("\n");
}

function toCommaList(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "brak";
  }

  return items.join(", ");
}

function loadTask() {
  const raw = readUtf8("agent/state/task.json");
  const task = JSON.parse(raw);

  const requiredFields = [
    "id",
    "title",
    "goal",
    "scope",
    "allowedAreas",
    "forbiddenAreas",
    "constraints",
    "definitionOfDone",
  ];

  for (const field of requiredFields) {
    if (!(field in task)) {
      throw new Error(`Brakuje pola "${field}" w agent/state/task.json`);
    }
  }

  return task;
}

function buildTaskSummary(task) {
  return [
    `ID: ${task.id}`,
    `TYTUŁ: ${task.title}`,
    `CEL: ${task.goal}`,
    `SCOPE: ${task.scope}`,
    `DOZWOLONE OBSZARY: ${toCommaList(task.allowedAreas)}`,
    `ZABRONIONE OBSZARY: ${toCommaList(task.forbiddenAreas)}`,
    `OGRANICZENIA:\n${toBulletList(task.constraints)}`,
    `DEFINITION OF DONE:\n${toBulletList(task.definitionOfDone)}`,
  ].join("\n\n");
}

function renderTemplate(template, task, extraReplacements = {}) {
  const replacements = {
    "{{task}}": buildTaskSummary(task),
    "{{taskId}}": task.id,
    "{{taskTitle}}": task.title,
    "{{taskGoal}}": task.goal,
    "{{taskScope}}": task.scope,
    "{{taskAllowedAreas}}": toCommaList(task.allowedAreas),
    "{{taskForbiddenAreas}}": toCommaList(task.forbiddenAreas),
    "{{taskConstraints}}": toBulletList(task.constraints),
    "{{taskDefinitionOfDone}}": toBulletList(task.definitionOfDone),
    "{{diff}}": "",
    "{{tests}}": "",
    ...extraReplacements,
  };

  let output = template;

  for (const [key, value] of Object.entries(replacements)) {
    output = output.split(key).join(value);
  }

  return output;
}

function extractFixPrompt(input) {
  const marker = "PROMPT_DLA_CODEX:";
  const markerIndex = input.indexOf(marker);

  if (markerIndex === -1) {
    return input.trim();
  }

  return input.slice(markerIndex + marker.length).trim();
}

function readSinglePaste() {
  return new Promise((resolve) => {
    process.stdin.once("data", (chunk) => {
      resolve(chunk.toString());
    });
  });
}

(async () => {
  const task = loadTask();

  let currentPrompt = renderTemplate(
    readUtf8("agent/prompts/codex-task.md"),
    task
  );

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    console.log(`\n🚀 ITERACJA ${i + 1}/${MAX_ITERATIONS}`);
    console.log("\n==================================================");
    console.log("PROMPT DLA CODEX");
    console.log("==================================================\n");
    console.log(currentPrompt);

    console.log("\n⏳ Po wklejeniu promptu do Codex wciśnij ENTER...");
    await readSinglePaste();

    const tests = runTests();
    const diff = getDiff();

    const reviewPrompt = renderTemplate(
      readUtf8("agent/prompts/claude-review.md"),
      task,
      {
        "{{diff}}": diff || "(brak zmian w diff)",
        "{{tests}}": tests || "(brak outputu testów)",
      }
    );

    console.log("\n==================================================");
    console.log("PROMPT DLA CLAUDE REVIEW");
    console.log("==================================================\n");
    console.log(reviewPrompt);

    console.log(
      '\n⏳ Wklej CAŁĄ odpowiedź Claude jednym paste i naciśnij ENTER...'
    );
    const input = await readSinglePaste();

    if (input.includes("DECYZJA: OK")) {
      console.log("\n✅ Claude uznał zadanie za OK");
      console.log("\n👉 FINALNY AUDYT → ChatGPT");
      return;
    }

    if (input.includes("DECYZJA: FIX")) {
      currentPrompt = extractFixPrompt(input);
      console.log("\n🔁 Wczytano prompt naprawczy dla Codex");
      continue;
    }

    console.log(
      "\n⚠️ Nie wykryto jasnej decyzji 'DECYZJA: OK' ani 'DECYZJA: FIX'."
    );
    console.log("Traktuję odpowiedź jako FIX i przekazuję ją dalej do kolejnej iteracji.\n");
    currentPrompt = extractFixPrompt(input);
  }

  console.log("\n🛑 Osiągnięto maksymalną liczbę iteracji.");
  console.log("👉 Zrób ręczny audyt końcowy w ChatGPT.");
})().catch((error) => {
  console.error("\n❌ Błąd działania pipeline:");
  console.error(error);
  process.exit(1);
});