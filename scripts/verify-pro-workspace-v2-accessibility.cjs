const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const files = {
  app: 'src/App.tsx',
  styles: 'src/styles.css',
  shell: 'src/components/pro-workspace-v2/ProWorkspaceShell.tsx',
  header: 'src/components/pro-workspace-v2/ProTaskHeader.tsx',
  canvas: 'src/components/pro-workspace-v2/ProTaskCanvas.tsx',
  actionBar: 'src/components/pro-workspace-v2/ProActionBar.tsx',
  choice: 'src/components/pro-workspace-v2/ProTaskChoiceScreen.tsx',
  workspace: 'src/components/pro-workspace-v2/ProWorkspaceV2.tsx',
  boardFlow: 'src/components/pro-workspace-v2/ProBoardFlow.tsx',
  boardGenerate: 'src/components/pro-workspace-v2/ProBoardGenerateStep.tsx',
  boardPhoto: 'src/components/pro-workspace-v2/ProBoardPhotoStep.tsx',
  boardResult: 'src/components/pro-workspace-v2/ProBoardResultStep.tsx',
  lowerBand: 'src/components/pro-workspace-v2/ProLowerBandItemManager.tsx',
  pdfFlow: 'src/components/pro-workspace-v2/ProPdfFlow.tsx',
  pdfPhoto: 'src/components/pro-workspace-v2/ProPdfPhotoStep.tsx',
  pdfGenerate: 'src/components/pro-workspace-v2/ProPdfGenerateStep.tsx',
  pdfResult: 'src/components/pro-workspace-v2/ProPdfResultStep.tsx',
  pdfDetails: 'src/components/pro-workspace-v2/ProPdfDetailsStep.tsx',
  packageJson: 'package.json'
};

const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const v2Styles = source.styles.split('/* PRO Task Workspace v2 layout foundation */')[1] ?? '';
const allV2Source = [
  source.shell,
  source.header,
  source.canvas,
  source.actionBar,
  source.choice,
  source.workspace,
  source.boardFlow,
  source.boardGenerate,
  source.boardPhoto,
  source.boardResult,
  source.lowerBand,
  source.pdfFlow,
  source.pdfPhoto,
  source.pdfGenerate,
  source.pdfResult,
  source.pdfDetails,
  source.styles
].join('\n');

let changedFiles = [];
try {
  changedFiles = childProcess.execFileSync('git', ['diff', '--name-only', 'origin/main...HEAD'], {
    cwd: root,
    encoding: 'utf8'
  }).split(/\r?\n/).filter(Boolean);
} catch {
  changedFiles = [];
}

const forbiddenChanged = changedFiles.filter((file) =>
  file === 'package.json'
  || file === 'package-lock.json'
  || file.startsWith('electron/')
  || file === 'src/electron-api.d.ts'
  || file.startsWith('public/')
  || file.startsWith('.github/')
  || file.startsWith('supabase/migrations/')
  || file.startsWith('docs/user-manual-images/')
  || file.startsWith('review-artifacts/')
  || file.startsWith('release/')
  || file.startsWith('dist/')
  || file.startsWith('dist-electron/')
);

const checks = [
  {
    name: 'Step heading focus target exists',
    pass: /data-pro-v2-step-heading/.test(source.canvas)
      && /tabIndex=\{-1\}/.test(source.canvas)
      && /headingRef\.current\?\.focus\(\{ preventScroll: true \}\)/.test(source.canvas)
      && /focusKey=\{`board-\$\{step\}`\}/.test(source.boardFlow)
      && /focusKey=\{`pdf-\$\{step\}`\}/.test(source.pdfFlow)
  },
  {
    name: 'Workspace busy state is exposed without changing business logic',
    pass: /aria-busy=\{isBusy \|\| undefined\}/.test(source.shell)
      && /isBusy=\{model\.isProcessing \|\| generatingMode !== null\}/.test(source.boardFlow)
      && /isBusy=\{model\.isProcessing \|\| generating\}/.test(source.pdfFlow)
  },
  {
    name: 'Header status is a single polite live region',
    pass: /role="status"/.test(source.header)
      && /aria-live="polite"/.test(source.header)
      && /aria-atomic="true"/.test(source.header)
  },
  {
    name: 'Generate blocked and ready states have live-region semantics',
    pass: /id="pro-v2-board-generate-blockers"[\s\S]*role="alert"[\s\S]*aria-live="assertive"/.test(source.boardGenerate)
      && /id="pro-v2-board-generate-ready"[\s\S]*role="status"/.test(source.boardGenerate)
      && /id="pro-v2-pdf-generate-blockers"[\s\S]*role="alert"[\s\S]*aria-live="assertive"/.test(source.pdfGenerate)
      && /id="pro-v2-pdf-generate-ready"[\s\S]*role="status"/.test(source.pdfGenerate)
      && /aria-describedby=\{describedBy\}/.test(source.boardFlow)
      && /aria-describedby=\{describedBy\}/.test(source.pdfFlow)
  },
  {
    name: 'Result states announce success and failure',
    pass: /role=\{error \? 'alert' : 'status'\}/.test(source.boardResult)
      && /aria-live=\{error \? 'assertive' : 'polite'\}/.test(source.boardResult)
      && /role=\{error \? 'alert' : 'status'\}/.test(source.pdfResult)
      && /aria-live=\{error \? 'assertive' : 'polite'\}/.test(source.pdfResult)
  },
  {
    name: 'Task choice uses native button semantics and visible selected state',
    pass: /type="button"/.test(source.choice)
      && /aria-pressed=\{selected\}/.test(source.choice)
      && /aria-label=\{`\$\{option\.title\}: \$\{option\.description\}`\}/.test(source.choice)
      && /pro-v2-state-badge/.test(source.choice)
  },
  {
    name: 'Lower-band row select has an accessible name',
    pass: /aria-pressed=\{selected\}/.test(source.lowerBand)
      && /aria-label=\{`\$\{index \+ 1\}.*`\}/.test(source.lowerBand)
      && /pro-v2-selected-label/.test(source.lowerBand)
  },
  {
    name: 'Board photo selected state is exposed beyond color',
    pass: /aria-current=\{selected \? 'true' : undefined\}/.test(source.boardPhoto)
      && /pro-v2-selected-label/.test(source.boardPhoto)
      && /\.pro-v2-selected-label/.test(source.styles)
  },
  {
    name: 'PDF photo selected state and scroll visibility are exposed beyond color',
    pass: /aria-current=\{selected \? 'true' : undefined\}/.test(source.pdfPhoto)
      && /pro-v2-selected-label/.test(source.pdfPhoto)
      && /selectedRowRef\.current\?\.scrollIntoView/.test(source.pdfPhoto)
      && /aria-label=\{`\$\{photo\.name\} PDF 처리 대상 체크`\}/.test(source.pdfPhoto)
  },
  {
    name: 'PDF mode removes board insertion and exposes highlight controls',
    pass: !/showBoardInputId|useBoardFieldsInputId|사진에 보드판 삽입|보드판 입력값 자동 적용/.test(source.pdfDetails)
      && /data-evidence="pdf-highlight-controls"/.test(source.pdfDetails)
      && /slots\.highlightControls/.test(source.pdfDetails)
  },
  {
    name: 'PDF details workbench uses tab semantics',
    pass: /role="tablist"/.test(source.pdfDetails)
      && /role="tab"/.test(source.pdfDetails)
      && /aria-selected=\{active\}/.test(source.pdfDetails)
      && /aria-controls=\{`pro-v2-pdf-\$\{panel\.id\}-panel`\}/.test(source.pdfDetails)
      && /role="tabpanel"/.test(source.pdfDetails)
      && /aria-labelledby=\{`pro-v2-pdf-\$\{activePanel\}-tab`\}/.test(source.pdfDetails)
      && /data-evidence="pdf-details-workbench"/.test(source.pdfDetails)
  },
  {
    name: 'Board generate readiness accepts checked-only photo sets',
    pass: /!\s*model\.hasSelectedPhoto\s*&&\s*model\.checkedCount\s*===\s*0/.test(source.boardGenerate)
  },
  {
    name: 'PDF text inputs retain label associations',
    pass: /htmlFor=\{pdfTitleInputId\}/.test(source.pdfDetails)
      && /id=\{pdfTitleInputId\}/.test(source.pdfDetails)
      && /htmlFor=\{ledgerLocationInputId\}/.test(source.pdfDetails)
      && /id=\{ledgerLocationInputId\}/.test(source.pdfDetails)
      && /htmlFor=\{ledgerContentInputId\}/.test(source.pdfDetails)
      && /id=\{ledgerContentInputId\}/.test(source.pdfDetails)
      && /htmlFor=\{ledgerDateInputId\}/.test(source.pdfDetails)
      && /id=\{ledgerDateInputId\}/.test(source.pdfDetails)
  },
  {
    name: 'Motion tokens stay short and scoped to V2',
    pass: /--pro-v2-motion-fast:\s*140ms/.test(source.styles)
      && /--pro-v2-motion-normal:\s*190ms/.test(source.styles)
      && /--pro-v2-motion-ease:/.test(source.styles)
      && !/scale\(1\.(0[3-9]|[1-9])/.test(v2Styles)
  },
  {
    name: 'Reduced motion removes transform and animation-heavy feedback',
    pass: /@media \(prefers-reduced-motion:\s*reduce\)/.test(source.styles)
      && /\[data-pro-workspace-v2\][\s\S]*?animation-duration:\s*0\.01ms/.test(source.styles)
      && /\[data-pro-workspace-v2\][\s\S]*?transition-duration:\s*0\.01ms/.test(source.styles)
      && /transform:\s*none/.test(source.styles)
  },
  {
    name: 'Forced colors keeps focus and state visible',
    pass: /@media \(forced-colors:\s*active\)/.test(source.styles)
      && /outline:\s*3px solid Highlight/.test(source.styles)
      && /\.pro-v2-job-card\.selected/.test(source.styles)
      && /\.pro-v2-result-card\.error/.test(source.styles)
      && /\.pro-v2-selected-label/.test(source.styles)
  },
  {
    name: 'New V2 action targets keep 40px and primary 44px minimums',
    pass: /--pro-v2-control-height:\s*40px/.test(source.styles)
      && /--pro-v2-primary-height:\s*44px/.test(source.styles)
      && /min-height:\s*var\(--pro-v2-control-height\)/.test(v2Styles)
      && /min-height:\s*var\(--pro-v2-primary-height\)/.test(v2Styles)
  },
  {
    name: 'Disabled hover leakage is blocked',
    pass: /\.pro-v2-shell button:disabled:hover/.test(source.styles)
      && /transform:\s*none/.test(source.styles)
  },
  {
    name: 'State feedback is not color-only',
    pass: /border-left/.test(source.styles)
      && /pro-v2-state-badge/.test(source.styles)
      && /pro-v2-selected-label/.test(source.styles)
      && /\.pro-v2-readiness-card\.blocked/.test(source.styles)
      && /\.pro-v2-result-card\.success/.test(source.styles)
  },
  {
    name: 'PDF readiness summary avoids syllable-level wrapping',
    pass: /\.pro-v2-pdf-readiness-grid/.test(source.styles)
      && /grid-template-columns:\s*repeat\(2,\s*minmax\(152px,\s*1fr\)\)/.test(source.styles)
      && /word-break:\s*keep-all/.test(source.styles)
  },
  {
    name: 'No broad global selector was added for PR D',
    pass: !/^\s*button:hover/m.test(v2Styles)
      && !/^\s*\*:focus-visible/m.test(v2Styles)
      && !/!important/.test(v2Styles)
  },
  {
    name: 'PR #6 guided workflow code is absent',
    pass: !/pro-guided-workflow|ProGuidedWorkflow|OutputProgressStatus|ProWorkflowStepper/.test(allV2Source)
  },
  {
    name: 'Output payload and Electron contracts are untouched by V2 source',
    pass: !/ProcessImagesPayload|ipcRenderer|window\.electronAPI|createPhotoLedgerPdf/.test(allV2Source)
  },
  {
    name: 'Forbidden files are not changed',
    pass: forbiddenChanged.length === 0
  },
  {
    name: 'Package scripts remain unchanged',
    pass: /"package:win":\s*"npm run package:win:installer"/.test(source.packageJson)
      && /"package:win:installer":\s*"npm run build && electron-builder --win nsis --x64 --publish never && node scripts\/build-update-bridge.cjs"/.test(source.packageJson)
  }
];

let failed = 0;
for (const check of checks) {
  const status = check.pass ? 'PASS' : 'FAIL';
  console.log(`${status} ${check.name}`);
  if (!check.pass) failed += 1;
}

if (forbiddenChanged.length > 0) {
  console.log('');
  console.log(`Forbidden changed files: ${forbiddenChanged.join(', ')}`);
}

console.log('');
console.log('Scope note: this is a static accessibility and motion contract check. Runtime Electron QA remains required.');

if (failed > 0) {
  process.exitCode = 1;
}
