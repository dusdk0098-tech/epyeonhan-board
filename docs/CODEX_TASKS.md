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
