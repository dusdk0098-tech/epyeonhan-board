const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const files = {
  app: 'src/App.tsx',
  styles: 'src/styles.css',
  workspace: 'src/components/pro-workspace-v2/ProWorkspaceV2.tsx',
  choice: 'src/components/pro-workspace-v2/ProTaskChoiceScreen.tsx',
  shell: 'src/components/pro-workspace-v2/ProWorkspaceShell.tsx',
  context: 'src/components/pro-workspace-v2/ProContextPanel.tsx',
  adapter: 'src/components/pro-workspace-v2/ProLegacyWorkflowAdapter.tsx',
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
  source.types
].join('\n');
const v2Styles = source.styles.split('/* PRO Task Workspace v2 layout foundation */')[1] ?? '';

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
    name: 'Context panel collapses when empty',
    pass: /if \(!children\) return null/.test(source.context)
  },
  {
    name: 'PR #6 component imports are absent',
    pass: !/pro-guided-workflow|ProGuidedWorkflow|OutputProgressStatus|ProWorkflowStepper/.test(allChangedSource)
  },
  {
    name: 'Legacy adapter contract is explicit',
    pass: /Temporary migration layer/.test(source.adapter)
      && /existing App-owned PRO state/.test(source.adapter)
      && /renderAdapterContent/.test(source.workspace)
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
