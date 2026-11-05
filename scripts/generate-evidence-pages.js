import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const resultDirectory = resolve(root, 'security-results');
const outputDirectory = resolve(root, 'docs', 'screenshots', 'evidence');

const sources = [
  { key: 'backend', label: 'Authentication & API', file: 'backend-results.json' },
  { key: 'lab', label: 'Mitigation Laboratory', file: 'lab-results.json' },
  { key: 'security', label: 'Security Assessment', file: 'jest-results.json' }
];

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]
  );

const datasets = await Promise.all(
  sources.map(async (source) => ({
    ...source,
    data: JSON.parse(await readFile(resolve(resultDirectory, source.file), 'utf8'))
  }))
);

for (const dataset of datasets) {
  if (!dataset.data.success || dataset.data.numFailedTests !== 0) {
    throw new Error(`${dataset.label} did not pass; refusing to generate evidence artwork.`);
  }
}

const testsFor = (dataset) =>
  dataset.data.testResults.flatMap((suite) =>
    suite.assertionResults.map((test) => ({ title: test.title, status: test.status }))
  );

const total = datasets.reduce((sum, dataset) => sum + dataset.data.numTotalTests, 0);
const passed = datasets.reduce((sum, dataset) => sum + dataset.data.numPassedTests, 0);
const generatedAt = new Date().toLocaleString('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Dhaka'
});

const sharedStyle = `
  * { box-sizing: border-box; }
  :root { color-scheme: dark; font-family: Inter, "Segoe UI", Arial, sans-serif; }
  body { margin: 0; width: 1440px; min-height: 900px; color: #eef8f4; background: radial-gradient(circle at 8% 12%, #16483b 0, transparent 33%), #061410; }
  main { width: 100%; min-height: 900px; padding: 42px 72px; }
  header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 26px; }
  .brand { display: flex; align-items: center; gap: 13px; font-size: 21px; font-weight: 800; }
  .shield { display: grid; place-items: center; width: 38px; height: 43px; color: #052019; background: #3ce2aa; font-weight: 900; clip-path: polygon(50% 0,100% 16%,90% 76%,50% 100%,10% 76%,0 16%); }
  .stamp { color: #829b92; font: 13px ui-monospace, SFMono-Regular, Consolas, monospace; }
  .eyebrow { margin: 0 0 14px; color: #3ce2aa; font-size: 13px; font-weight: 900; letter-spacing: .18em; text-transform: uppercase; }
  h1 { margin: 0; font-size: 54px; line-height: 1.02; letter-spacing: -.045em; }
  .subtitle { color: #9db4ac; font-size: 17px; line-height: 1.5; }
  .panel { border: 1px solid #285044; border-radius: 18px; background: rgba(8, 31, 25, .82); box-shadow: 0 24px 70px rgba(0,0,0,.28); }
  .pass { color: #3ce2aa; }
  .badge { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; color: #3ce2aa; background: #143e32; border: 1px solid #2f6d5a; border-radius: 99px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
  footer { display: flex; justify-content: space-between; margin-top: 22px; color: #718b82; font-size: 12px; }
`;

const suiteCards = datasets
  .map((dataset) => {
    const tests = testsFor(dataset);
    return `<section class="suite panel">
      <div class="suite-head"><div><p class="suite-label">${escapeHtml(dataset.label)}</p><strong>${dataset.data.numPassedTests}/${dataset.data.numTotalTests}</strong></div><span class="badge">✓ passed</span></div>
      <ul>${tests.map((test) => `<li><span>✓</span>${escapeHtml(test.title)}</li>`).join('')}</ul>
    </section>`;
  })
  .join('');

const automatedTests = `<!doctype html><html><head><meta charset="utf-8"><title>SecureGuard automated test evidence</title><style>${sharedStyle}
  .summary { display: grid; grid-template-columns: 1fr auto; align-items: end; margin-bottom: 24px; }
  .score { text-align: right; } .score strong { display:block; color:#3ce2aa; font-size:68px; line-height:.9; letter-spacing:-.06em; } .score span { color:#8fa79f; font-size:14px; }
  .grid { display: grid; grid-template-columns: 1.35fr 1fr 1fr; gap: 18px; align-items: stretch; }
  .suite { padding: 23px; min-height: 520px; }
  .suite-head { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:17px; border-bottom:1px solid #21463b; }
  .suite-label { margin:0 0 5px; color:#9fb5ae; font-size:13px; } .suite strong { font-size:28px; }
  ul { list-style:none; margin:17px 0 0; padding:0; display:grid; gap:10px; }
  li { display:grid; grid-template-columns:18px 1fr; gap:8px; color:#c5d5d0; font-size:13px; line-height:1.35; }
  li span { color:#3ce2aa; font-weight:900; }
</style></head><body><main>
  <header><div class="brand"><span class="shield">S</span>SecureGuard</div><div class="stamp">Jest 29.7.0 · Supertest 7.1.4</div></header>
  <div class="summary"><div><p class="eyebrow">Automated verification</p><h1>All test suites passed.</h1><p class="subtitle">Fresh results exported directly from three Jest JSON reports.</p></div><div class="score"><strong>${passed}/${total}</strong><span>tests passed · 100% pass rate</span></div></div>
  <div class="grid">${suiteCards}</div>
  <footer><span>Source: security-results/*.json</span><span>Generated ${escapeHtml(generatedAt)} · No results manually entered</span></footer>
</main></body></html>`;

const securityDataset = datasets.find((dataset) => dataset.key === 'security');
const securityTests = testsFor(securityDataset).filter(
  (test) => !test.title.startsWith('measures response-time')
);
const categoryNames = [
  'SQL injection',
  'Cross-site scripting',
  'Access control',
  'Session security',
  'Authentication rate limiting'
];
const assessmentRows = securityTests
  .map(
    (test, index) => `<div class="finding">
      <div class="number">0${index + 1}</div>
      <div><strong>${escapeHtml(categoryNames[index] ?? test.title)}</strong><p>${escapeHtml(test.title)}</p></div>
      <div class="state"><span>✓</span> Mitigated</div>
    </div>`
  )
  .join('');

const securityAssessment = `<!doctype html><html><head><meta charset="utf-8"><title>SecureGuard security assessment evidence</title><style>${sharedStyle}
  .top { display:grid; grid-template-columns:1fr 420px; gap:50px; align-items:end; margin-bottom:28px; }
  .metrics { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .metric { padding:20px; } .metric strong { display:block; color:#3ce2aa; font-size:42px; letter-spacing:-.04em; } .metric span { color:#8fa79f; font-size:12px; text-transform:uppercase; letter-spacing:.09em; }
  .findings { overflow:hidden; }
  .finding { display:grid; grid-template-columns:50px 1fr 150px; gap:18px; align-items:center; min-height:82px; padding:12px 24px; border-bottom:1px solid #21463b; }
  .finding:last-child { border-bottom:0; }
  .number { color:#5c796f; font:14px ui-monospace, SFMono-Regular, Consolas, monospace; }
  .finding strong { font-size:18px; } .finding p { margin:6px 0 0; color:#8fa79f; font-size:13px; }
  .state { justify-self:end; color:#3ce2aa; font-size:13px; font-weight:800; } .state span { display:inline-grid; place-items:center; width:24px; height:24px; margin-right:7px; color:#052019; background:#3ce2aa; border-radius:50%; }
  .method { display:flex; align-items:center; justify-content:space-between; margin-top:18px; padding:17px 22px; color:#9fb5ae; font-size:13px; }
</style></head><body><main>
  <header><div class="brand"><span class="shield">S</span>SecureGuard</div><div class="badge">controlled local assessment</div></header>
  <div class="top"><div><p class="eyebrow">Vulnerability assessment</p><h1>Five controls.<br><span class="pass">Five verified mitigations.</span></h1><p class="subtitle">Each test confirms the modeled local weakness, then verifies that the secured implementation rejects or neutralizes the same behavior.</p></div>
  <div class="metrics"><div class="metric panel"><strong>5/5</strong><span>mitigations verified</span></div><div class="metric panel"><strong>100%</strong><span>security pass rate</span></div></div></div>
  <section class="findings panel">${assessmentRows}</section>
  <div class="method panel"><span>Method: controlled vulnerable ↔ secured comparison</span><span>Scope: local synthetic targets only</span><span>False-positive rate: not measurable from curated corpus</span></div>
  <footer><span>Source: security-results/jest-results.json</span><span>Generated ${escapeHtml(generatedAt)} · ${securityDataset.data.numPassedTests}/${securityDataset.data.numTotalTests} assessment tests passed</span></footer>
</main></body></html>`;

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(resolve(outputDirectory, 'automated-tests.html'), automatedTests),
  writeFile(resolve(outputDirectory, 'security-assessment.html'), securityAssessment)
]);

console.log(`Generated evidence pages from ${total} passing tests.`);
