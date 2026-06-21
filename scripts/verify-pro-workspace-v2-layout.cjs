const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const files = {
  main: 'electron/main.ts',
  app: 'src/App.tsx',
  styles: 'src/styles.css',
  workspace: 'src/components/pro-workspace-v2/ProWorkspaceV2.tsx',
  choice: 'src/components/pro-workspace-v2/ProTaskChoiceScreen.tsx',
  shell: 'src/components/pro-workspace-v2/ProWorkspaceShell.tsx',
  context: 'src/components/pro-workspace-v2/ProContextPanel.tsx',
  adapter: 'src/components/pro-workspace-v2/ProLegacyWorkflowAdapter.tsx',
  pdfFlow: 'src/components/pro-workspace-v2/ProPdfFlow.tsx',
  boardFlow: 'src/components/pro-workspace-v2/ProBoardFlow.tsx',
  boardPhoto: 'src/components/pro-workspace-v2/ProBoardPhotoStep.tsx',
  pdfPhoto: 'src/components/pro-workspace-v2/ProPdfPhotoStep.tsx',
  boardAdjust: 'src/components/pro-workspace-v2/ProBoardAdjustStep.tsx',
  lowerBand: 'src/components/pro-workspace-v2/ProLowerBandItemManager.tsx',
  pdfTypes: 'src/components/pro-workspace-v2/pdfFlowTypes.ts',
  types: 'src/components/pro-workspace-v2/types.ts'
};

const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const allChangedSource = Object.values(source).join('\n');
const v2ComponentSource = [
  source.workspace,
  source.choice,
  source.shell,
  source.context,
  source.adapter,
  source.pdfFlow,
  source.boardFlow,
  source.boardPhoto,
  source.pdfPhoto,
  source.boardAdjust,
  source.lowerBand,
  source.pdfTypes,
  source.types
].join('\n');
const v2Styles = source.styles.split('/* PRO Task Workspace v2 layout foundation */')[1] ?? '';
function cssBlock(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.styles.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : '';
}

const actionBarBlock = cssBlock('.pro-v2-actionbar');

const checks = [
  {
    name: 'Task Choice has no numeric progress prop',
    pass: !/progressLabel=\{?["'`][^"'`]*(1\s*\/|\/\s*[45])/.test(source.workspace)
      && !/(1\s*\/\s*[45]|[45]\s*\/\s*[45])/.test(source.choice)
  },
  {
    name: 'Task Choice has no invalid previous action',
    pass: !/이전/.test(source.choice) && !/Previous/.test(source.choice)
  },
  {
    name: 'Task Choice exposes only selected-job primary CTA',
    pass: /selectedOption\?\.primaryActionLabel/.test(source.workspace)
      && /disabled=\{!pendingJob\}/.test(source.workspace)
      && !/보드판 내용 입력[\s\S]*PDF 정보 설정|PDF 정보 설정[\s\S]*보드판 내용 입력/.test(source.workspace)
  },
  {
    name: 'V2 namespace exists',
    pass: /\[data-pro-workspace-v2\]/.test(source.styles)
      && /data-pro-workspace-v2/.test(source.shell)
      && /\.pro-v2-shell/.test(source.styles)
  },
  {
    name: 'No broad global button override added for V2',
    pass: !/^\s*\.btn:hover/m.test(v2Styles)
      && !/^\s*\.small-btn:hover/m.test(v2Styles)
      && /\.pro-v2-shell \.btn:hover/.test(v2Styles)
      && /\.pro-v2-shell \.small-btn:hover/.test(v2Styles)
  },
  {
    name: 'Reduced motion rule exists',
    pass: /prefers-reduced-motion:\s*reduce/.test(source.styles)
      && /transition-duration:\s*0\.01ms/.test(source.styles)
  },
  {
    name: 'Focus-visible rule exists',
    pass: /:focus-visible/.test(source.styles)
  },
  {
    name: 'Primary CTA min-height token exists',
    pass: /--pro-v2-primary-height:\s*44px/.test(source.styles)
      && /min-height:\s*var\(--pro-v2-primary-height\)/.test(source.styles)
  },
  {
    name: 'Electron window policy preserves default size and lowers minimum to 900x720',
    pass: /DEFAULT_WINDOW_WIDTH\s*=\s*1280/.test(source.main)
      && /DEFAULT_WINDOW_HEIGHT\s*=\s*880/.test(source.main)
      && /MIN_WINDOW_WIDTH\s*=\s*900/.test(source.main)
      && /MIN_WINDOW_HEIGHT\s*=\s*720/.test(source.main)
      && /width:\s*DEFAULT_WINDOW_WIDTH/.test(source.main)
      && /height:\s*DEFAULT_WINDOW_HEIGHT/.test(source.main)
      && /minWidth:\s*MIN_WINDOW_WIDTH/.test(source.main)
      && /minHeight:\s*MIN_WINDOW_HEIGHT/.test(source.main)
      && /Math\.max\(Math\.round\(size\.width\),\s*MIN_WINDOW_WIDTH\)/.test(source.main)
      && /Math\.max\(Math\.round\(size\.height\),\s*MIN_WINDOW_HEIGHT\)/.test(source.main)
  },
  {
    name: 'V2 action bar remains reachable without fixed overlay',
    pass: /position:\s*sticky/.test(actionBarBlock)
      && /bottom:\s*0/.test(actionBarBlock)
      && /env\(safe-area-inset-bottom\)/.test(actionBarBlock)
      && !/position:\s*fixed/.test(actionBarBlock)
  },
  {
    name: 'Large photo lists use explicit bounded scroll containers',
    pass: /pro-v2-photo-workbench/.test(source.boardPhoto)
      && /pro-v2-photo-list-scroll/.test(source.boardPhoto)
      && /selectedRowRef\.current\?\.scrollIntoView/.test(source.boardPhoto)
      && /pro-v2-photo-workbench/.test(source.pdfPhoto)
      && /pro-v2-photo-list-scroll/.test(source.pdfPhoto)
      && /selectedRowRef\.current\?\.scrollIntoView/.test(source.pdfPhoto)
      && /\.pro-v2-photo-list-scroll\s*\{[\s\S]*?max-block-size:[\s\S]*?overflow:\s*auto/.test(v2Styles)
  },
  {
    name: 'Photo rotation and order controls stay outside the long list',
    pass: /data-evidence="board-photo-side-controls"/.test(source.boardPhoto)
      && /data-evidence="pdf-photo-side-controls"/.test(source.pdfPhoto)
      && /data-evidence="pdf-photo-order-controls"/.test(source.pdfPhoto)
      && /\.pro-v2-photo-side-panel\s*\{[\s\S]*?align-self:\s*start/.test(v2Styles)
  },
  {
    name: 'Board adjust renders a single preview near controls',
    pass: /data-evidence="board-adjust-workbench"/.test(source.boardAdjust)
      && /data-evidence="board-adjust-preview"/.test(source.boardAdjust)
      && /미리보기는 3단계 작업 영역에 한 번만 표시됩니다/.test(source.boardFlow)
      && /\.pro-v2-board-adjust-workbench\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*0\.95fr\)\s*minmax\(300px,\s*0\.85fr\)/.test(v2Styles)
  },
  {
    name: 'Lower-band editor uses compact row contract',
    pass: /pro-v2-lower-band-label-control/.test(source.lowerBand)
      && /pro-v2-lower-band-value-control/.test(source.lowerBand)
      && /data-evidence="lower-band-toolbar"/.test(source.lowerBand)
      && /\.pro-v2-lower-band-row\s*\{[\s\S]*?grid-template-columns:\s*auto auto minmax\(132px,\s*0\.42fr\) minmax\(220px,\s*1fr\) auto/.test(v2Styles)
  },
  {
    name: 'V2 preview rotation controls can wrap without clipping',
    pass: /\.pro-v2-shell\s+\.output-rotation-controls\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(v2Styles)
      && /\.pro-v2-shell\s+\.output-rotation-controls\s+\.small-btn\s*\{[\s\S]*?min-height:\s*var\(--pro-v2-control-height\)/.test(v2Styles)
      && /\.pro-v2-shell\s+\.output-rotation-controls\s+\.small-btn\s*\{[\s\S]*?min-width:\s*var\(--pro-v2-control-height\)/.test(v2Styles)
  },
  {
    name: 'V2 legacy checkbox and radio controls expose 40px effective targets',
    pass: /\.pro-v2-shell\s+\.photo-list-row\s+input\[type="checkbox"\][\s\S]*?width:\s*var\(--pro-v2-control-height\)/.test(v2Styles)
      && /\.pro-v2-shell\s+\.photo-list-row\s+input\[type="checkbox"\][\s\S]*?height:\s*var\(--pro-v2-control-height\)/.test(v2Styles)
      && /\.pro-v2-shell\s+\.check-label,[\s\S]*?\.pro-v2-shell\s+\.color-option\s*\{[\s\S]*?min-height:\s*var\(--pro-v2-control-height\)/.test(v2Styles)
  },
  {
    name: 'Context panel collapses when empty',
    pass: /if \(!children\) return null/.test(source.context)
  },
  {
    name: 'PR #6 component imports are absent',
    pass: !/pro-guided-workflow|ProGuidedWorkflow|OutputProgressStatus|ProWorkflowStepper/.test(allChangedSource)
  },
  {
    name: 'PDF flow migration contract is explicit',
    pass: /<ProPdfFlow[\s\S]*model=\{pdfFlow\.model\}/.test(source.workspace)
      && /ProPdfFlowController/.test(source.pdfTypes)
      && /onGeneratePdf/.test(source.pdfTypes)
  },
  {
    name: 'Output payload contract is not changed by V2 files',
    pass: !/ProcessImagesPayload/.test(v2ComponentSource)
      && !/createPhotoLedgerPdf/.test(v2ComponentSource)
  },
  {
    name: 'Job-specific settings filter exists',
    pass: /renderProWorkspaceSettingsPanel\(job: ProWorkspaceJob\)/.test(source.app)
      && /photo-ledger-pdf/.test(source.app)
      && /setActiveOutputSettingsTab\(job === 'photo-ledger-pdf' \? 'ledger' : 'fields'\)/.test(source.app)
  }
];

let failed = 0;
for (const check of checks) {
  const status = check.pass ? 'PASS' : 'FAIL';
  console.log(`${status} ${check.name}`);
  if (!check.pass) failed += 1;
}

console.log('');
console.log('Scope note: this is a static contract check. Runtime Electron/Edge layout evidence must be reviewed separately.');

if (failed > 0) {
  process.exitCode = 1;
}
