// Leonida Nights — screenshot maker (development tooling, not part of
// the entry: main.ts copies only app/ and screenshots/ to /output).
// Serves app/ on localhost:8080, opens it in Playwright's Chromium, and
// takes four real renders as JPEGs into screenshots/. Nothing is edited
// or composited: each file is exactly what the browser showed.
//
// Run from the repository root:  node shots.mjs
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(
  "/home/hatch/workspace/makefun/shot-tool/package.json",
);
const { chromium } = require("playwright-core");

const here = fileURLToPath(new URL(".", import.meta.url));
const home = process.env.HOME;
const chromePath = join(
  home,
  ".cache/ms-playwright/chromium-1255/chrome-linux64/chrome",
);

const BASE = "http://localhost:8080";

const SHOTS = [
  {
    file: "1-cover.jpg",
    viewport: { width: 1280, height: 720 },
    query:
      "?shot=cover&size=wide&layout=grid&grade=neon&caption=Neon%20Shore&p0=pier&p1=boulevard&p2=boulevard&p3=pier",
  },
  {
    file: "2-editor.jpg",
    viewport: { width: 1280, height: 800 },
    query:
      "?shot=editor&layout=diagonal&grade=sunset&caption=Sunset%20Heist&p0=pier&p1=boulevard&p2=pier",
  },
  {
    file: "3-portrait.jpg",
    viewport: { width: 1024, height: 1280 },
    query:
      "?shot=cover&size=portrait&layout=strip&grade=sunset&caption=Boulevard%20Queen&p0=boulevard&p1=pier&p2=boulevard",
  },
  {
    file: "4-square.jpg",
    viewport: { width: 1080, height: 1080 },
    query:
      "?shot=cover&size=square&layout=diagonal&grade=noir&caption=Midnight%20Run&p0=pier&p1=boulevard&p2=pier",
  },
];

async function waitForServer(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Not up yet.
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server did not answer at ${url}`);
}

async function main() {
  const server = spawn("node", ["serve.ts", "--port", "8080"], {
    cwd: here,
    stdio: "ignore",
  });
  try {
    await waitForServer(`${BASE}/index.html`);
    const browser = await chromium.launch({
      executablePath: existsSync(chromePath) ? chromePath : undefined,
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });
    try {
      for (const shot of SHOTS) {
        const context = await browser.newContext({ viewport: shot.viewport });
        const page = await context.newPage();
        await page.goto(`${BASE}/${shot.query}`, { waitUntil: "networkidle" });
        await page.waitForFunction(() => window.__shotReady === true, null, {
          timeout: 15000,
        });
        await page.waitForTimeout(300);
        await page.screenshot({
          path: join(here, "screenshots", shot.file),
          type: "jpeg",
          quality: 80,
        });
        console.log(`shot ${shot.file} done`);
        await context.close();
      }
    } finally {
      await browser.close();
    }
  } finally {
    server.kill();
  }
  console.log("screenshots done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
