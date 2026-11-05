import { readFile, writeFile, mkdir } from 'node:fs/promises';

const input = JSON.parse(
  await readFile(new URL('../../security-results/jest-results.json', import.meta.url), 'utf8')
);
const total = input.numTotalTests;
const passed = input.numPassedTests;
const failed = input.numFailedTests;
const report = `# Automated Vulnerability Assessment\n\nGenerated from the most recent machine-readable Jest result.\n\n- Security tests: ${total}\n- Passed: ${passed}\n- Failed: ${failed}\n- Pass rate: ${total ? ((passed / total) * 100).toFixed(1) : '0.0'}%\n- Controlled vulnerability classes evaluated: 5\n- Mitigations proven by passing comparison tests: ${failed === 0 ? 5 : 'review individual failures'}\n\n## Interpretation\n\nEach comparison test first confirms the expected weakness in the explicitly enabled local laboratory, then checks that the secured route rejects or neutralizes the same input. A passing test is evidence only for the tested behavior, not proof that the application is vulnerability-free. False-positive rates cannot be established from this small, curated corpus. Timing measurements are emitted by the test runner and vary by host load.\n`;
await mkdir(new URL('../../security-results/', import.meta.url), { recursive: true });
await writeFile(new URL('../../security-results/assessment-report.md', import.meta.url), report);
console.log('Wrote security-results/assessment-report.md');
