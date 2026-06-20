const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const files = {
  app: 'src/App.tsx',
  styles: 'src/styles.css',
  workspace: 'src/components/pro-workspace-v2/ProWorkspaceV2.tsx',
  types: 'src/components/pro-workspace-v2/types.ts',
  pdfTypes: 'src/components/pro-workspace-v2/pdfFlowTypes.ts',
  pdfFlow: 'src/components/pro-workspace-v2/ProPdfFlow.tsx',
  pdfPhoto: 'src/components/pro-workspace-v2/ProPdfPhotoStep.tsx',
  pdfDetails: 'src/components/pro-workspace-v2/ProPdfDetailsStep.tsx',
  pdfGenerate: 'src/components/pro-workspace-v2/ProPdfGenerateStep.tsx',
  pdfResult: 'src/components/pro-workspace-v2/ProPdfResultStep.tsx',
  pdfReadiness: 'src/components/pro-workspace-v2/ProPdfReadinessSummary.tsx',
  pdfCompact: 'src/components/pro-workspace-v2/ProPdfCompactPhotoStatus.tsx',
  boardFlow: 'src/components/pro-workspace-v2/ProBoardFlow.tsx',
  boardTypes: 'src/components/pro-workspace-v2/boardFlowTypes.ts',
  packageJson: 'package.json'
};

const source = {};
for (const [key, file] of Object.entries(files)) {
  source[key] = exists(file) ? read(file) : '';
}

const pdfComponentKeys = ['pdfTypes', 'pdfFlow', 'pdfPhoto', 'pdfDetails', 'pdfGenerate', 'pdfResult', 'pdfReadiness', 'pdfCompact'];
const pdfSource = pdfComponentKeys.map((key) => source[key]).join('\n');
const allSource = [
  source.app,
  source.workspace,
  source.types,
  source.boardFlow,
  source.boardTypes,
  pdfSource,
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
  || file === 'electron/main.ts'
  || file === 'electron/preload.ts'
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
    name: 'PDF flow component files exist',
    pass: pdfComponentKeys.every((key) => source[key].trim().length > 0)
  },
  {
    name: 'PDF flow step model is fixed to 1/4 through 4/4',
    pass: /photo['"]?\s*:\s*\{[\s\S]*?stepNumber:\s*1[\s\S]*?totalSteps:\s*4/.test(source.pdfFlow)
      && /details['"]?\s*:\s*\{[\s\S]*?stepNumber:\s*2[\s\S]*?totalSteps:\s*4/.test(source.pdfFlow)
      && /generate['"]?\s*:\s*\{[\s\S]*?stepNumber:\s*3[\s\S]*?totalSteps:\s*4/.test(source.pdfFlow)
      && /result['"]?\s*:\s*\{[\s\S]*?stepNumber:\s*4[\s\S]*?totalSteps:\s*4/.test(source.pdfFlow)
      && /const pdfStepOrder:\s*ProPdfFlowStep\[\]\s*=\s*\['photo',\s*'details',\s*'generate',\s*'result'\]/.test(source.pdfFlow)
  },
  {
    name: 'Task choice remains a pre-flow screen without numeric progress',
    pass: !/progressLabel=\{?["'`][^"'`]*(1\s*\/|\/\s*[45])/.test(source.workspace.split('if (!activeJob)')[1] ?? '')
      && !/(1\s*\/\s*[45]|[45]\s*\/\s*[45])/.test(read('src/components/pro-workspace-v2/ProTaskChoiceScreen.tsx'))
  },
  {
    name: 'PDF job renders ProPdfFlow and board job still renders ProBoardFlow',
    pass: /activeJob\s*===\s*['"]board-image['"][\s\S]*?<ProBoardFlow/.test(source.workspace)
      && /<ProPdfFlow[\s\S]*model=\{pdfFlow\.model\}/.test(source.workspace)
      && /pdfFlow:\s*ProPdfFlowController/.test(source.workspace)
  },
  {
    name: 'PDF v2 uses existing App-owned checked output action',
    pass: /onGeneratePdf:\s*\(\)\s*=>\s*runProcess\('checked',\s*\{\s*createPhotoLedgerPdf:\s*true\s*\}\)/.test(source.app)
      && /createPdf:\s*Boolean\(options\.createPhotoLedgerPdf\)/.test(source.app)
  },
  {
    name: 'PDF v2 checked UI matches generation readiness',
    pass: /const generateReady = model\.checkedCount > 0/.test(source.pdfFlow)
      && /if \(model\.checkedCount === 0\) blocked\.push/.test(source.pdfGenerate)
      && /checkedCount > 0 \? `\$\{model\.checkedCount\}장 체크` : '체크 필요'/.test(source.pdfReadiness)
      && /data-evidence="pdf-clear-checks"/.test(source.pdfPhoto)
  },
  {
    name: 'PDF v2 persists result status after global status auto-clear',
    pass: /resultStatus/.test(source.pdfFlow)
      && /setResultStatus\(\{ kind: result\.ok \? 'success' : 'error'/.test(source.pdfFlow)
      && /statusKind: resultStatus\.kind/.test(source.pdfFlow)
      && /return \{ ok: true, message \}/.test(source.app)
  },
  {
    name: 'PDF details inputs have associated labels',
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
    name: 'PDF v2 components do not construct process payloads or call IPC',
    pass: !/ProcessImagesPayload|processImages|window\.constructView|ipcRenderer|createPhotoLedgerPdf/.test(pdfSource)
  },
  {
    name: 'PDF v2 preserves board-only controls outside PDF components',
    pass: !/ProLowerBandItemManager|highlightControls|bottomStrip|boardLayoutMode|setSelectedHighlightEnabled|updateSelectedHighlightPatch/.test(pdfSource)
  },
  {
    name: 'PDF v2 exposes PDF-specific metadata and ordering',
    pass: /pdfTitle/.test(source.pdfTypes)
      && /selectedPhotoLedger/.test(source.pdfTypes)
      && /onMoveSelectedPhotoOrder/.test(source.pdfTypes)
      && /onUpdatePdfTitle/.test(source.pdfTypes)
      && /PDF 정보와 배치/.test(source.pdfFlow)
  },
  {
    name: 'Board flow remains fixed to 1/5 through 5/5',
    pass: /stepNumber:\s*1[\s\S]*?totalSteps:\s*5/.test(source.boardFlow)
      && /stepNumber:\s*5[\s\S]*?totalSteps:\s*5/.test(source.boardFlow)
      && /const boardStepOrder:\s*ProBoardFlowStep\[\]\s*=\s*\['photo',\s*'content',\s*'adjust',\s*'generate',\s*'result'\]/.test(source.boardFlow)
  },
  {
    name: 'PR #6 guided workflow code is absent',
    pass: !/pro-guided-workflow|ProGuidedWorkflow|OutputProgressStatus|ProWorkflowStepper/.test(allSource)
  },
  {
    name: 'PDF flow styles are namespaced and keep target sizes',
    pass: /\.pro-v2-pdf-flow/.test(source.styles)
      && /\.pro-v2-pdf-flow button,[\s\S]*?min-height:\s*var\(--pro-v2-control-height\)/.test(source.styles)
      && /\.pro-v2-pdf-flow \.pro-v2-pdf-primary[\s\S]*?min-height:\s*var\(--pro-v2-primary-height\)/.test(source.styles)
      && /prefers-reduced-motion:\s*reduce[\s\S]*?\.pro-v2-pdf-flow/.test(source.styles)
  },
  {
    name: 'Forbidden files are not in PR diff',
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
console.log('Scope note: this check is static. Electron runtime QA and packaged output smoke remain required.');

if (failed > 0) {
  process.exitCode = 1;
}
