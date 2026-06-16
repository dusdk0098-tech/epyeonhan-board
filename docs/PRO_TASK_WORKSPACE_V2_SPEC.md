# PRO Task Workspace v2 Spec

## Objective

Define a design-first reset for the PRO workflow before any new product-code patch is attempted.

The goal is to make the PRO job understandable in the default packaged window first.

The workspace should guide a user from task choice to photo preparation, content decisions,
layout settings, generation readiness, and result feedback without relying on dense tabs.

This spec is a design contract for the next implementation branch.

It is not an implementation patch for PR #6.

## Why PR #6 Is Not Patched Further

PR #6 remains a Draft experimental branch.

Packaged-build UX acceptance did not approve the current patch direction.

The remaining issues are structural rather than small styling defects.

- Default-window information density is still too high.
- Some evidence captures show states that do not match the intended user task.
- Board size and position preview evidence is not close enough to the controls.
- Lower-band item management needs a clearer real-row add and delete model.
- Generate-ready evidence must align photo selection, save folder, preview, and CTA state.
- Fullscreen should use extra space for useful work areas, not only larger margins.
- Narrow mode must avoid horizontal overflow without hiding the user goal.

Continuing to stack small patches on PR #6 would make the interface harder to reason about.

A v2 spec and prototype review must happen before the next product-code implementation.

## V2 Core Principles

- Design the default packaged window as the primary baseline.
- Present one primary task canvas at a time.
- Keep one contextual side panel for the current decision.
- Show only the controls needed for the current step.
- Keep photo preparation large only while the user is preparing photos.
- Keep previews near the controls that affect them.
- Make readiness explicit before generation starts.
- Prefer clear step labels over decorative animation.
- Keep motion short, purposeful, and optional under reduced motion.
- Use fullscreen space for more useful preview, summary, and review capacity.
- Stack narrow layouts without creating horizontal overflow.
- Preserve no-exposure rules for all screenshots and artifacts.

## Jobs

PRO must start by asking which output the user wants to create.

The two jobs share photo preparation but diverge in content and generation decisions.

### Photo Board Image

Korean label: `사진 보드판 만들기`.

This job creates an image-based board from selected photos and board settings.

The user needs to prepare photos, confirm board insertion, tune board size and position,
optionally configure lower-band content, and generate an output image.

Primary success signal:

- A board preview matches the selected photos and settings.
- The generate CTA is visible or reachable with a short scroll.
- The result state confirms the generated board output.

### Photo Ledger PDF

Korean label: `사진대지 PDF 만들기`.

This job creates a PDF ledger from selected photos, order, metadata, and layout options.

The user needs to prepare photos, confirm PDF content, choose relevant metadata,
verify save destination, and generate the PDF.

Primary success signal:

- The PDF preview or readiness summary reflects selected photos and ordering.
- The save folder is ready before generation.
- The result state confirms the generated PDF output.

## Global Layout Model

The v2 workspace uses three stable regions.

- Header region: task title, stepper, current state, and compact mode switch.
- Main task canvas: the active step and its primary decision controls.
- Contextual panel: preview, summary, or help tied to the active step.

The main task canvas owns the user action.

The contextual panel explains or previews the consequence of that action.

The footer contains the primary CTA and secondary navigation when the step needs them.

Default window rule:

- Do not show a large photo rail, dense settings, and a preview rail at the same time.
- If three major regions compete, collapse one into a compact status or summary.
- Prefer short-scroll reachability over always-visible dense controls.

## Screen Visibility Policy

The workspace reveals detail only when it is relevant to the current step.

- Task choice shows no detailed board controls.
- Photo preparation shows the large photo rail and photo actions.
- Non-photo steps show compact photo status instead of the large photo rail.
- Board size and position shows controls near a live preview.
- Lower-band management shows real rows and row actions.
- Generate ready shows selected photo state, save folder state, preview state, and CTA state.
- Result and failure states show outcome, recovery, and next action.

A hidden control must not become unreachable.

A collapsed section must show enough summary text to explain why it is collapsed.

## Screen 1: Task Choice

Purpose:

- Let the user choose the output job before seeing detailed settings.
- Explain the difference between board image and photo ledger PDF in plain language.
- Avoid starting the user in a dense control surface.

Required elements:

- Two task cards with job labels.
- One-line explanation for each job.
- Recent or default task hint if available.
- Primary continue action after a task is selected.

Acceptance behavior:

- Selected task state is visually distinct from hover state.
- Keyboard focus is visible on each card.
- No auto-advance happens after selection.

## Screen 2: Photo Preparation

Purpose:

- Make photo addition, order, selection, and rotation obvious.
- Use the largest photo rail only here.
- Confirm that photos are ready before the user continues.

Required elements:

- Add photo or drop-zone affordance.
- Photo thumbnail rail with selected state.
- Rotation controls for selected photos.
- Compact count, selection, and warning summary.
- Continue CTA that reflects whether enough photos exist.

State rules:

- Empty state explains the next action.
- Photo-added state must visibly contain at least one synthetic test photo in evidence.
- Selected state must be visually different from loaded-only state.
- Rotation state must show that orientation changed.

## Screen 3: Board / Ledger Content

Purpose:

- Configure content that belongs to the selected job.
- Avoid exposing board-only controls during the PDF-only path.
- Avoid exposing PDF-only metadata controls during the board-image path.

Photo Board Image content:

- Board insertion choice.
- Board content summary.
- Optional lower-band entry point.
- Preview status tied to the board path.

Photo Ledger PDF content:

- PDF content summary.
- Photo order state.
- Metadata choices relevant to PDF output.
- Save folder readiness.

## Screen 4: Board Size / Position / Lower Band

Purpose:

- Keep visual layout controls close to the preview they affect.
- Make lower-band item management concrete and less dense.

Board size and position requirements:

- Preview must be visible on this step.
- Preview must be near the size and position controls.
- Controls must not push the preview out of view in the default window.
- The user should understand which setting changed the visible board.

Lower-band requirements:

- Empty state must show a clear add action.
- Added state must show a real row with label, value, and row action.
- Delete-ready state must show the row that will be removed.
- Add and delete controls must be at least 40px target size.
- Dense inline controls should be replaced with row-level controls when possible.

## Screen 5: Generate Ready

Purpose:

- Confirm the user has enough information to safely generate output.
- Align photo state, save folder state, preview state, and CTA state.

Required readiness summary:

- Selected job.
- Photo count.
- Selected or checked photo state.
- Save folder readiness.
- Preview readiness.
- Primary output CTA.

Generate-ready evidence is invalid if the preview shows a different state from the summary.

Generate-ready evidence is invalid if photos appear empty while the summary says photos are ready.

## Screen 6: Result / Failure

Purpose:

- Show a clear completion or failure state after generation.
- Provide a safe next action without exposing local paths or sensitive values.

Result state:

- Confirms output type.
- Shows synthetic-safe file naming or generic output summary.
- Offers open-folder or copy action only when safe for the product.

Failure state:

- Explains the failure in user language.
- Provides retry or settings correction.
- Does not show tokens, absolute local paths, signed URLs, or internal IDs.

## Component Model

Recommended component boundaries:

- `ProTaskWorkspaceShell` owns global layout and responsive regions.
- `ProTaskChoiceStep` owns job selection.
- `ProPhotoPreparationStep` owns photo rail, selection, and rotation controls.
- `ProContentStep` owns job-specific content choices.
- `ProBoardLayoutStep` owns board size, position, and lower-band controls.
- `ProGenerateReadyStep` owns readiness summary and primary CTA.
- `ProResultState` owns success and failure feedback.
- `ProContextPanel` owns preview, summary, and step help.

Component rules:

- Avoid concentrating all v2 UI in `App.tsx`.
- Do not introduce new output option values without product approval.
- Reuse existing photo rotation and output settings state where possible.
- Keep props explicit and tied to visible responsibilities.

## Responsive Model

### Default Window

Default window is the primary design target.

- The main CTA should be visible or reachable within 120px of vertical scroll.
- Horizontal overflow must not appear.
- The preview panel must not clip its toolbar or action buttons.
- The layout must avoid showing large photo rail, dense settings, and preview rail together.

### Fullscreen

Fullscreen must use extra space for useful work areas.

- Increase preview usefulness, not only outer margins.
- Allow summary and detail panels to breathe without lowering information clarity.
- Keep the active task canvas visually dominant.

### Narrow

Narrow mode must stack content without horizontal overflow.

- Hide or compact the preview rail when it would squeeze the main task.
- Keep action targets at least 40px.
- Keep the primary CTA at least 44px.
- Preserve focus-visible rings without clipping.

## Prototype Review Frames

A design prototype should include the following frames before implementation starts.

- Default task choice.
- Default photo preparation empty.
- Default photo loaded and selected.
- Default board insertion content.
- Default board size and position with nearby preview.
- Default lower-band empty state.
- Default lower-band added state.
- Default lower-band delete-ready state.
- Default generate ready.
- Default result state.
- Default failure state.
- Fullscreen board size and position.
- Fullscreen generate ready.
- Narrow photo preparation.
- Narrow generate ready.

Every evidence frame must use synthetic photos and synthetic text.

## Motion Model

Motion should guide attention rather than decorate the interface.

- Use short transitions for hover, focus, and selection.
- Avoid repeated blinking or infinite bounce.
- Avoid layout-shifting hover scale.
- Use progress motion only while work is actually pending.
- Honor `prefers-reduced-motion` by reducing transform and animation intensity.

## Accessibility Model

The v2 implementation must be usable by keyboard and by users who need reduced motion.

- Interactive targets should be at least 40px.
- Primary CTA should be at least 44px.
- Focus-visible rings must not be clipped.
- Selected, current, disabled, complete, and error states must not rely on color only.
- Step labels should be readable without relying on icons alone.
- Reduced motion must not hide state changes.

## No-Exposure Rules

All design, prototype, QA, and review evidence must avoid sensitive content.

- Use synthetic photos only.
- Do not show real customer data.
- Do not show personal names, account names, emails, phone numbers, or addresses.
- Do not show local absolute paths.
- Do not show tokens, passwords, keys, licenses, signed URLs, or storage paths.
- Do not show full UUIDs or internal IDs.
- Do not include binary or base64 content in Markdown reports.

## Implementation Split

Implementation should happen in small PRs after this design direction is accepted.

Recommended split:

- PR A: shell layout and task choice.
- PR B: photo preparation and compact photo status.
- PR C: board content and board size or position step.
- PR D: lower-band item management.
- PR E: generate-ready, result, failure, and final metrics.

Each implementation PR should include packaged-build evidence for its own surface.

Each implementation PR should keep PR #6 as reference only, not as the patch base.
