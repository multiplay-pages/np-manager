/**
 * NP-Manager Dev Pipeline V2 – Orchestrator
 *
 * Półautomat lokalny do pracy z AI.
 * - generuje prompt do modelu wykonawczego,
 * - zapisuje diff,
 * - pilnuje zakresu zmian (guardy),
 * - uruchamia walidację techniczną,
 * - generuje prompt do review,
 * - prowadzi historię cykli i raport etapu.
 *
 * Założenie domyślne: frontend-only.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync, execSync } = require("child_process");
const readline = require("readline");

// ─── Paths ───────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "..");
const PIPELINE_DIR = __dirname;
const PLAN_FILE = path.join(PIPELINE_DIR, "plan.json");
const STATE_FILE = path.join(PIPELINE_DIR, "state.json");
const LOGS_DIR = path.join(PIPELINE_DIR, "logs");
const PROMPTS_DIR = path.join(PIPELINE_DIR, "prompts");
const DIFFS_DIR = path.join(PIPELINE_DIR, "diffs");
const REPORTS_DIR = path.join(PIPELINE_DIR, "reports");

// Artefakty tworzone przez pipeline wykluczamy z diff/status na potrzeby review.
// Dzięki temu reviewer widzi głównie zmiany w aplikacji, a nie techniczne pliki pomocnicze.
const PIPELINE_ARTIFACTS_EXCLUDES = [
  ":(exclude)pipeline/prompts",
  ":(exclude)pipeline/diffs",
  ":(exclude)pipeline/reports",
  ":(exclude)pipeline/logs",
  ":(exclude)pipeline/state.json",
  ":(exclude)pipeline/plan.json",
];

// ─── Helpers: IO ────────────────────────────────────────────────────────────

function readJSON(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function writeFile(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

function ensureDirs() {
  [LOGS_DIR, PROMPTS_DIR, DIFFS_DIR, REPORTS_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

function timestamp() {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function tail(text, maxChars) {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return `... (pokazano ostatnie ${maxChars} znaków)\n${text.slice(-maxChars)}`;
}

// ─── Helpers: console ───────────────────────────────────────────────────────

function header(text) {
  const line = "═".repeat(60);
  console.log(`\n${line}`);
  console.log(`  ${text}`);
  console.log(`${line}`);
}

const info = (text) => console.log(`  ℹ  ${text}`);
const ok = (text) => console.log(`  ✅ ${text}`);
const warn = (text) => console.log(`  ⚠️  ${text}`);
const err = (text) => console.log(`  ❌ ${text}`);
const step = (text) => console.log(`  ➜  ${text}`);

// ─── Helpers: git ───────────────────────────────────────────────────────────

function runGit(args) {
  return execFileSync("git", args, {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
  }).toString();
}

function gitDiff() {
  try {
    const pathspec = ["--", ".", ...PIPELINE_ARTIFACTS_EXCLUDES];
    const diffAgainstHead = runGit(["diff", "HEAD", ...pathspec]);
    if (diffAgainstHead.trim()) return diffAgainstHead;
    const unstagedOnly = runGit(["diff", ...pathspec]);
    return unstagedOnly || null;
  } catch {
    return null;
  }
}

function gitStatus() {
  try {
    return runGit(["status", "--short", "--", ".", ...PIPELINE_ARTIFACTS_EXCLUDES]).trim();
  } catch {
    return null;
  }
}

function extractChangedFiles(diff) {
  if (!diff) return [];
  const result = new Set();
  const re = /^diff --git a\/(.+?) b\/(.+?)$/gm;
  let match;
  while ((match = re.exec(diff)) !== null) {
    result.add(match[2] || match[1]);
  }
  return [...result];
}

function diffSizeMetrics(diff) {
  if (!diff) return { files: 0, added: 0, removed: 0 };
  const files = extractChangedFiles(diff).length;
  let added = 0;
  let removed = 0;

  for (const line of diff.split("\n")) {
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if (line.startsWith("+")) added += 1;
    else if (line.startsWith("-")) removed += 1;
  }

  return { files, added, removed };
}

// ─── State ──────────────────────────────────────────────────────────────────

function initState(plan) {
  const firstPending = plan.stages.find((stage) => !stage.done);
  if (!firstPending) return null;
  return {
    current_stage_id: firstPending.id,
    cycle: 1,
    max_cycles: 3,
    last_updated: timestamp(),
    history: [],
  };
}

function loadOrInitState(plan) {
  const existing = readJSON(STATE_FILE);
  if (existing) return existing;
  const fresh = initState(plan);
  if (fresh) writeJSON(STATE_FILE, fresh);
  return fresh;
}

function saveState(state) {
  state.last_updated = timestamp();
  writeJSON(STATE_FILE, state);
}

// ─── Rules / guards ─────────────────────────────────────────────────────────

function matchesAny(filePath, patterns) {
  return patterns.some((pattern) => filePath === pattern || filePath.startsWith(pattern));
}

function checkForbiddenPaths(files, forbidden, allowedForStage) {
  const violations = [];
  for (const file of files) {
    if (matchesAny(file, allowedForStage)) continue;
    if (matchesAny(file, forbidden)) violations.push(file);
  }
  return violations;
}

function checkOversize(metrics, thresholds) {
  const warnings = [];
  if (thresholds.files && metrics.files > thresholds.files) {
    warnings.push(`Zmieniono ${metrics.files} plików (próg: ${thresholds.files})`);
  }
  const changedLines = metrics.added + metrics.removed;
  if (thresholds.lines && changedLines > thresholds.lines) {
    warnings.push(`Zmieniono ${changedLines} linii (próg: ${thresholds.lines})`);
  }
  return warnings;
}

// ─── Validation ─────────────────────────────────────────────────────────────

function runCommand(cmd) {
  const started = Date.now();
  try {
    const output = execSync(cmd, {
      cwd: ROOT,
      stdio: "pipe",
      env: { ...process.env, CI: "1", FORCE_COLOR: "0" },
    }).toString();

    return {
      cmd,
      status: "SUCCESS",
      durationMs: Date.now() - started,
      output: tail(output, 4000),
    };
  } catch (error) {
    const stdout = error.stdout ? error.stdout.toString() : "";
    const stderr = error.stderr ? error.stderr.toString() : "";
    const combined = `${stdout}\n${stderr}`.trim();

    const missingScript = /Missing script|No workspaces found|ENOWORKSPACES/i.test(combined);

    return {
      cmd,
      status: missingScript ? "SKIPPED" : "FAIL",
      durationMs: Date.now() - started,
      output: tail(combined, 4000),
    };
  }
}

function runValidation(validations) {
  const results = [];
  for (const validation of validations) {
    step(`Uruchamiam: ${validation.label}`);
    const result = runCommand(validation.cmd);
    result.label = validation.label;
    results.push(result);

    if (result.status === "SUCCESS") ok(`${validation.label} – OK (${result.durationMs}ms)`);
    else if (result.status === "SKIPPED") warn(`${validation.label} – pominięte (brak polecenia lub workspace)`);
    else err(`${validation.label} – FAIL`);
  }
  return results;
}

function formatValidationSummary(results) {
  if (!results.length) return "_(brak uruchomionej walidacji)_";
  return results
    .map((result) => {
      const head = `### ${result.label}\nKomenda: \`${result.cmd}\`\nStatus: **${result.status}** (${result.durationMs}ms)`;
      const body = result.output ? `\n\n\`\`\`\n${result.output}\n\`\`\`` : "";
      return head + body;
    })
    .join("\n\n");
}

// ─── Prompt generators ──────────────────────────────────────────────────────

function generateCodePrompt(stage, cycle, plan, lastFeedback = null) {
  const fixNote = lastFeedback
    ? `## ⚠️ Poprawki z poprzedniego cyklu (${cycle - 1})\n\nReviewer zgłosił:\n\n${lastFeedback}\n\nNapraw dokładnie te problemy. Nie dodawaj nic poza tym.`
    : "";

  const acceptanceCriteria = Array.isArray(stage.acceptance_criteria) && stage.acceptance_criteria.length
    ? stage.acceptance_criteria.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "_(brak – uzupełnij w plan.json)_";

  const forbiddenList = (plan.forbidden_paths || []).map((item) => `- ${item}`).join("\n");
  const allowPaths = Array.isArray(stage.allow_paths) && stage.allow_paths.length
    ? stage.allow_paths.map((item) => `- ${item}`).join("\n")
    : "- brak wyjątków";

  return `# Zadanie: ${stage.name}
Projekt: ${plan.project} | Cykl: ${cycle} | Tryb: ${stage.scope || plan.mode || "frontend-only"}

${fixNote}

## Opis zadania

${stage.description}

## Acceptance criteria

${acceptanceCriteria}

## Zasady – bezwzględne

- Zakres zmian: **${stage.scope || plan.mode || "frontend-only"}**
- Zabronione ścieżki:
${forbiddenList}
- Wyjątki dla tego etapu:
${allowPaths}
- NIE modyfikuj package.json / lockfile / backendu / prismy / shared, chyba że allow_paths mówi inaczej.
- NIE dodawaj nowych zależności npm.
- NIE importuj kodu backendu do frontendu.
- Używaj istniejących komponentów, hooków i publicznego kontraktu API.
- Zachowaj styl kodu i nazewnictwo z repo.
- Po zmianach pliki MUSZĄ być zapisane na dysku.

## Pliki do edycji (wskazówka)

${stage.files_hint || "Ustal na podstawie opisu zadania i struktury repo."}

## Format pracy

1. W 2-3 zdaniach opisz plan.
2. Edytuj pliki i zapisz je na dysku.
3. Na końcu wypisz:
   - listę zmienionych plików,
   - krótkie podsumowanie zmian.

Zacznij od razu. Nie pytaj o potwierdzenie.`;
}

function generateReviewPrompt({ stage, cycle, plan, diff, files, oversizeWarnings, validationResults }) {
  const acceptanceCriteria = Array.isArray(stage.acceptance_criteria) && stage.acceptance_criteria.length
    ? stage.acceptance_criteria.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "_(brak – oceń wg opisu zadania)_";

  const diffSection = diff && diff.trim()
    ? `## git diff\n\n\`\`\`diff\n${diff}\n\`\`\``
    : `## ⚠️ Brak zmian w git diff\n\nTo oznacza, że AI prawdopodobnie nie zapisało plików. W takim przypadku decyzja powinna być FIX.`;

  const filesSection = files.length
    ? `## Zmienione pliki (${files.length})\n\n${files.map((file) => `- \`${file}\``).join("\n")}`
    : `## Zmienione pliki\n\n_(brak wykrytych zmian)_`;

  const oversizeSection = oversizeWarnings.length
    ? `## ⚠️ Ostrzeżenia o rozmiarze zmian\n\n${oversizeWarnings.map((item) => `- ${item}`).join("\n")}`
    : "";

  const validationSection = `## Wyniki walidacji technicznej\n\n${formatValidationSummary(validationResults)}`;
  const anyFail = validationResults.some((result) => result.status === "FAIL");

  return `# Review zmian kodu
Etap: **${stage.name}** | Cykl: ${cycle} | Projekt: ${plan.project}

Jesteś senior developerem robiącym ostrą recenzję. Twoja rola: wyłapać błędy zanim trafią do commita.

## Zadanie które miał wykonać model

${stage.description}

## Acceptance criteria

${acceptanceCriteria}

## Zasady projektu

- Tryb: ${stage.scope || plan.mode || "frontend-only"}
- Zabronione ścieżki: ${(plan.forbidden_paths || []).map((item) => `\`${item}\``).join(", ")}
- Brak nowych zależności npm
- Brak importów z backendu do frontendu
- Przy jakiejkolwiek wątpliwości wybierasz FIX

${filesSection}

${oversizeSection}

${diffSection}

${validationSection}

## Checklista review – odpowiedz na każdy punkt (TAK / NIE / N/D)

1. [ ] Feature działa zgodnie z opisem zadania?
2. [ ] Wszystkie acceptance criteria są spełnione?
3. [ ] Zakres zmian jest zgodny z frontend-only / allow_paths?
4. [ ] Wyniki walidacji są akceptowalne? ${anyFail ? "**(są FAIL-e – prawdopodobnie FIX)**" : ""}
5. [ ] Brak nowych zależności npm?
6. [ ] Brak importów z backendu do frontendu?
7. [ ] Kod jest czytelny i spójny z istniejącym stylem?
8. [ ] Brak śmieciowych zmian (np. niepowiązany reformat, martwy kod, zakomentowane bloki)?
9. [ ] UX ma sens – loading / error / disabled / empty state są obsłużone?
10. [ ] Brak oczywistych błędów (null reference, niepoprawne typy, brakujące props)?

## Twoja decyzja

Na końcu odpowiedzi wpisz dokładnie jedną linię:

DECYZJA: OK

albo

DECYZJA: FIX

Jeśli wybierasz FIX, po tej linii dodaj sekcję:

Co poprawić:
- ...
- ...

Reguły bezwzględne:
- jeśli walidacja zwróciła FAIL → FIX
- jeśli acceptance criteria nie są jednoznacznie spełnione → FIX
- jeśli masz jakąkolwiek wątpliwość → FIX`;
}

function generateStageReport(stage, state) {
  const history = state.history.filter((entry) => entry.stage_id === stage.id);
  const cycles = history.length;
  const finalDecision = history[history.length - 1]?.decision || "UNKNOWN";

  const historyText = history
    .map((entry, index) => {
      const feedbackBlock = entry.feedback
        ? `\n- Feedback reviewera:\n${entry.feedback
            .split("\n")
            .map((line) => `  > ${line}`)
            .join("\n")}`
        : "";
      return `### Cykl ${index + 1}\n- Decyzja: **${entry.decision}**\n- Czas: ${entry.timestamp}${feedbackBlock}`;
    })
    .join("\n\n");

  return `# Raport etapu: ${stage.name}
Projekt: NP-Manager | Data: ${timestamp()} | ID etapu: ${stage.id}

## Opis zadania

${stage.description}

## Wynik

- Liczba cykli: **${cycles}**
- Finalna decyzja: **${finalDecision}**
- Status: ${finalDecision === "OK" ? "✅ Gotowe do commitu" : "❌ Wymaga interwencji"}

## Historia cykli

${historyText || "_(brak historii)_"}

---

## Prompt do finalnego audytu (ChatGPT)

Wklej ten raport do ChatGPT z prośbą:

> Jesteś architektem systemowym. Zrób audyt tego ukończonego etapu NP-Managera.
> Oceń: jakość zmian, zgodność z zakresem ${stage.scope || "frontend-only"}, ryzyka architektoniczne,
> sugestie dla kolejnych etapów oraz potencjalne regresje.`;
}

// ─── Actions ────────────────────────────────────────────────────────────────

async function actionGenerateCodePrompt(stage, state, plan) {
  const lastEntry = state.history.filter((entry) => entry.stage_id === stage.id).slice(-1)[0];
  const lastFeedback = lastEntry?.decision === "FIX" ? lastEntry.feedback : null;

  const prompt = generateCodePrompt(stage, state.cycle, plan, lastFeedback);
  const outFile = path.join(PROMPTS_DIR, "codex-prompt.md");
  writeFile(outFile, prompt);

  ok("Prompt wygenerowany");
  console.log(`     📄 pipeline/prompts/codex-prompt.md\n`);
  console.log("  Co teraz:");
  step("1. Otwórz plik codex-prompt.md");
  step("2. Skopiuj całą zawartość (Ctrl+A, Ctrl+C)");
  step("3. Wklej do Codex albo Claude Code");
  step("4. Poczekaj aż AI zapisze pliki na dysku");
  step("5. Wróć tutaj i wybierz opcję [2]");
}

async function actionRunValidationAndReview(stage, state, plan, rl) {
  info("Krok 1/3: sprawdzam zmiany w kodzie aplikacji (bez artefaktów pipeline'u)...");

  const status = gitStatus();
  if (!status) {
    warn("git nie wykrywa żadnych zmian w kodzie aplikacji.");
    warn("Sprawdź w VS Code, czy AI faktycznie zapisało pliki.");
    warn("Jeśli pliki mają kropkę na zakładce – zapisz je (Ctrl+S) i uruchom [2] ponownie.");
    const cont = await ask(rl, "  Kontynuować mimo to? (t/N): ");
    if (cont.toLowerCase() !== "t") return;
  } else {
    console.log();
    status.split("\n").forEach((line) => console.log(`     ${line}`));
    console.log();
  }

  const diff = gitDiff();
  const diffFile = path.join(DIFFS_DIR, `etap-${stage.id}-cykl-${state.cycle}.diff`);

  if (diff) {
    writeFile(diffFile, diff);
    ok(`Diff zapisany: pipeline/diffs/etap-${stage.id}-cykl-${state.cycle}.diff`);
  } else {
    writeFile(diffFile, "BRAK ZMIAN\n");
    warn("Diff pusty – zapisuję ślad audytowy.");
  }

  info("Krok 2/3: kontrola zakresu zmian (guardy)...");

  const files = extractChangedFiles(diff);
  const forbidden = plan.forbidden_paths || [];
  const allowedForStage = stage.allow_paths || [];
  const violations = checkForbiddenPaths(files, forbidden, allowedForStage);

  const metrics = diffSizeMetrics(diff);
  const oversizeWarnings = checkOversize(metrics, plan.oversize_warning || {});

  if (violations.length) {
    console.log();
    err(`🛑 HARD STOP – wykryto ${violations.length} naruszenie(a) forbidden_paths:`);
    violations.forEach((file) => console.log(`        - ${file}`));
    console.log();
    warn("Walidacja i prompt do review NIE zostaną wygenerowane.");
    warn("Najpierw cofnij niedozwolone zmiany albo dopisz wyjątek do allow_paths.");
    console.log();
    console.log("  Gotowe komendy do cofnięcia zmian:");
    violations.forEach((file) => console.log(`        git checkout -- \"${file}\"`));
    console.log();
    console.log("  Po poprawie uruchom opcję [2] ponownie.");
    console.log();
    info(`Ślad audytowy już zapisany w: pipeline/diffs/etap-${stage.id}-cykl-${state.cycle}.diff`);
    return;
  }

  if (files.length) ok(`Scope OK – brak naruszeń forbidden_paths (${files.length} plików)`);
  if (oversizeWarnings.length) {
    warn("Ostrzeżenia o rozmiarze zmian:");
    oversizeWarnings.forEach((item) => console.log(`     - ${item}`));
  }

  info("Krok 3/3: walidacja techniczna (build/test)...");
  const validations = plan.validation || [];
  let validationResults = [];

  if (!validations.length) {
    warn("Brak komend walidacji w plan.json – pomijam.");
  } else {
    console.log();
    validationResults = runValidation(validations);
    const reportFile = path.join(REPORTS_DIR, `etap-${stage.id}-cykl-${state.cycle}.md`);
    const content = `# Walidacja – etap ${stage.id}, cykl ${state.cycle}\nData: ${timestamp()}\n\n${formatValidationSummary(validationResults)}\n`;
    writeFile(reportFile, content);
    ok(`Raport walidacji: pipeline/reports/etap-${stage.id}-cykl-${state.cycle}.md`);
  }

  const reviewPrompt = generateReviewPrompt({
    stage,
    cycle: state.cycle,
    plan,
    diff,
    files,
    oversizeWarnings,
    validationResults,
  });

  const reviewFile = path.join(PROMPTS_DIR, "review-prompt.md");
  writeFile(reviewFile, reviewPrompt);

  console.log();
  ok("Prompt do review wygenerowany");
  console.log(`     📄 pipeline/prompts/review-prompt.md\n`);
  console.log("  Co teraz:");
  step("1. Otwórz review-prompt.md");
  step("2. Skopiuj całą zawartość");
  step("3. Wklej do drugiego modelu AI (nie tego, który pisał kod)");
  step("4. Odbierz decyzję: OK albo FIX");
  step("5. Wróć tutaj i wybierz opcję [3]");
}

async function actionInputDecision(stage, state, rl) {
  const raw = await ask(rl, "  Wpisz decyzję AI (OK / FIX): ");
  const decision = raw.trim().toUpperCase();

  if (decision !== "OK" && decision !== "FIX") {
    err("Nieprawidłowa decyzja. Wpisz dokładnie OK lub FIX.");
    return;
  }

  let feedback = null;
  if (decision === "FIX") {
    console.log();
    info("Wklej sekcję 'Co poprawić' od reviewera.");
    info("Każda linia → Enter. Gdy skończysz → wpisz KONIEC i Enter.\n");
    const lines = [];
    while (true) {
      const line = await ask(rl, "  > ");
      if (line.trim().toUpperCase() === "KONIEC") break;
      lines.push(line);
    }
    feedback = lines.join("\n").trim() || "(brak szczegółów od reviewera)";
  }

  state.history.push({
    stage_id: stage.id,
    cycle: state.cycle,
    decision,
    feedback,
    timestamp: timestamp(),
  });

  if (decision === "OK") {
    console.log();
    ok(`Etap \"${stage.name}\" zaliczony po ${state.cycle} ${state.cycle === 1 ? "cyklu" : "cyklach"}`);

    const planLive = readJSON(PLAN_FILE);
    const stageInPlan = planLive.stages.find((item) => item.id === stage.id);
    if (stageInPlan) stageInPlan.done = true;
    writeJSON(PLAN_FILE, planLive);

    const nextStage = planLive.stages.find((item) => !item.done);
    if (nextStage) {
      state.current_stage_id = nextStage.id;
      state.cycle = 1;
      info(`Następny etap: [${nextStage.id}] ${nextStage.name}`);
    } else {
      state.current_stage_id = null;
      ok("Wszystkie etapy z planu ukończone!");
    }

    const report = generateStageReport(stage, state);
    const reportFile = path.join(LOGS_DIR, `etap-${stage.id}-raport.md`);
    writeFile(reportFile, report);
    ok(`Raport etapu: pipeline/logs/etap-${stage.id}-raport.md`);
    console.log();
    info("Następne kroki:");
    step("1. Wklej raport do ChatGPT do finalnego audytu architektonicznego");
    step(`2. Jeśli audyt OK – zrób commit, np. git add . && git commit -m \"feat: ${stage.name}\"`);
    step("3. git push i uruchom pipeline ponownie dla następnego etapu");
  } else {
    if (state.cycle >= state.max_cycles) {
      console.log();
      err(`Osiągnięto limit ${state.max_cycles} cykli dla tego etapu.`);
      warn("Co możesz zrobić:");
      step("A) Rozbij etap na mniejsze zadania w plan.json");
      step("B) Popraw ręcznie kod i wróć do opcji [3] z decyzją OK");
      step("C) Cofnij zmiany i zacznij etap od nowa z lepszym opisem");
    } else {
      state.cycle += 1;
      console.log();
      info(`Cykl ${state.cycle}/${state.max_cycles} – wybierz [1], aby wygenerować nowy prompt z poprawkami.`);
    }
  }

  saveState(state);
}

async function actionShowReport(stage) {
  const reportFile = path.join(LOGS_DIR, `etap-${stage.id}-raport.md`);
  if (!fs.existsSync(reportFile)) {
    warn("Raport jeszcze nie istnieje. Najpierw zakończ etap decyzją OK.");
    return;
  }
  const content = fs.readFileSync(reportFile, "utf8");
  console.log(`\n${content}`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

function getCurrentStage(plan, state) {
  if (!state?.current_stage_id) return null;
  return plan.stages.find((stage) => stage.id === state.current_stage_id) || null;
}

async function main() {
  ensureDirs();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  while (true) {
    const plan = readJSON(PLAN_FILE);
    if (!plan) {
      err("Nie znaleziono pipeline/plan.json.");
      rl.close();
      process.exit(1);
    }

    const state = loadOrInitState(plan);
    if (!state || !state.current_stage_id) {
      console.log();
      ok("Wszystkie etapy z planu są zakończone. Brak pracy do wykonania.");
      info("Dodaj nowe etapy w pipeline/plan.json i uruchom skrypt ponownie.");
      rl.close();
      process.exit(0);
    }

    const stage = getCurrentStage(plan, state);
    if (!stage) {
      err(`Nie znaleziono etapu ID=${state.current_stage_id} w plan.json.`);
      rl.close();
      process.exit(1);
    }

    header("NP-Manager Pipeline V2");
    console.log(`  Etap:  [${stage.id}] ${stage.name}`);
    console.log(`  Cykl:  ${state.cycle}/${state.max_cycles}`);
    console.log(`  Tryb:  ${stage.scope || plan.mode || "frontend-only"}`);
    console.log(`  Czas:  ${timestamp()}`);
    console.log(`${"─".repeat(60)}`);
    console.log("  [1] Generuj prompt dla AI (kod)");
    console.log("  [2] AI skończyło – diff + walidacja + review prompt");
    console.log("  [3] Wklej decyzję AI (OK / FIX)");
    console.log("  [4] Pokaż raport etapu");
    console.log("  [Q] Wyjdź");
    console.log();

    const choice = (await ask(rl, "  Wybierz opcję: ")).trim().toLowerCase();
    console.log();

    try {
      switch (choice) {
        case "1":
          await actionGenerateCodePrompt(stage, state, plan);
          break;
        case "2":
          await actionRunValidationAndReview(stage, state, plan, rl);
          break;
        case "3":
          await actionInputDecision(stage, state, rl);
          break;
        case "4":
          await actionShowReport(stage);
          break;
        case "q":
          info("Do zobaczenia!");
          rl.close();
          process.exit(0);
        default:
          warn("Nieznana opcja. Wpisz 1, 2, 3, 4 lub Q.");
      }
    } catch (error) {
      err(`Błąd w trakcie akcji: ${error.message}`);
    }

    console.log();
  }
}

main().catch((error) => {
  console.error(`\nBłąd krytyczny pipeline'u: ${error.message}`);
  process.exit(1);
});
