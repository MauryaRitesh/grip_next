const fs = require("fs");

const baseReport = JSON.parse(fs.readFileSync("./lhci-base/manifest.json"));
const currentReport = JSON.parse(fs.readFileSync("./lhci-current/manifest.json"));

const thresholdForNewPages = 0.8;
let failBuild = false;

let markdownReport = "### 🔍 Lighthouse Performance Metrics Comparison\n";
markdownReport += "**(⚠️ Build fails if new branch scores are worse)**\n\n";
markdownReport += "| Page | Metric | Base Branch | Current Branch | Change |\n";
markdownReport += "|------|--------|-------------|---------------|--------|\n";

const getMetrics = (report) =>
  report.map(({ url, summary }) => ({
    url,
    fcp: summary.audits["first-contentful-paint"].numericValue / 1000, // Convert ms to seconds
    lcp: summary.audits["largest-contentful-paint"].numericValue / 1000,
    tbt: summary.audits["total-blocking-time"].numericValue,
    speedIndex: summary.audits["speed-index"].numericValue / 1000,
    cls: summary.audits["cumulative-layout-shift"].numericValue,
  }));

const baseMetrics = getMetrics(baseReport);
const currentMetrics = getMetrics(currentReport);

const baseMap = Object.fromEntries(baseMetrics.map((r) => [r.url, r]));

currentMetrics.forEach((current) => {
  const base = baseMap[current.url];

  const compare = (metric, lowerIsBetter = true) => {
    const baseValue = base ? base[metric] : "N/A";
    const currentValue = current[metric];

    let change = "✅ No Change";
    if (base) {
      const diff = (currentValue - baseValue).toFixed(2);
      if ((lowerIsBetter && currentValue > baseValue) || (!lowerIsBetter && currentValue < baseValue)) {
        change = `🔻 ${diff}`;
        failBuild = true;
      } else if (currentValue < baseValue) {
        change = `🔺 ${Math.abs(diff)}`;
      }
    } else {
      change = currentValue >= thresholdForNewPages ? "⚠️ Below Threshold" : "✅ New Page OK";
    }

    markdownReport += `| ${current.url} | ${metric.toUpperCase()} | ${baseValue} | ${currentValue.toFixed(2)} | ${change} |\n`;
  };

  compare("fcp");
  compare("lcp");
  compare("tbt", false);
  compare("speedIndex");
  compare("cls", false);
});

fs.writeFileSync("lhci-comparison.md", markdownReport);

if (failBuild) {
  console.error("⚠️ Performance metrics have worsened. Failing the build.");
  process.exit(1);
}
