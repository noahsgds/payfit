/**
 * fetch-seo-data.mjs
 *
 * Script to fetch real SEO data before building:
 *  1. Google Trends (free, no credits) via google-trends-api
 *  2. Apify SERP scraper (uses credits) — skipped if data is < CACHE_HOURS old
 *
 * Usage:
 *   node scripts/fetch-seo-data.mjs
 *   FORCE=true node scripts/fetch-seo-data.mjs   ← bypass cache, force Apify re-run
 *
 * Required env vars (in .env.local):
 *   APIFY_TOKEN=apify_api_xxxxx
 *
 * Optional:
 *   CACHE_HOURS=24   (default: 24)
 *   FORCE=true       (ignore cache, re-run Apify)
 */

import googleTrends from "google-trends-api";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Load .env.local manually (Next.js doesn't expose it to node scripts)
const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../.env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] ??= match[2].trim();
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, "../public/data/seo-data.json");
const CACHE_HOURS = parseInt(process.env.CACHE_HOURS ?? "24", 10);
const FORCE = process.env.FORCE === "true";
const APIFY_TOKEN = process.env.APIFY_TOKEN;

// Keywords to track on Google SERP (Apify)
const TRACKED_KEYWORDS = [
  "logiciel de paie",
  "logiciel RH PME",
  "logiciel paie TPE",
  "SIRH France",
  "gestion congés salariés",
  "bulletin de paie en ligne",
  "logiciel gestion RH",
  "paie automatique entreprise",
];

// Keywords for Google Trends comparison
const TRENDS_KEYWORDS = ["PayFit", "logiciel paie", "logiciel RH"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isDataFresh(data) {
  if (!data?.timestamp) return false;
  const age = (Date.now() - new Date(data.timestamp).getTime()) / 3600000;
  return age < CACHE_HOURS;
}

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function save(data) {
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
  console.log(`✓ Saved to ${OUTPUT_FILE}`);
}

// ─── Google Trends ────────────────────────────────────────────────────────────

async function fetchGoogleTrends() {
  console.log("→ Fetching Google Trends (free)...");
  try {
    const results = await Promise.all(
      TRENDS_KEYWORDS.map((keyword) =>
        googleTrends
          .interestOverTime({
            keyword,
            geo: "FR",
            startTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // last 90 days
          })
          .then((res) => {
            const parsed = JSON.parse(res);
            return parsed?.default?.timelineData ?? [];
          })
          .catch((err) => {
            console.warn(`  ✗ Trends fetch failed for "${keyword}":`, err.message);
            return [];
          })
      )
    );

    // Build unified timeline from first keyword's dates
    const timeline = results[0];
    if (!timeline.length) {
      console.warn("  ✗ No trends data returned, using empty array");
      return { labels: [], series: {} };
    }

    const labels = timeline.map((point) => {
      const d = new Date(parseInt(point.time) * 1000);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    });

    const series = {};
    TRENDS_KEYWORDS.forEach((keyword, i) => {
      series[keyword] = (results[i] ?? []).map(
        (point) => point.value?.[0] ?? 0
      );
    });

    console.log(`  ✓ Got ${labels.length} data points`);
    return { labels, series };
  } catch (err) {
    console.warn("  ✗ Google Trends failed:", err.message);
    return { labels: [], series: {} };
  }
}

// ─── Apify SERP Scraper (scraperlink/google-search-results-serp-scraper) ──────
// Actor ID: 563JCPLOqM1kMmbbP
// Pricing: ~$1 / 1000 searches → 8 keywords ≈ $0.008 per run
// Input:  { queries: string[], countryCode, languageCode }
// Output: [{ position, title, url, snippet, searchQuery }]

async function fetchApifySerp(existingSerp) {
  if (!APIFY_TOKEN) {
    console.log("→ No APIFY_TOKEN set, skipping SERP fetch");
    return existingSerp ?? [];
  }

  console.log(`→ Running scraperlink/google-search-results-serp-scraper for ${TRACKED_KEYWORDS.length} keywords...`);
  console.log(`  Est. cost: ~$${(TRACKED_KEYWORDS.length * 0.001).toFixed(3)}`);

  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/scraperlink~google-search-results-serp-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Timeout: 5 min (actor is fast ~2s/search)
        signal: AbortSignal.timeout(5 * 60 * 1000),
        body: JSON.stringify({
          queries: TRACKED_KEYWORDS,
          countryCode: "fr",
          languageCode: "fr",
          maxItems: TRACKED_KEYWORDS.length * 10, // top 10 per keyword
        }),
      }
    );

    if (!runRes.ok) {
      const body = await runRes.text();
      throw new Error(`Apify API ${runRes.status}: ${body}`);
    }

    const items = await runRes.json();
    console.log(`  ✓ Got ${items.length} results`);

    // For each keyword, find PayFit's position in the SERP
    const serpData = TRACKED_KEYWORDS.map((keyword) => {
      const kwResults = items.filter((item) => {
        const q = item.searchQuery ?? item.query ?? "";
        return q.toLowerCase() === keyword.toLowerCase();
      });

      const payfitResult = kwResults.find((r) =>
        (r.url ?? r.link ?? "").includes("payfit.com")
      );

      return {
        keyword,
        position: payfitResult?.position ?? payfitResult?.rank ?? null,
        url: payfitResult?.url ?? payfitResult?.link ?? null,
        title: payfitResult?.title ?? null,
      };
    });

    const found = serpData.filter((r) => r.position !== null).length;
    console.log(`  ✓ PayFit found in ${found}/${TRACKED_KEYWORDS.length} SERPs`);
    return serpData;
  } catch (err) {
    console.warn("  ✗ Apify SERP fetch failed:", err.message);
    return existingSerp ?? [];
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔍 PayFit SEO Data Fetcher");
  console.log(`   Cache TTL: ${CACHE_HOURS}h | Force: ${FORCE}`);
  console.log("");

  const cached = readCache();

  if (!FORCE && isDataFresh(cached)) {
    const age = ((Date.now() - new Date(cached.timestamp).getTime()) / 3600000).toFixed(1);
    console.log(`✓ Data is fresh (${age}h old, cache TTL: ${CACHE_HOURS}h). Skipping fetch.`);
    console.log("  Use FORCE=true to bypass cache.");
    return;
  }

  const [trends, serp] = await Promise.all([
    fetchGoogleTrends(),
    // For Apify: only re-run if cache is stale OR force
    fetchApifySerp(cached?.serp ?? []),
  ]);

  const output = {
    timestamp: new Date().toISOString(),
    trends,
    serp,
  };

  save(output);
  console.log("\n✅ Done!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
