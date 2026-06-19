# PRO Task Workspace v2 Spec

## Objective

PRO Task Workspace v2 is a design-first reset for the PRO tab.

The goal is to stop patching PR #6 and define a clearer task-first workspace before any new product-code implementation begins.

The default packaged window is the primary baseline. The fullscreen and narrow layouts must adapt from that baseline without creating empty whitespace, hidden actions, or competing panels.

The interface should let a non-technical user understand three things immediately:

- What am I making?
- What do I need to do now?
- What will happen when I press the main action?

This document is a design contract. It is not a product-code patch.

## Why PR #6 Is Not Patched Further

PR #6 should remain a Draft experimental branch.

The branch contains useful exploration, but continuing to apply small layout and CSS patches has created unstable evidence and shifting screen behavior.

The remaining problem is information architecture, not one isolated CSS defect.

The next implementation should start from the accepted v2 design, not from another incremental PR #6 patch.

Reasons to pause PR #6:

- The default window still needs a clearer primary task canvas.
- Photo rail, preview rail, guided steps, summary cards, and detail settings should not compete at the same time.
- Board size and position controls need a nearby preview.
- Lower-band item management needs a real row-based add and delete model.
- Generate-ready state must align selected photo, save folder, preview, and CTA state.
- Fullscreen should use space for useful work areas, not empty margins.
- Narrow mode should stack without hiding the goal or creating horizontal overflow.
- Review artifacts must be stable and trustworthy before implementation continues.

## V2 Core Principles

The v2 workspace follows these principles:

- Use one primary task canvas at a time.
- Use one contextual side panel at a time.
- Make the current task visually dominant.
- Keep the next action visible or reachable with a short scroll.
- Do not show three large rails in the default window.
- Show the large photo rail only during photo preparation.
- Show preview near controls when visual adjustment is required.
- Show compact photo status on non-photo steps.
- Keep detailed settings contextual, not as a bottom-only long block.
- Keep motion short, purposeful, and optional under reduced motion.
- Use fullscreen space for real utility.
- Avoid horizontal overflow in every layout.
- Use synthetic data only in design, QA, screenshots, and review artifacts.

## Progress Model

- Task Choice is a pre-flow screen and has no numeric step.
- Photo Board Image uses 5 steps.
- Photo Ledger PDF uses 4 steps.
- A user must never see skipped or duplicated step numbers.
- Previous is hidden when no previous step exists.
- Progress labels are derived from the selected job path.

### Photo Board Image Steps

1. Photo preparation.
2. Board content.
3. Board size, position, and lower band.
4. Generate ready.
5. Result success or failure.

### Photo Ledger PDF Steps

1. Photo preparation.
2. PDF information and layout.
3. PDF generate ready.
4. Result success or failure.

## Jobs

PRO has two top-level jobs.

### Photo Board Image

Korean label:

- 사진 보드판 만들기

This job creates an image-based board from selected photos and board settings.

The user needs to:

- Add photos.
- Select or check photos.
- Confirm board content.
- Tune board size and position.
- Optionally configure lower-band content.
- Optionally configure circular highlight settings.
- Choose or confirm a save folder.
- Generate an output image.

Primary success signals:

- The board preview reflects the selected photo and settings.
- The main generate CTA is visible or short-scroll reachable.
- The result state confirms the generated board output.

### Photo Ledger PDF

Korean label:

- 사진대지 PDF 만들기

This job creates a PDF ledger from selected photos, order, metadata, and layout options.

The user needs to:

- Add photos.
- Select or check photos.
- Confirm photo order.
- Confirm PDF-related content and metadata.
- Choose or confirm a save folder.
- Preview the result.
- Generate a PDF.

Primary success signals:

- The preview or readiness summary reflects selected photos and ordering.
- The save folder is ready before generation.
- The result state confirms the generated PDF output.

### Shared and Job-Specific Controls

| Control | Photo board image | Photo ledger PDF | Notes |
|---|---|---|---|
| 사진 추가 | Common | Common | Large photo list appears only during photo preparation. |
| 사진 선택 | Common | Common | Later steps use compact photo status. |
| 회전 | Common | Common | Rotation is handled before job-specific settings. |
| 미리보기 | Common | Common | Preview must match the selected output type. |
| 저장폴더 | Common | Common | Confirmed before generation. |
| 보드 제목 / 보드 항목 | Visible | Hidden | Board-image only. |
| 보드 크기 / 위치 | Visible | Hidden | Board-image only. |
| 하부띠 / 항목칸 | Visible | Hidden | Board-image only. |
| 원형강조 | Visible | Hidden | Board-image only. |
| PDF 대지 / 여백 / 순서 | Hidden | Visible | Photo-ledger PDF only. |
| PDF 생성 | Hidden | Visible | Photo-ledger PDF only. |

Board-only controls must not appear in the photo-ledger PDF flow.

PDF-only controls must not appear in the photo board image flow.

Common controls must be labeled as common when they appear in both flows.

## Global Layout Model

The workspace uses three stable regions.

### Header Region

The header region contains:

- Current job title.
- Current step title.
- Compact progress indicator.
- Optional mode switch or compact task summary.

The header must not become a large required navigation bar.

### Main Task Canvas

The main task canvas owns the current user action.

Examples:

- Choose task.
- Add photos.
- Enter board content.
- Adjust board size.
- Manage lower-band items.
- Confirm generation.

The main task canvas should be visually dominant in the default window.

### Contextual Side Panel

The contextual side panel shows what helps the active step.

Possible content:

- Compact preview.
- Live preview.
- Photo readiness summary.
- Detail settings.
- Help text.
- Validation summary.

Only one contextual side panel should be prominent at a time.

### Action Area

The action area contains:

- Primary CTA.
- Secondary actions.
- Previous and next controls.
- Result or retry actions when applicable.

The action area must not overlay important content.

## Screen Visibility Policy

The workspace shows information only when it helps the current task.

### Photo Rail Policy

Large photo rail:

- Visible on photo preparation steps.
- May be visible when selecting, ordering, or rotating photos.

Compact photo status:

- Used on content, settings, preview, and generate steps.
- Shows count, selected state, or photo readiness.
- Provides a return action to photo management.

Hidden photo rail:

- Allowed when photos are not relevant to the current decision.

### Preview Policy

Preview is visible when the user adjusts visual output.

Preview should be visible for:

- Board size.
- Board position.
- Lower-band visual settings.
- Circular highlight settings.
- Preview step.
- Generate-ready step, if useful.

Preview may be hidden or compact for:

- Task choice.
- Text entry.
- Non-visual setup.
- Photo preparation before any photo is loaded.

### Detail Settings Policy

Detail settings should appear as:

- Contextual side panel.
- Internal step tabs.
- Drawer within the active screen.
- Compact panel beside preview.

Detail settings should not be:

- A bottom-only block that pushes actions out of view.
- A giant always-visible form.
- A hidden area with no obvious way to return.

## Screen 1: Task Choice

### Purpose

Let the user choose the desired output before showing detailed settings.

### Visible Elements

- Two large task cards.
- 사진 보드판 만들기.
- 사진대지 PDF 만들기.
- Short plain-language explanation for each job.
- Optional recent task or recommended task hint.
- Primary continue action after task selection.

### Hidden Elements

- Large photo rail.
- Large preview.
- Board size settings.
- Lower-band item management.
- Generate controls.

### Default Layout

- Task cards centered in the main task canvas.
- Context panel shows brief help or “what happens next”.
- No large preview rail.

### Fullscreen Layout

- Cards become wider and more readable.
- Extra space supports a help panel or example outcome.
- It must not only add empty margins.

### Narrow Layout

- Cards stack vertically.
- Primary action remains visible or short-scroll reachable.
- No horizontal overflow.

### Acceptance

- The selected task state is visually distinct from hover.
- Keyboard focus is visible on each card.
- No automatic transition occurs before the user confirms the choice.

## Screen 2: Photo Preparation

### Purpose

Make photo addition, selection, ordering, and rotation obvious.

### Visible Elements

- Add photo action.
- Drop-zone or import prompt.
- Photo thumbnail list or grid.
- Selected or checked photo state.
- Rotation controls.
- Photo count.
- Continue CTA.

### Hidden or Compact Elements

- Board size controls.
- Lower-band item management.
- Generate progress.
- Full preview rail, unless useful after photo load.

### Default Layout

- Photo grid/list is the primary content.
- Context panel may show compact guidance.
- The main CTA remains visible or short-scroll reachable.

### Fullscreen Layout

- More thumbnails can be visible.
- Preview can be larger if a photo is selected.
- Controls should scale up.

### Narrow Layout

- Photo grid stacks.
- Rotation controls remain accessible.
- CTA remains visible or short-scroll reachable.

### Acceptance

- Empty state explains what to do.
- Loaded state visibly contains at least one synthetic photo.
- Selected state differs from loaded-only state.
- Rotation state visibly changes orientation.
- Evidence screenshots must not show a blank photo area while claiming photo-loaded.

## Screen 3: Board / Ledger Content

### Purpose

Configure content belonging to the selected job.

### Photo Board Image Content

Show:

- Board insertion decision.
- Board content fields.
- Board input method.
- Compact photo readiness status.
- Entry point to lower-band settings.
- Entry point to board size and position.

Hide:

- PDF-only metadata not relevant to the board-image path.

### Photo Ledger PDF Content

Show:

- PDF content summary.
- Photo order state.
- Metadata choices relevant to PDF output.
- Save folder readiness.
- Compact photo readiness status.

Hide:

- Board-only controls.
- Lower-band controls unless the chosen PDF mode requires them.

### Default Layout

- Main task canvas contains relevant fields.
- Context panel shows compact summary or detail settings.
- Large photo rail is not shown.

### Acceptance

- Fields are editable.
- The user can return to photo preparation.
- Board-only options do not appear in PDF-only paths.
- PDF-only controls do not appear in board-image paths.

## Screen 4: Board Size / Position / Lower Band

### Purpose

Let the user adjust visual board layout while seeing the result.

### Required Elements

- Board size controls.
- Board position controls.
- Live or compact preview near the controls.
- Lower-band on/off choice.
- Lower-band item management when lower band is enabled.
- Circular highlight entry point if relevant.

### Preview Requirement

Preview must be near the controls that affect it.

The user should be able to see the consequence of a size or position change without switching to a separate screen.

### Lower-Band Requirements

Lower-band item management must show real rows.

States:

- Empty state.
- Added state.
- Delete-ready state.

Each row should include:

- Label or item name.
- Value or content input.
- Delete action.
- Clear row-level affordance.

### Default Layout

- Controls and preview visible together.
- Lower-band panel appears in the contextual area or active step panel.
- CTA remains visible or short-scroll reachable.

### Fullscreen Layout

- Preview and controls use additional space.
- Lower-band rows can be easier to scan.

### Narrow Layout

- Controls stack.
- Preview may move below controls.
- Horizontal overflow is not allowed.

### Acceptance

- Board size preview is visible.
- Board position preview is visible.
- Lower-band add button is visible.
- Lower-band delete button is visible.
- Add and delete targets are at least 40px high.
- Preview and controls do not overlap.

## Screen 5: Generate Ready

### Purpose

Confirm that the output can be safely generated.

### Required Readiness Summary

Show:

- Selected job.
- Photo count.
- Selected or checked photo state.
- Save folder readiness.
- Preview readiness.
- Main generate CTA.
- Any blocking prerequisite.

### Generate CTA Rules

The CTA is enabled only when the required prerequisites are ready.

The CTA must not cover:

- Status cards.
- Error cards.
- Hint text.
- Readiness summary.

### Default Layout

- Readiness summary and CTA are visible.
- Preview is compact but meaningful.
- CTA remains visible or short-scroll reachable.

### Fullscreen Layout

- Extra space can show preview and readiness side by side.

### Narrow Layout

- Stack readiness, preview, and CTA.
- CTA must not overlap status text.
- Horizontal overflow is not allowed.

### Acceptance

- Preview state matches selected photo state.
- Save folder state is clear.
- Generate action is visible.
- Output progress has a stable location.

## Screen 6: Result / Failure

### Purpose

Show completion or a recoverable failure.

### Success State

Show:

- Plain success message.
- Output type.
- Safe output summary.
- Open folder action if safe.
- Start another output action.
- Edit and regenerate action if relevant.

### Failure State

Show:

- Plain-language failure message.
- Retry action.
- Edit settings action.
- Safe explanation without sensitive data.

### Rules

Do not show:

- Full local paths.
- Tokens.
- Keys.
- Signed URLs.
- Full UUIDs.
- Internal IDs.
- Real customer data.

### Acceptance

- No fake percentage.
- Duplicate-click path is blocked during processing.
- Failure has a clear recovery path.

## Workflow State Ownership

The implementation should keep workflow state ownership explicit so App.tsx does not become the only state container.

| State | Owner component | Used by | Notes |
|---|---|---|---|
| selectedJob | ProTaskWorkspaceShell | Header, task canvas, action bar | Determines board-image or PDF flow. |
| selectedPhotos | ProPhotoPreparationStep | Compact photo status, preview, generate readiness | Source list for active output. |
| checkedPhotos | ProPhotoPreparationStep | Photo rail, PDF ordering, board preview | Supports multi-select and ordering. |
| photoRotation | ProPhotoPreparationStep | Photo rail, preview, output adapter | Reuse existing rotation behavior. |
| previewState | ProPreviewPanel | Context panel, generate readiness | Must match selected job and photo state. |
| saveFolderReady | ProGenerateReadyStep | Generate button, readiness summary | Avoid showing sensitive absolute paths. |
| lowerBandItems | ProLowerBandItemManager | Board layout step, board preview | Board-image flow only. |
| boardSize | ProBoardLayoutStep | Board preview, generate readiness | Board-image flow only. |
| boardPosition | ProBoardLayoutStep | Board preview, generate readiness | Board-image flow only. |
| circleHighlight | ProBoardLayoutStep | Board preview, output adapter | Board-image flow only. |
| generateReadiness | ProGenerateReadyStep | Action bar, progress area | Derived from photos, preview, save folder, and job settings. |
| outputStatus | ProResultState | Result panel, action bar | Covers idle, processing, success, failure, and retry. |

## Component Model

Recommended components:

- ProTaskWorkspaceShell.
- ProTaskHeader.
- ProTaskCanvas.
- ProContextPanel.
- ProTaskChoiceStep.
- ProPhotoPreparationStep.
- ProContentStep.
- ProBoardLayoutStep.
- ProLowerBandItemManager.
- ProPreviewPanel.
- ProGenerateReadyStep.
- ProResultState.
- ProActionBar.
- ProOptionCard.

### Component Rules

- Do not concentrate all v2 UI in App.tsx.
- Keep state ownership explicit.
- Reuse existing photo rotation state.
- Reuse existing output settings state.
- Do not introduce new output option values without product approval.
- Keep props tied to visible responsibilities.

## Responsive Model

### Default Window

The default packaged window is the primary target.

Rules:

- One dominant task canvas.
- One contextual side panel.
- No three competing rails.
- CTA visible or short-scroll reachable.
- No horizontal overflow.
- Detail settings above the fold or in contextual panel.

### Fullscreen

Fullscreen must use extra space for useful work.

Rules:

- Typography can scale up within bounds.
- Cards can become more readable.
- Preview can gain useful space.
- Summary and detail can coexist.
- The active task remains visually dominant.

### Narrow

Narrow layouts stack.

Rules:

- No horizontal overflow.
- Preview hidden, compact, or below main content.
- Primary CTA visible or short-scroll reachable.
- Focus-visible rings remain visible.
- Touch and mouse targets stay usable.

## Prototype Review Frames

A design prototype should include frames for:

- Default task choice.
- Default photo empty.
- Default photo loaded.
- Default photo selected.
- Default board content.
- Default board size and position with nearby preview.
- Default lower-band empty.
- Default lower-band added.
- Default lower-band delete-ready.
- Default generate ready.
- Default generated result.
- Default failure state.
- Fullscreen board size and position.
- Fullscreen generate ready.
- Narrow photo preparation.
- Narrow board size.
- Narrow generate ready.

Every evidence frame must use synthetic photos and synthetic text.

### Current Static Prototype Coverage

The PR #7 local static prototype is a design-spec artifact, not runtime proof.

It should honestly label which required screens are represented and which evidence is still deferred to implementation PRs.

| Required screen/frame | Prototype evidence | Status |
|---|---|---|
| Task Choice | Default Window Flow / 작업 유형 선택 | PASS |
| Photo Preparation | Default Window Flow / 사진 준비 | PASS |
| Board / Ledger Content | Board content and PDF content sections | PASS |
| Board Size / Position / Lower Band | Photo board image flow / board adjustment | PASS |
| Generate Ready | Board image generate-ready and PDF generate-ready sections | PASS |
| Result / Failure | 완료 / 문제 해결 section | PASS |
| Default Window Flow | Default, board, and PDF flow sections | PASS |
| Fullscreen Flow | Fullscreen Flow section | PASS |
| Narrow Flow | Narrow Flow section | PASS |
| Runtime screenshots | Deferred to implementation PR evidence | PARTIAL |

`layout-metrics.json` in the static prototype records design target values only.

Implementation PRs must regenerate measured DOM and screenshot metrics.

## Motion Model

Motion should guide attention.

Use motion for:

- Step transition.
- Option selection.
- Hover feedback.
- Focus feedback.
- Generate progress.
- Success confirmation.

Avoid:

- Infinite bounce.
- Repeated flashing.
- Layout-shifting hover.
- Slow transitions.
- Motion that hides state.

Reduced motion must preserve state feedback.

## Accessibility Model

V2 must support keyboard, pointer, and reduced-motion users.

Requirements:

- Action targets at least 40px.
- Primary CTA at least 44px.
- Focus-visible rings not clipped.
- Critical actions cannot be icon-only.
- Selected, current, disabled, complete, and error states cannot rely only on color.
- Status updates should use appropriate live regions when implemented.
- Reduced motion must not hide state changes.

## No-Exposure Rules

All design, prototype, QA, and review evidence must avoid sensitive content.

Rules:

- Use synthetic photos only.
- Use synthetic labels only.
- Do not show real customer data.
- Do not show personal names.
- Do not show account names.
- Do not show emails.
- Do not show phone numbers.
- Do not show addresses.
- Do not show local absolute paths.
- Do not show tokens.
- Do not show passwords.
- Do not show keys.
- Do not show license values.
- Do not show signed URLs.
- Do not show storage paths.
- Do not show full UUIDs.
- Do not show internal IDs.
- Do not include binary or base64 content in Markdown reports.

## Implementation Split

Implementation should happen after design approval.

Recommended split:

### PR A: Workspace Shell

Scope:

- PRO shell layout.
- Task choice.
- Responsive region model.
- Workflow state ownership contract.
- No output logic changes.

### PR B: Photo Preparation

Scope:

- Photo rail policy.
- Photo loaded and selected states.
- Rotation integration.
- Compact photo status.

### PR C: Board Content and Layout

Scope:

- Board content flow.
- Board size and position.
- Nearby preview.
- Detail settings panel.

### PR D: Lower Band

Scope:

- Lower-band empty state.
- Added rows.
- Delete-ready rows.
- Item add and delete controls.

### PR E: Generate and Result

Scope:

- Generate-ready state.
- Save folder readiness.
- Progress and result states.
- Failure path.

Each implementation PR should include packaged-build evidence for its own surface.

Each implementation PR should keep PR #6 as a reference branch only, not as the patch base.
