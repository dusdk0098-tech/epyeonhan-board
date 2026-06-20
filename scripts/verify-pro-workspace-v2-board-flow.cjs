const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const files = {
  app: 'src/App.tsx',
  styles: 'src/styles.css',
  workspace: 'src/components/pro-workspace-v2/ProWorkspaceV2.tsx',
  types: 'src/components/pro-workspace-v2/types.ts',
  boardTypes: 'src/components/pro-workspace-v2/boardFlowTypes.ts',
  boardFlow: 'src/components/pro-workspace-v2/ProBoardFlow.tsx',
  photoStep: 'src/components/pro-workspace-v2/ProBoardPhotoStep.tsx',
  contentStep: 'src/components/pro-workspace-v2/ProBoardContentStep.tsx',
  adjustStep: 'src/components/pro-workspace-v2/ProBoardAdjustStep.tsx',
  generateStep: 'src/components/pro-workspace-v2/ProBoardGenerateStep.tsx',
  resultStep: 'src/components/pro-workspace-v2/ProBoardResultStep.tsx',
  compactStatus: 'src/components/pro-workspace-v2/ProCompactPhotoStatus.tsx',
  lowerBand: 'src/components/pro-workspace-v2/ProLowerBandItemManager.tsx',
  previewContext: 'src/components/pro-workspace-v2/ProBoardPreviewContext.tsx',
  outputSettings: 'scripts/verify-output-settings.cjs',
  packageJson: 'package.json'
};

const source = {};
for (const [key, file] of Object.entries(files)) {
  source[key] = exists(file) ? read(file) : '';
}

const boardComponentFiles = [
  'boardTypes',
  'boardFlow',
  'photoStep',
  'contentStep',
  'adjustStep',
  'generateStep',
  'resultStep',
  'compactStatus',
  'lowerBand',
  'previewContext'
];

const boardSource = boardComponentFiles.map((key) => source[key]).join('\n');
const allSource = [
  source.app,
  source.workspace,
  source.types,
  boardSource,
  source.styles
].join('\n');

const forbiddenPatterns = [
  /pro-guided-workflow/,
  /ProGuidedWorkflow/,
  /OutputProgressStatus/,
  /ProWorkflowStepper/
];

const checks = [
  {
    name: 'Board flow component files exist',
    pass: boardComponentFiles.every((key) => source[key].trim().length > 0)
  },
  {
    name: 'Board flow step model is fixed to 1/5 through 5/5',
    pass: /photo['"]?\s*:\s*\{[\s\S]*?stepNumber:\s*1[\s\S]*?totalSteps:\s*5/.test(source.boardFlow)
      && /content['"]?\s*:\s*\{[\s\S]*?stepNumber:\s*2[\s\S]*?totalSteps:\s*5/.test(source.boardFlow)
      && /adjust['"]?\s*:\s*\{[\s\S]*?stepNumber:\s*3[\s\S]*?totalSteps:\s*5/.test(source.boardFlow)
      && /generate['"]?\s*:\s*\{[\s\S]*?stepNumber:\s*4[\s\S]*?totalSteps:\s*5/.test(source.boardFlow)
      && /result['"]?\s*:\s*\{[\s\S]*?stepNumber:\s*5[\s\S]*?totalSteps:\s*5/.test(source.boardFlow)
  },
  {
    name: 'Task choice remains a pre-flow screen without numeric progress',
    pass: !/progressLabel=\{?["'`][^"'`]*(1\s*\/|\/\s*5)/.test(source.workspace.split('if (!activeJob)')[1] ?? '')
      && !/(1\s*\/\s*5|5\s*\/\s*5)/.test(read('src/components/pro-workspace-v2/ProTaskChoiceScreen.tsx'))
  },
  {
    name: 'Board job renders ProBoardFlow while PDF job renders separate ProPdfFlow',
    pass: /activeJob\s*===\s*['"]board-image['"][\s\S]*?<ProBoardFlow/.test(source.workspace)
      && /<ProPdfFlow[\s\S]*model=\{pdfFlow\.model\}/.test(source.workspace)
      && !/<ProLegacyWorkflowAdapter\s+job=\{activeJob\}/.test(source.workspace)
  },
  {
    name: 'App passes board flow model/actions without changing output payload',
    pass: /boardFlow=\{/.test(source.app)
      && /pdfFlow=\{pdfFlow\}/.test(source.app)
      && /function runProcess\(mode: ProcessImagesPayload\['mode'\]/.test(source.app)
  },
  {
    name: 'Board v2 components do not construct process payloads',
    pass: !/ProcessImagesPayload|processImages|createPhotoLedgerPdf/.test(boardSource)
  },
  {
    name: 'Board adjust step cannot expose legacy run action slot',
    pass: /highlightControls:\s*renderPremiumHighlightSettingsOnly\(\)/.test(source.app)
      && !/highlightControls:\s*renderPremiumHighlightAndActions\(\)/.test(source.app)
  },
  {
    name: 'PDF v2 flow stays separate from board flow',
    pass: !/ProPdfFlow|ProPdf|pdf-result|pdf-generate-ready/.test(boardSource)
      && /<ProPdfFlow[\s\S]*model=\{pdfFlow\.model\}/.test(source.workspace)
      && /ProPdfFlowController/.test(source.app)
  },
  {
    name: 'PR #6 guided workflow code is absent',
    pass: forbiddenPatterns.every((pattern) => !pattern.test(allSource))
  },
  {
    name: 'Board flow styles are namespaced under pro-v2 board classes',
    pass: /\.pro-v2-board-flow/.test(source.styles)
      && /\.pro-v2-board-step/.test(source.styles)
      && !/^\s*\.btn:hover/m.test(source.styles.split('/* PRO Task Workspace v2 board flow */')[1] ?? '')
  },
  {
    name: 'Board flow action targets keep 40px and primary 44px minimums',
    pass: /--pro-v2-control-height:\s*40px/.test(source.styles)
      && /--pro-v2-primary-height:\s*44px/.test(source.styles)
      && /\.pro-v2-board-flow[\s\S]*?min-height:\s*var\(--pro-v2-control-height\)/.test(source.styles)
      && /\.pro-v2-board-flow[\s\S]*?min-height:\s*var\(--pro-v2-primary-height\)/.test(source.styles)
  },
  {
    name: 'Package scripts are unchanged by this PR',
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

console.log('');
console.log('Scope note: this check is static. Electron runtime QA and packaged output smoke remain required.');

if (failed > 0) {
  process.exitCode = 1;
}
