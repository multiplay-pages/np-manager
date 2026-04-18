import { execSync } from "child_process";
import fs from "fs";

const MAX_ITERATIONS = 3;

function runTests() {
  try {
    return execSync("npm test").toString();
  } catch (e) {
    return e.stdout.toString();
  }
}

function getDiff() {
  return execSync("git diff").toString();
}

(async () => {
  const task = JSON.parse(fs.readFileSync("agent/state/task.json")).task;

  let currentPrompt = fs.readFileSync("agent/prompts/codex-task.md", "utf-8")
    .replace("{{task}}", task);

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    console.log(`\n🚀 ITERACJA ${i + 1}`);

    console.log("\n👉 Wklej do Codex:\n");
    console.log(currentPrompt);

    await new Promise(r => process.stdin.once("data", r));

    const tests = runTests();
    const diff = getDiff();

    // prompt dla Claude
    let reviewPrompt = fs.readFileSync("agent/prompts/claude-review.md", "utf-8")
      .replace("{{task}}", task)
      .replace("{{diff}}", diff)
      .replace("{{tests}}", tests);

    console.log("\n👉 Wklej do Claude:\n");
    console.log(reviewPrompt);

    console.log("\n⏳ Wklej odpowiedź Claude i ENTER...");
    const input = await new Promise(resolve => {
      let data = "";
      process.stdin.on("data", chunk => {
        data += chunk.toString();
        if (data.includes("DECYZJA")) resolve(data);
      });
    });

    if (input.includes("OK")) {
      console.log("\n✅ Claude uznał zadanie za OK");
      break;
    }

    if (input.includes("FIX")) {
      const fixPrompt = input.split("FIX")[1];
      currentPrompt = fixPrompt;
      console.log("\n🔁 Poprawka wygenerowana");
    }
  }

  console.log("\n👉 FINALNY AUDYT → ChatGPT");
})();