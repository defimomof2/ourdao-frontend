#!/usr/bin/env node
// Measures the client JS/CSS actually shipped from .next/static and, in CI,
// compares it against a baseline captured from main. Next 16's Turbopack
// build no longer prints a per-route size table (removed in v16.0.0), so this
// reads the built static assets directly instead of parsing build output.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { gzipSync } from "node:zlib";

const STATIC_DIR = ".next/static";
const TRACKED_EXTENSIONS = new Set([".js", ".css"]);
const CURRENT_FILE = "bundle-size-current.json";
const BASELINE_FILE = "bundle-size-baseline.json";

// A regression only fails the build once it clears both the relative and
// absolute floor -- this keeps content-hash-only rebuilds and few-KB noise
// from tripping the check, while still catching real regressions.
const MAX_RELATIVE_INCREASE = 0.05; // 5%
const MIN_ABSOLUTE_INCREASE_BYTES = 10 * 1024; // 10 KB gzip

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (TRACKED_EXTENSIONS.has(extname(entry.name))) out.push(full);
  }
  return out;
}

function formatKB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function measure() {
  if (!existsSync(STATIC_DIR)) {
    console.error(`${STATIC_DIR} not found -- run \`npm run build\` first.`);
    process.exit(1);
  }
  const files = walk(STATIC_DIR);
  let rawBytes = 0;
  let gzipBytes = 0;
  for (const file of files) {
    const buf = readFileSync(file);
    rawBytes += buf.length;
    gzipBytes += gzipSync(buf, { level: 9 }).length;
  }
  const stats = {
    generatedAt: new Date().toISOString(),
    sha: process.env.GITHUB_SHA ?? null,
    fileCount: files.length,
    rawBytes,
    gzipBytes,
  };
  writeFileSync(CURRENT_FILE, JSON.stringify(stats, null, 2));
  console.log(
    `Measured ${files.length} static asset(s): ${formatKB(rawBytes)} raw / ${formatKB(gzipBytes)} gzip`,
  );
}

function appendSummary(content) {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (!path) return;
  writeFileSync(path, `${content}\n`, { flag: "a" });
}

function report() {
  if (!existsSync(CURRENT_FILE)) {
    console.error(`${CURRENT_FILE} not found -- run \`measure\` first.`);
    process.exit(1);
  }
  const current = JSON.parse(readFileSync(CURRENT_FILE, "utf8"));
  const lines = ["## Bundle size", ""];

  if (!existsSync(BASELINE_FILE)) {
    lines.push(
      "No baseline from `main` yet -- reporting current size only.",
      "",
      "| Metric | Size |",
      "| --- | --- |",
      `| Static assets (gzip) | ${formatKB(current.gzipBytes)} |`,
      `| Static assets (raw) | ${formatKB(current.rawBytes)} |`,
    );
    const text = lines.join("\n");
    console.log(text);
    appendSummary(text);
    return;
  }

  const baseline = JSON.parse(readFileSync(BASELINE_FILE, "utf8"));
  const deltaGzip = current.gzipBytes - baseline.gzipBytes;
  const deltaRaw = current.rawBytes - baseline.rawBytes;
  const deltaPct = baseline.gzipBytes === 0 ? 0 : deltaGzip / baseline.gzipBytes;
  const sign = (n) => (n >= 0 ? "+" : "");

  lines.push(
    "| Metric | Baseline (main) | This build | Change |",
    "| --- | --- | --- | --- |",
    `| Static assets (gzip) | ${formatKB(baseline.gzipBytes)} | ${formatKB(current.gzipBytes)} | ${sign(deltaGzip)}${formatKB(deltaGzip)} (${sign(deltaPct)}${(deltaPct * 100).toFixed(1)}%) |`,
    `| Static assets (raw) | ${formatKB(baseline.rawBytes)} | ${formatKB(current.rawBytes)} | ${sign(deltaRaw)}${formatKB(deltaRaw)} |`,
    "",
  );

  const failed = deltaGzip > MIN_ABSOLUTE_INCREASE_BYTES && deltaPct > MAX_RELATIVE_INCREASE;
  if (failed) {
    lines.push(
      `**Gzip size grew ${(deltaPct * 100).toFixed(1)}%, over the ${(MAX_RELATIVE_INCREASE * 100).toFixed(0)}% / ${formatKB(MIN_ABSOLUTE_INCREASE_BYTES)} budget.** ` +
        "If that's expected, say why in the PR description; if not, check for an unintentionally bundled dependency.",
    );
  } else {
    lines.push(
      `Within budget (fails only above +${(MAX_RELATIVE_INCREASE * 100).toFixed(0)}% *and* +${formatKB(MIN_ABSOLUTE_INCREASE_BYTES)} gzip).`,
    );
  }

  const text = lines.join("\n");
  console.log(text);
  appendSummary(text);

  if (failed) process.exit(1);
}

const command = process.argv[2];
if (command === "measure") measure();
else if (command === "report") report();
else {
  console.error("Usage: bundle-size.mjs <measure|report>");
  process.exit(1);
}
