# Codex Task Ledger

이 문서는 PEDIT에서 Codex 작업을 append-only 방식으로 기록하기 위한 ledger 구조를 정의한다.

작업 기록은 Evidence Bundle, 서브에이전트 검증, 메인 취합, 다음 지시문 생성의 입력으로 사용한다.

## Append-Only Rule

- 새 작업은 기존 기록을 삭제하지 않고 아래에 추가한다.
- 완료, 미완료, 후속 범위를 분리해서 기록한다.
- NOT_RUN 항목은 숨기지 않고 다음 라운드 입력으로 넘긴다.
- S0/S1 이슈가 있으면 다음 작업 성격을 `fix-only`로 전환한다.

## Task Record Template

```md
## Task YYYY-MM-DD - short title

- Phase:
- Branch:
- PR:
- Task type:
  - feature / fix-only / stabilization / docs-only QA / security review / release readiness
- Scope:
  - Allowed:
  - Forbidden:
- Changed files:
  - docs/...
- Evidence Bundle:
  - Location or summary:
- Verification:
  - git diff --check:
  - lint:
  - typecheck:
  - tests:
  - build:
  - browser QA:
  - migration check:
  - no-exposure check:
- Subagent reviews:
  - Functional QA:
  - Design Regression:
  - Code Quality & Architecture:
  - Security & Privacy:
  - Test & Build Verification:
  - API/DB Contract:
  - Product Requirements:
  - Release Risk:
- Main aggregation result:
  - Overall:
  - Safe to merge:
  - Safe to start next feature:
- Verdict:
  - PASS / PARTIAL / NOT_RUN / FAIL
- Follow-up:
```

## Completion Tracking

- 완료한 항목은 검증 증거와 함께 기록한다.
- 미완료 항목은 이유와 다음 작업 조건을 기록한다.
- 일부만 확인된 항목은 `PARTIAL`로 남기고, 부족한 증거를 명시한다.
- 실행하지 않은 검증은 `NOT_RUN`과 이유를 기록한다.

## Fix-Only Escalation

다음 조건 중 하나라도 있으면 다음 작업은 `fix-only` 또는 `stabilization`으로 전환한다.

- S0/S1 이슈가 남아 있음.
- build 또는 핵심 검증 실패.
- 인증/인가, 데이터 손실, 민감값 노출 가능성.
- 주요 LITE/PRO/Admin/통합 설정 플로우 회귀.

## Current Process Seed

이 문서는 다중 에이전트 개발 검증 프로세스 도입을 위한 초기 ledger 기준이다.

실제 작업 기록은 향후 PR마다 이 파일에 append-only로 추가한다.

## Task 2026-06-13 - per-photo rotation controls

- Phase: photo-rotation
- Branch: codex/photo-rotation
- PR: To be created as draft after this record is committed.
- Task type:
  - feature
- Scope:
  - Allowed: add per-photo 90-degree rotation controls to LITE and PRO photo workflows.
  - Forbidden: package/package-lock changes, DB migrations, public assets, CI changes, generated build output, manual image assets.
- Changed files:
  - electron/main.ts
  - electron/preload.ts
  - scripts/verify-output-settings.cjs
  - src/App.tsx
  - src/electron-api.d.ts
  - src/shared/types.ts
  - src/styles.css
  - docs/CODEX_TASKS.md
- Evidence Bundle:
  - Location or summary: rotation metadata is stored per photo, passed through the Electron bridge, applied by the main-process image pipeline, and exposed in LITE/PRO preview controls.
- Verification:
  - git diff --check: PASS
  - lint: NOT_RUN - no lint script exists in package.json.
  - typecheck: PASS - covered by npm run build.
  - tests: NOT_RUN - no test script exists in package.json.
  - build: PASS - npm run build.
  - browser QA: NOT_RUN - Electron manual QA was not rerun during this PR packaging pass.
  - migration check: PASS - no DB migration changes.
  - no-exposure check: PASS - staged diff contains no secret, env, signed URL, storage path, or large binary exposure.
  - verify:ui: PASS
  - verify:board: PASS
  - verify-output-settings: PASS
  - package:win: PASS - installer packaging completed locally; generated release artifacts are not included in the PR.
- Subagent reviews:
  - Functional QA: NOT_RUN - independent subagent review not requested for this PR pass.
  - Design Regression: NOT_RUN - independent subagent review not requested for this PR pass.
  - Code Quality & Architecture: NOT_RUN - independent subagent review not requested for this PR pass.
  - Security & Privacy: NOT_RUN - independent subagent review not requested for this PR pass.
  - Test & Build Verification: NOT_RUN - independent subagent review not requested for this PR pass.
  - API/DB Contract: NOT_RUN - no API/DB contract changes beyond Electron preload typing.
  - Product Requirements: NOT_RUN - independent subagent review not requested for this PR pass.
  - Release Risk: NOT_RUN - independent subagent review not requested for this PR pass.
- Main aggregation result:
  - Overall: PARTIAL - automated build, verification, and packaging passed; manual Electron QA remains a follow-up check.
  - Safe to merge: PARTIAL - draft PR should receive normal review and manual smoke QA before merge.
  - Safe to start next feature: PARTIAL - after manual smoke QA confirms LITE/PRO rotation controls.
- Verdict:
  - PARTIAL
- Follow-up:
  - Run manual Electron smoke QA for LITE and PRO rotation controls before moving the draft PR to ready.
  - Keep untracked user manual images out of this feature PR.

## Task 2026-06-14 - user manual images

- Phase: user-manual-images
- Branch: codex/user-manual-images
- Task type:
  - docs/image asset
- Scope:
  - Add reviewed user manual PNG assets.
- Changed files:
  - docs/user-manual-images/*.png
  - docs/CODEX_TASKS.md
- Verification:
  - image file validation: PASS
  - visual privacy review: PASS
  - metadata review: PASS
  - docs-only scope: PASS
  - no-exposure: PASS
- Excluded:
  - product code
  - review-artifacts
  - generated output
- Note:
  - 04_PRO image was sanitized/replaced with a demo-safe version before commit.
- Follow-up:
  - Link images from user manual document if needed.

## Task 2026-06-16 - PRO Task Workspace v2 design spec

- Phase: pro-task-workspace-v2-design-spec
- Branch: design/pro-task-workspace-v2-spec
- PR: Draft PR to be created after docs commit.
- Task type:
  - docs-only QA / design spec
- Scope:
  - Allowed:
    - Define a design-first reset spec for PRO Task Workspace v2.
    - Add acceptance criteria for default, fullscreen, narrow, accessibility, packaging, and no-exposure gates.
    - Create local-only static prototype artifacts under `review-artifacts/pro-task-workspace-v2/`.
  - Forbidden:
    - Product code changes.
    - PR #6 merge or further PR #6 implementation patches.
    - package/package-lock changes.
    - DB/public/CI changes.
    - user manual PNG changes.
    - generated/release output commits.
    - committed review artifacts.
- Changed files:
  - docs/PRO_TASK_WORKSPACE_V2_SPEC.md
  - docs/PRO_TASK_WORKSPACE_V2_ACCEPTANCE.md
  - docs/CODEX_TASKS.md
- Local-only artifacts:
  - review-artifacts/pro-task-workspace-v2/index.html
  - review-artifacts/pro-task-workspace-v2/prototype.css
  - review-artifacts/pro-task-workspace-v2/README.md
  - review-artifacts/pro-task-workspace-v2/layout-metrics.json
- Evidence Bundle:
  - Location or summary: five read-only design/QA subagent reviews were synthesized into the v2 spec, acceptance matrix, and static prototype.
- Verification:
  - git diff --check: PASS
  - lint: NOT_RUN - no lint script expected for docs-only spec work.
  - typecheck: NOT_RUN - docs-only spec work; build will cover TypeScript compilation.
  - tests: NOT_RUN - no standalone test script expected.
  - build: PASS - `npm.cmd run build`.
  - package:win: PASS with caveat - direct `npm.cmd run package:win` hit a local Windows EPERM rename lock; prepackaged installer generation and update bridge completed after safe local recovery.
  - browser QA: NOT_RUN - local static prototype only; no production UI implementation.
  - migration check: PASS - no DB migration changes intended.
  - no-exposure check: PASS
  - docs-only scope: PASS
- Subagent reviews:
  - Senior UX Designer: PASS - recommended default-window-first design, one primary task per step, and no merge for PR #6.
  - Senior Product Designer: PASS - split PRO into board image and photo ledger PDF jobs with explicit decision order.
  - Senior Frontend Layout Architect: PASS - defined primary canvas, contextual panel, footer, and responsive metrics.
  - Senior Visual Designer: PASS - defined restrained surface, typography, state, motion, and accessibility guidance.
  - Senior QA Engineer: PASS - defined acceptance matrix, required screenshots, metrics fields, and packaging caveat wording.
- Main aggregation result:
  - Overall: PASS for design-spec readiness.
  - Safe to merge: PARTIAL - this docs PR can proceed through review; product implementation must wait for design acceptance.
  - Safe to start next feature: PARTIAL - implementation should start only after this v2 design spec is accepted.
- Verdict:
  - PARTIAL
- Follow-up:
  - Review and approve the v2 design spec and static prototype.
  - Start a fresh implementation branch after design acceptance.
  - Keep PR #6 as a Draft experimental reference branch.

## Task 2026-06-16 - PRO Task Workspace v2 prototype refinement

- Phase: pro-task-workspace-v2-prototype-refinement
- Branch: design/pro-task-workspace-v2-spec
- PR: #7
- Task type:
  - docs-only design spec / prototype refinement
- Scope:
  - Allowed:
    - Normalize Markdown raw line structure.
    - Upgrade the local prototype fidelity for user review.
    - Add default, fullscreen, and narrow frame support.
    - Add PR #6 problem-to-v2 solution mapping.
    - Update layout metric targets for prototype review.
  - Forbidden:
    - Product code changes.
    - `src/**`, `electron/**`, and `scripts/**` changes.
    - package/package-lock changes.
    - DB/public/CI changes.
    - user manual PNG changes.
    - generated/release output commits.
    - committed review artifacts or zip files.
- Changed files:
  - docs/PRO_TASK_WORKSPACE_V2_SPEC.md
  - docs/PRO_TASK_WORKSPACE_V2_ACCEPTANCE.md
  - docs/CODEX_TASKS.md
- Local-only artifacts:
  - review-artifacts/pro-task-workspace-v2/
  - review-artifacts/pro-task-workspace-v2.zip
- Evidence Bundle:
  - Location or summary: local static prototype now includes default, fullscreen, narrow, and acceptance mapping sections with synthetic-only UI states.
- Verification:
  - git diff --check: PASS
  - build: PASS - `npm.cmd run build`.
  - docs-only scope: PASS
  - hidden/bidi/newline check: PASS
  - markdown raw line structure: PASS
  - prototype zip validation: PASS
  - review-artifacts excluded check: PASS
  - generated/release output check: PASS
  - no-exposure check: PASS
- Follow-up:
  - Review the prototype zip before implementation starts.
  - Keep PR #6 Draft until a separate v2 implementation path is approved.

## Task 2026-06-18 - PRO Task Workspace v2 progress model alignment

- Phase: pro-task-workspace-v2-progress-model-alignment
- Branch: design/pro-task-workspace-v2-spec
- PR: #7
- Task type:
  - docs-only design spec progress model alignment plus local-only prototype evidence refresh
- Scope:
  - Allowed:
    - Add the selected-job progress model to the v2 spec.
    - Add progress model acceptance criteria.
    - Align local prototype step labels with board and PDF paths.
    - Regenerate local-only actual Edge prototype screenshots and zip.
  - Forbidden:
    - Product code changes.
    - PR #6 changes.
    - package/package-lock changes.
    - DB/public/CI changes.
    - user manual PNG changes.
    - committed review artifacts or prototype artifacts.
- Progress model:
  - Task Choice is a pre-flow screen with no numeric step.
  - Photo Board Image path uses 1/5 through 5/5.
  - Photo Ledger PDF path uses 1/4 through 4/4.
  - Previous is hidden or replaced with a valid home/cancel action when no previous step exists.
  - Progress labels are derived from the selected job path.
- Changed docs:
  - docs/PRO_TASK_WORKSPACE_V2_SPEC.md
  - docs/PRO_TASK_WORKSPACE_V2_ACCEPTANCE.md
  - docs/CODEX_TASKS.md
- Local-only artifacts:
  - review-artifacts/pro-task-workspace-v2/
  - review-artifacts/pro-task-workspace-v2.zip
- Verification:
  - git diff --check: PASS
  - build: PASS - `npm.cmd run build`
  - docs-only scope check: PASS
  - hidden/bidi/newline check: PASS
  - markdown raw line structure check: PASS
  - no-exposure check: PASS
  - prototype zip validation: PASS
  - actual Edge element-level screenshot count: PASS - 15 screenshots
  - progress model validation: PASS
  - PR #6 and PR #7 Draft state check: PASS

## Task 2026-06-18 - PRO Task Workspace v2 design artifact alignment

- Phase: pro-task-workspace-v2-design-artifact-alignment
- Branch: design/pro-task-workspace-v2-spec
- PR: #7
- Task type:
  - docs-only design spec / prototype alignment
- Scope:
  - Allowed:
    - Align prototype frame coverage with spec.
    - Separate photo board and PDF ledger paths.
    - Label layout metrics as target-only.
    - Split design-spec artifact and implementation evidence criteria.
    - Add interaction-state evidence.
    - Improve user-facing Korean copy.
    - Add workflow state ownership contract.
  - Forbidden:
    - Product code changes.
    - `src/**`, `electron/**`, and `scripts/**` changes.
    - package/package-lock changes.
    - DB/public/CI changes.
    - user manual PNG changes.
    - generated/release output commits.
    - committed review artifacts or prototype artifacts.
- Changed docs:
  - docs/PRO_TASK_WORKSPACE_V2_SPEC.md
  - docs/PRO_TASK_WORKSPACE_V2_ACCEPTANCE.md
  - docs/CODEX_TASKS.md
- Local-only artifacts:
  - review-artifacts/pro-task-workspace-v2/
  - review-artifacts/pro-task-workspace-v2.zip
- Verification:
  - git diff --check: PASS
  - build: PASS - `npm.cmd run build`
  - docs-only scope: PASS
  - hidden/bidi/newline check: PASS
  - markdown raw line structure check: PASS
  - no-exposure check: PASS
  - prototype zip validation: PASS
  - review-artifacts excluded check: PASS
  - generated/release output check: PASS
- Follow-up:
  - Keep PR #7 Draft until the alignment pass is reviewed.
  - Keep PR #6 as a Draft experimental reference branch.
## Task 2026-06-16 - PRO Task Workspace v2 Markdown hard rewrite

- Phase: pro-task-workspace-v2-markdown-hard-rewrite
- Branch: design/pro-task-workspace-v2-spec
- PR: #7
- Task type:
  - docs-only markdown hard rewrite
- Scope:
  - Allowed:
    - Rewrite SPEC as LF Markdown.
    - Rewrite ACCEPTANCE as LF Markdown.
    - Preserve design meaning.
    - Append this task record.
  - Forbidden:
    - Product code changes.
    - `src/**` changes.
    - `scripts/**` changes.
    - package/package-lock changes.
    - DB/public/CI changes.
    - user manual PNG changes.
    - generated/release output commits.
    - committed review artifacts or prototype artifacts.
- Changed files:
  - docs/PRO_TASK_WORKSPACE_V2_SPEC.md
  - docs/PRO_TASK_WORKSPACE_V2_ACCEPTANCE.md
  - docs/CODEX_TASKS.md
- Verification planned:
  - local byte LF/CR check
  - staged blob LF/CR check
  - origin object LF/CR check
  - raw first 40 lines visual check
  - docs-only scope check
  - no-exposure check

## Task 2026-06-19 - PRO Workspace v2 Layout Foundation

- Phase: pro-workspace-v2-layout-foundation
- Branch: codex/pro-workspace-v2-layout-foundation
- Task type:
  - product UX implementation / layout foundation
- Base:
  - main after PR #7
- Scope:
  - V2 shell
  - Task Choice
  - responsive primary canvas/context panel/action bar
  - legacy workflow adapter
  - focus/reduced-motion/target-size foundation
  - actual-browser/Electron artifact
- Excluded:
  - business flow rewrite
  - output payload changes
  - IPC changes
  - package changes
  - PR #6 code reuse
  - user manual PNG changes
  - generated/release output commits
  - committed review artifacts
- Verification planned:
  - git diff --check
  - npm.cmd run build
  - npm.cmd run verify:ui
  - npm.cmd run verify:board
  - node scripts/verify-output-settings.cjs
  - node scripts/verify-pro-workspace-v2-layout.cjs
  - npm.cmd run package:win
  - hidden/bidi/newline check
  - no-exposure check
  - scope check
- Known limitations:
  - This PR establishes the layout foundation only.
  - Complete board and PDF v2 step flows remain follow-up work.
  - Existing PRO controls are preserved through a temporary adapter.
- Follow-up:
  - PR B board insertion flow
  - PR C PDF/detail/preview integration
  - PR D motion/accessibility polish
  - PR E user manual update

## Task 2026-06-20 - PR #8 Window Policy Runtime Fix Closure

- Phase: pr8-window-policy-runtime-fix
- Branch: codex/pro-workspace-v2-layout-foundation
- Task type:
  - product UX runtime closure / responsive window policy
- Explicit scope approval:
  - Include `electron/main.ts` minimum window policy in PR #8.
  - Preserve default startup size at 1280 x 880.
  - Lower minimum window size and resize clamp to 900 x 720.
- Scope:
  - Electron window minimum constants and resize clamp.
  - PRO Workspace v2 preview toolbar clipping fix.
  - PRO Workspace v2 action bar normal-flow overlap fix.
  - V2 action target inventory and 40px / 44px hit-area fixes.
  - Authenticated Electron runtime artifact refresh.
  - Synthetic board/PDF/LITE output smoke.
- Excluded:
  - IPC channel or payload changes.
  - preload/API contract changes.
  - webPreferences/security changes.
  - auth/output business logic changes.
  - package/package-lock changes.
  - DB/public/CI changes.
  - user manual PNG changes.
  - generated/release output commits.
  - committed review artifacts.
- Runtime evidence:
  - configuredMinWidth: 900
  - configuredMinHeight: 720
  - requestedNarrowOuterWidth: 900
  - requestedNarrowOuterHeight: 720
  - actual narrow outer/client size recorded in local-only runtime artifact.
  - boardOutputSmoke: PASS
  - pdfOutputSmoke: PASS
  - liteSaveSmoke: PASS
- Verification planned:
  - git diff --check
  - npm.cmd run build
  - npm.cmd run verify:ui
  - npm.cmd run verify:board
  - node scripts/verify-output-settings.cjs
  - node scripts/verify-pro-workspace-v2-layout.cjs
  - npm.cmd run package:win
  - hidden/bidi/newline check
  - no-exposure check
  - scope check
- Known limitations:
  - PR #8 remains Draft after this closure pass.
  - PR #6 remains a Draft experimental reference branch.
  - Runtime artifacts are local-only and not committed.

## Task 2026-06-20 - PR B PRO Workspace v2 Board Flow

- Phase: pr-b-pro-workspace-v2-board-flow
- Branch: codex/pro-workspace-v2-board-flow
- Base: origin/main @ 368de3bdc34a4bf2ada30969015b83b28ff42abd
- Task type:
  - PRO Workspace v2 implementation / photo board flow
- Scope:
  - Implement Photo Board Image flow as 1 / 5 through 5 / 5.
  - Keep Task Choice as a pre-flow screen without numeric progress.
  - Reuse existing App-owned board state, photo rotation, preview, save folder, and output handlers.
  - Add board-flow components under `src/components/pro-workspace-v2/`.
  - Add static board-flow contract verification script.
- Excluded:
  - PR #6 cherry-pick, merge, or code copy.
  - PDF v2 flow implementation.
  - IPC, preload, output payload, package, public asset, DB, or CI changes.
  - user manual PNG changes.
  - generated/release output commits.
  - committed review artifacts.
- Verification planned:
  - git diff --check
  - npm.cmd run build
  - npm.cmd run verify:ui
  - npm.cmd run verify:board
  - node scripts/verify-output-settings.cjs
  - node scripts/verify-pro-workspace-v2-layout.cjs
  - node scripts/verify-pro-workspace-v2-board-flow.cjs
  - npm.cmd run package:win
  - authenticated Electron runtime QA
  - synthetic board output smoke
  - PDF adapter regression QA
  - LITE regression QA
  - hidden/bidi/newline check
  - no-exposure check
  - scope check
- Draft PR:
  - Keep as Draft until runtime QA and final review confirm no Must Fix blockers.

## Task 2026-06-20 - PR C PRO Workspace v2 PDF Flow

- Phase: pr-c-pro-workspace-v2-pdf-flow
- Branch: codex/pro-workspace-v2-pdf-flow
- Base: origin/main @ ccd62a4f607c021df29c32d442448b4355bbafe9
- Task type:
  - PRO Workspace v2 implementation / photo ledger PDF flow
- Scope:
  - Implement Photo Ledger PDF flow as 1 / 4 through 4 / 4.
  - Preserve completed Photo Board Image flow as 1 / 5 through 5 / 5.
  - Keep Task Choice as a pre-flow screen without numeric progress.
  - Reuse existing App-owned photo, order, ledger metadata, preview, save folder, and PDF output handlers.
  - Add PDF-flow components under `src/components/pro-workspace-v2/`.
  - Add static PDF-flow contract verification script.
- Excluded:
  - PR #6 cherry-pick, merge, or code copy.
  - IPC channel or preload/API contract changes.
  - output payload or PDF renderer contract changes.
  - package/package-lock changes.
  - DB/public/CI changes.
  - user manual PNG changes.
  - generated/release output commits.
  - committed review artifacts.
- Verification planned:
  - git diff --check
  - npm.cmd run build
  - npm.cmd run verify:ui
  - npm.cmd run verify:board
  - node scripts/verify-output-settings.cjs
  - node scripts/verify-pro-workspace-v2-layout.cjs
  - node scripts/verify-pro-workspace-v2-board-flow.cjs
  - node scripts/verify-pro-workspace-v2-pdf-flow.cjs
  - npm.cmd run package:win
  - authenticated Electron runtime QA
  - synthetic PDF output smoke
  - board flow regression QA
  - LITE regression QA
  - hidden/bidi/newline check
  - no-exposure check
  - scope check
- Draft PR:
  - Keep as Draft until runtime QA and final review confirm no Must Fix blockers.
