const fs = require("fs");

// ✅ Read manifest.json files for base and current branches
const baseManifest = JSON.parse(fs.readFileSync("./lhci-base/manifest.json"));
const currentManifest = JSON.parse(fs.readFileSync("./lhci-current/manifest.json"));

// ✅ Find representative runs
const getRepresentativeRun = (manifest) =>
  manifest.find((entry) => entry.isRepresentativeRun) || manifest[0];

const baseRun = getRepresentativeRun(baseManifest);
const currentRun = getRepresentativeRun(currentManifest);

// ✅ Read corresponding `.report.json` files for detailed metrics
const baseReport = JSON.parse(fs.readFileSync(baseRun.jsonPath));
const currentReport = JSON.parse(fs.readFileSync(currentRun.jsonPath));

// ✅ Extract summary metrics from `manifest.json`
const extractSummary = (run) => ({
  performance: run?.summary?.performance ?? "N/A",
  accessibility: run?.summary?.accessibility ?? "N/A",
  bestPractices: run?.summary?.["best-practices"] ?? "N/A",
  seo: run?.summary?.seo ?? "N/A",
});

const baseSummary = extractSummary(baseRun);
const currentSummary = extractSummary(currentRun);

// ✅ Extract detailed performance metrics from `report.json`
const extractDetailedMetrics = (report) => ({
  "First Contentful Paint": report.audits["first-contentful-paint"]?.numericValue ?? "N/A",
  "Time to Interactive": report.audits["interactive"]?.numericValue ?? "N/A",
  "First Meaningful Paint": report.audits["first-meaningful-paint"]?.numericValue ?? "N/A",
  "Max Potential First Input Delay": report.audits["max-potential-fid"]?.numericValue ?? "N/A",
  "Total Blocking Time": report.audits["total-blocking-time"]?.numericValue ?? "N/A",
  "Speed Index": report.audits["speed-index"]?.numericValue ?? "N/A",
  "Largest Contentful Paint": report.audits["largest-contentful-paint"]?.numericValue ?? "N/A",
  "Cumulative Layout Shift": report.audits["cumulative-layout-shift"]?.numericValue ?? "N/A",
});

const baseDetailed = extractDetailedMetrics(baseReport);
const currentDetailed = extractDetailedMetrics(currentReport);

// ✅ Generate markdown report
let markdownReport = "### Lighthouse Metrics \n";
// markdownReport += "**(⚠️ Warnings shown if performance decreases, but build will NOT fail)**\n\n";

// 📊 **Overall Scores**
markdownReport += "#### 📊 Overall Scores\n";
markdownReport += "| Metric | Base Branch | Current Branch | Change |\n";
markdownReport += "|--------|-------------|---------------|--------|\n";

const compare = (metric, baseValue, currentValue) => {
  // Convert to two decimal places if value is a number
  const formatValue = (value) => 
    typeof value === "number" ? value.toFixed(2) : value;

  const formattedBase = formatValue(baseValue);
  const formattedCurrent = formatValue(currentValue);

  let change = "✅ No Change";
  if (baseValue !== "N/A" && currentValue !== "N/A") {
    if (currentValue > baseValue) {
      change = `🔺 +${((currentValue - baseValue) / baseValue * 100).toFixed(2)}%`;
    } else if (currentValue < baseValue) {
      change = `⚠️ Warning: 🔻 ${((baseValue - currentValue) / baseValue * 100).toFixed(2)}%`;
    }
  }

  return `| ${metric} | ${formattedBase} | ${formattedCurrent} | ${change} |\n`;
};

// Add overall scores
["performance", "accessibility", "bestPractices", "seo"].forEach((metric) => {
  markdownReport += compare(metric.toUpperCase(), baseSummary[metric], currentSummary[metric]);
});

// ⏳ **Detailed Metrics**
markdownReport += "\n#### ⏳ Performance Metrics \n";
markdownReport += "| Metric | Base Branch | Current Branch | Change |\n";
markdownReport += "|--------|-------------|---------------|--------|\n";

// Add detailed performance metrics
Object.keys(baseDetailed).forEach((metric) => {
  markdownReport += compare(metric, baseDetailed[metric], currentDetailed[metric]);
});

// ✅ Write to markdown file
fs.writeFileSync("lhci-comparison.md", markdownReport);

console.warn("⚠️ Performance warnings have been logged, but the build will continue.");
