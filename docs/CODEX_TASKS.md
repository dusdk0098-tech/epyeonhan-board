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

## Task 2026-06-14 - PRO guided workflow feedback

- Phase: pro-guided-workflow-feedback
- Branch: codex/pro-guided-workflow
- Task type:
  - UX improvement
- Scope:
  - Guided workflow, micro-interactions, button feedback, and generation status feedback for PRO options.
- Changed files:
  - src/App.tsx
  - src/components/pro-guided-workflow/ProGuidedWorkflow.tsx
  - src/components/pro-guided-workflow/ProWorkflowStep.tsx
  - src/components/pro-guided-workflow/ProWorkflowOptionCard.tsx
  - src/components/pro-guided-workflow/ProWorkflowSummary.tsx
  - src/components/pro-guided-workflow/ProWorkflowStepper.tsx
  - src/components/pro-guided-workflow/OutputProgressStatus.tsx
  - src/styles.css
  - docs/CODEX_TASKS.md
- Verification:
  - git diff --check: PASS
  - build: PASS
  - verify:ui: PASS
  - verify:board: PASS
  - verify-output-settings: PASS
  - package:win: PASS
  - browser auth-gate smoke: PASS
  - LITE/PRO manual QA: NOT_RUN - local preview requires an authenticated session before the workflow screens render.
  - reduced motion check: PASS - scoped CSS disables repeated motion under prefers-reduced-motion.
  - no-exposure: PASS
  - scope check: PASS
- Known limitations:
  - Full settings search/finder is not included.
  - Real percentage progress is not included.
  - Automatic carousel is intentionally not used.
  - Additional user manual update may be needed after UX is finalized.
- Follow-up:
  - Revisit copy and screenshots after the guided PRO flow receives manual user feedback.

## Task 2026-06-14 - PRO guided workflow accessibility fix

- Phase: pro-guided-workflow-accessibility-fix
- Branch: codex/pro-guided-workflow
- Task type:
  - UX fix / guided workflow stabilization
- Scope:
  - Corrected conditional flow so photo-ledger-only mode no longer exposes board-only workflow options.
  - Restored photo ledger content fields and per-photo detail editing inside the guided flow.
  - Restored circular highlight detail controls, including existing color and black-white options.
  - Rebalanced PRO preview/settings columns to give workflow and settings more room.
  - Moved step navigation directly under the active slide panel so previous/next actions remain visible.
  - Kept the top stepper as progress/status display and preserved summary edit links.
  - Strengthened hover scale feedback while preserving reduced-motion handling.
- Changed files:
  - src/App.tsx
  - src/components/pro-guided-workflow/ProGuidedWorkflow.tsx
  - src/styles.css
  - docs/CODEX_TASKS.md
- Verification:
  - git diff --check: PASS
  - build: PASS
  - verify:ui: PASS
  - verify:board: PASS
  - verify-output-settings: PASS
  - package:win: PASS
  - photo ledger flow QA: PASS with a synthetic clipboard image.
  - board insertion flow QA: PASS with a synthetic clipboard image.
  - existing option accessibility QA: PASS
  - step carousel / slide panel QA: PASS
  - layout QA: PASS
  - hover / animation QA: PASS
  - output generation feedback QA: PARTIAL - automated output verification passed; manual failure-state forcing was not run.
  - LITE regression QA: PASS visual smoke; PRO guided workflow did not appear in LITE.
  - hidden/bidi/newline check: PASS for bidi, zero-width, BOM, NBSP, lone CR, and CR-only newline.
  - no-exposure: PASS
  - scope check: PASS
- Known limitations:
  - Real percentage progress is still not included.
  - Full settings search/finder is not included.
  - Further user manual screenshot updates may be needed after UX acceptance.
  - Manual forced failure-state verification remains a follow-up candidate.
- Follow-up:
  - Repeat full output failure-path QA with a controlled error fixture before moving the draft PR to ready.

## Task 2026-06-14 - PRO guided workflow motion follow-up

- Phase: pro-guided-workflow-feedback
- Branch: codex/pro-guided-workflow
- Task type:
  - UX improvement follow-up
- Scope:
  - Convert the top PRO workflow stepper into progress/status display.
  - Advance to the next relevant step when the current option card is selected.
  - Strengthen guided motion, option-card hover feedback, focus-visible feedback, and output status feedback.
  - Keep output/PDF generation logic and existing setting values unchanged.
- Changed files:
  - src/components/pro-guided-workflow/ProGuidedWorkflow.tsx
  - src/components/pro-guided-workflow/ProWorkflowStep.tsx
  - src/components/pro-guided-workflow/ProWorkflowOptionCard.tsx
  - src/components/pro-guided-workflow/ProWorkflowStepper.tsx
  - src/components/pro-guided-workflow/OutputProgressStatus.tsx
  - src/styles.css
  - docs/CODEX_TASKS.md
- Verification:
  - git diff --check: PASS
  - build: PASS
  - verify:ui: PASS
  - verify:board: PASS
  - verify-output-settings: PASS
  - package:win: PASS
  - authenticated PRO guided workflow QA: PASS
  - LITE visual smoke QA: PASS
  - synthetic photo load/output generation manual QA: NOT_RUN - UI pass avoided file dialog/path exposure; automated output verification passed.
  - reduced motion check: PASS - scoped CSS disables repeated/scale motion under prefers-reduced-motion.
  - hidden/bidi/newline check: PASS
  - no-exposure: PASS
  - scope check: PASS
- Known limitations:
  - No fake percentage progress was added.
  - The top stepper is now status display; returning is handled by summary edit and previous/next controls.
  - Full manual photo import/output generation should be repeated with a synthetic image before the draft PR is promoted.

## Task 2026-06-14 - PRO task flow workspace redesign

- Phase: pro-task-flow-workspace-redesign
- Branch: codex/pro-guided-workflow
- Task type:
  - UX improvement / PRO workflow layout refinement
- Scope:
  - Reworked the PRO output screen into a task-flow workspace that centers the active guided step.
  - Converted the top workflow stepper into a compact progress/status strip with numbered dots.
  - Added mode-based workspace layout classes so start/configure/photo/preview/generate steps can show only the relevant settings, preview, or photo-list areas.
  - Moved legacy detailed PRO settings into a collapsed detail drawer while preserving access to the existing tabbed controls.
  - Reduced duplicate output action prominence by keeping 사진대지 만들기 as the primary action and moving secondary actions into a collapsed section.
  - Tuned hover/focus/active motion to avoid large layout-shifting scale effects and kept reduced-motion handling.
- Changed files:
  - src/App.tsx
  - src/components/pro-guided-workflow/ProGuidedWorkflow.tsx
  - src/components/pro-guided-workflow/ProWorkflowStepper.tsx
  - src/styles.css
  - docs/CODEX_TASKS.md
- Verification:
  - git diff --check: PASS
  - build: PASS
  - verify:ui: PASS
  - verify:board: PASS
  - verify-output-settings: PASS
  - package:win: PASS
  - lint: NOT_RUN - no lint script is defined.
  - typecheck: NOT_RUN - no typecheck script is defined.
  - test: NOT_RUN - no test script is defined.
  - authenticated PRO task-flow visual QA: PASS for start and configure steps; mode-based hiding and preview/settings balance were confirmed in Electron.
  - LITE visual smoke QA: PASS; existing LITE setup, preview, rotation controls, and run buttons remained visible.
  - photo import/output generation manual QA: NOT_RUN - file-dialog path entry was avoided; automated output verification passed.
  - design regression / large-window QA: PASS; no overlap found in checked PRO/LITE views.
  - reduced motion check: PASS by CSS review; new motion selectors are covered by prefers-reduced-motion.
  - hidden/bidi/newline check: PASS for BOM, bidi controls, zero-width characters, NBSP, lone CR, CR-only newline, and unusual invisible controls.
  - no-exposure: PASS
  - scope check: PASS
- Known limitations:
  - Small-window manual resizing was not exhaustively repeated in Electron for every PRO step.
  - Manual PDF failure-state forcing remains a follow-up candidate.
  - Full photo import/output manual QA should be repeated with a synthetic image before promoting the draft PR.

## Task 2026-06-14 - PRO task flow modern UX redesign

- Phase: pro-task-flow-modern-ux-redesign
- Branch: codex/pro-guided-workflow
- Task type:
  - UX improvement / PRO workflow workspace refinement
- Scope:
  - Kept the preview in a stable right rail across guided PRO steps on wide screens.
  - Made the preview more compact so the active task and detail controls keep priority.
  - Added responsive workspace sizing variables for larger text, larger controls, and cleaner fullscreen scaling.
  - Reused the existing board-field editor inside the lower-band item step so add/delete controls are available when the lower band is enabled.
  - Added visible text to item delete buttons to avoid icon-only critical controls.
  - Preserved existing PRO output/PDF logic, option values, and generated output structure.
- Changed files:
  - src/App.tsx
  - src/components/pro-guided-workflow/ProGuidedWorkflow.tsx
  - src/styles.css
  - docs/CODEX_TASKS.md
- Verification:
  - preview placement QA: PASS - Electron smoke confirmed the preview rail stays on the right after lower-band and item-cell step changes.
  - detail options panel QA: PASS - step content stays in the main task panel and lower-band item controls appear in the active step.
  - lower band item management QA: PASS - existing add/delete board-field controls are available in the lower-band item step.
  - 40+ usability QA: PASS - larger controls and visible delete labels were added.
  - fullscreen/responsive QA: PASS for maximized Electron smoke; compact/narrow breakpoints are covered by CSS review.
  - modern design QA: PASS - task panel and preview rail have clearer hierarchy without a broad redesign.
  - duplicate/missing button QA: PASS - lower-band item add/delete controls are visible and primary output actions remain unchanged.
  - flow QA: PASS - lower-band selection advances to item-cell setup without changing output logic.
  - regression QA: PASS by automated build/verification commands and manual PRO visual smoke.
  - reduced-motion/animation QA: PASS by CSS review; existing reduced-motion rules remain in place.
  - no-exposure: PASS
  - scope check: PASS
- Known limitations:
  - Small-window Electron resizing was not exhaustively repeated for every PRO step.
  - Manual PDF failure-state forcing remains a follow-up candidate.
  - Full authenticated photo import/output QA should be repeated before promoting the draft PR.

## Task 2026-06-14 - PRO task flow senior redesign

- Phase: pro-task-flow-senior-redesign
- Branch: codex/pro-guided-workflow
- Task type:
  - senior UX redesign / accessibility / verification improvement
- Scope:
  - Added a guided photo preparation step so board insertion and ledger flows expose photo-add actions before configuration.
  - Added a guided save-folder confirmation step before generation.
  - Kept board-mode generation on the existing checked-photo output path and kept ledger-mode PDF generation on the existing PDF path.
  - Strengthened fullscreen scaling with fluid typography, larger controls, larger cards, wider workspace use, and responsive density variables.
  - Modernized PRO card/surface hierarchy with stronger selected, current, hover, and primary CTA treatment.
  - Kept preview placement stable as a right rail on wide screens and stacked/compact at narrower widths.
  - Improved default-window accessibility with sticky guided navigation and clearer prerequisite status cards.
  - Preserved lower-band item management through the existing board-field editor and visible add/delete labels.
  - Created local screenshot, layout-metrics, and review index artifacts under review-artifacts/pr-6-ux-review.
  - Applied 40+ usability criteria for larger text, 44px+ control targets, clearer copy, and stronger state cues.
- Changed files:
  - src/App.tsx
  - src/components/pro-guided-workflow/ProGuidedWorkflow.tsx
  - src/styles.css
  - docs/CODEX_TASKS.md
- Verification:
  - senior review board: PASS - five read-only review roles completed and were aggregated into a local plan artifact.
  - fullscreen scaling QA: PASS by CSS review and fullscreen-like screenshot artifact.
  - visual design QA: PASS - stronger surface hierarchy, selected states, and CTA hierarchy applied.
  - hover regression QA: PASS by CSS review; hover uses scale, border, shadow, and background cues.
  - default window overflow QA: PASS for captured default window; sticky nav keeps step controls reachable.
  - board insertion flow QA: PASS - photo-add, folder-load, save-folder, checked-photo generation, and board setup are visible in the flow.
  - preview placement QA: PASS - wide layout keeps preview on the right rail.
  - lower band item management QA: PARTIAL - code path reuses the existing board-field editor; coordinate-driven screenshot capture repeatedly landed on the alternate position path.
  - task screen transition QA: PASS - task, photo, configure, save, preview, and generate steps have distinct centered task content.
  - review artifact QA: PASS - local screenshot gallery, layout-metrics.json, index.md, and index.html were generated and left uncommitted.
  - reduced-motion QA: PASS by CSS review.
  - no-exposure: PASS
  - scope check: PASS
- Known limitations:
  - Forced output progress and failure-state screenshots were not generated.
  - Lower-band item-management visual capture should be repeated with a more deterministic UI automation path.
  - Screenshot/layout review artifacts are local-only and not committed.
  - Further polish may be needed after user review of the packaged build.
- Follow-up:
  - Run subagent review after this senior redesign pass.
  - Repeat authenticated manual QA with synthetic photos before promoting the Draft PR.
  - Decide whether the user manual should be updated after UX acceptance.
