# PRO Task Workspace v2 Spec

## Objective

PRO Task Workspace v2 is a design-first reset after PR #6 packaged-build UX acceptance did not pass.

PR #6 remains a Draft experimental branch.

This spec defines the target workflow before any further product-code implementation. The goal is not to add another CSS patch on top of PR #6. The goal is to agree on a stable screen model that helps public users understand:

- what kind of PRO output they are creating
- which photo state is active
- which setting matters now
- where the preview is
- when the final generate action is safe

The default packaged window is the primary design baseline. Fullscreen should make the workspace more useful, not only add whitespace. Narrow windows should keep the next action visible with short scroll.

## Why PR #6 Is Not Patched Further

PR #6 proved that a guided PRO workflow is useful, but the packaged-build UX review found structural problems that small patches could not resolve cleanly.

Current blockers from PR #6:

- default-window information density and scrolling remain too high
- photo-added states can make photo list, settings, and preview compete for space
- board size and position preview evidence is not trustworthy enough
- lower-band item management evidence is incomplete
- generate-ready state can appear inconsistent with photo and preview readiness
- fullscreen can expand whitespace more than useful task space
- detail settings can be pushed below the useful first view

V2 handles these as design constraints rather than bug-by-bug layout patches.

PR #6 should therefore stay Draft as an experimental reference branch. Implementation should continue only after this v2 spec and prototype are reviewed.

## V2 Core Principles

1. One primary task canvas.
2. One contextual side panel.
3. No three competing rails in the default window.
4. Large photo rail only on the photo preparation step.
5. Preview near controls whenever the user is making visual adjustments.
6. Action footer has reserved layout space and never overlays content.
7. Each step has one dominant decision and one obvious next action.
8. Fullscreen expands useful preview/control space instead of only adding margins.
9. Narrow windows stack panels without horizontal overflow.
10. Review artifacts remain local-only unless explicitly requested.

## Jobs

### Job 1: Photo Board Image

User-facing label:

- `사진 보드판 만들기`

Purpose:

- Create an image output where selected photos include a board, lower band, item cells, and visual placement controls.

Included decisions:

- photo add, select, order, and rotation
- board title and content fields
- board size and position
- lower-band on/off
- lower-band item add, edit, and delete
- item-cell visibility
- highlight on/off
- save location
- board image generation

Excluded from this job:

- PDF page layout
- PDF page metadata
- ledger-only document settings

### Job 2: Photo Ledger PDF

User-facing label:

- `사진대지 PDF 만들기`

Purpose:

- Create a PDF document from selected photos with ordering, rotation, captions, metadata, and page layout.

Included decisions:

- photo add, select, order, and rotation
- PDF document information
- photo captions or metadata fields
- page layout
- preview of selected pages
- save location
- PDF generation

Excluded from this job:

- board insertion
- board position
- lower-band item management

## Global Layout Model

The workspace uses one primary task canvas, one contextual side panel, and one reserved action footer.

Default-window rule:

- Do not show a large photo rail, settings canvas, and preview rail at the same time.
- The current step title, primary controls, and next action must be visible without long scroll.
- A large photo rail is allowed only during photo preparation.
- Visual adjustment steps must show controls and preview in the same view.

Panel roles:

| Panel | Role | Default visibility |
|---|---|---|
| Primary task canvas | Current step controls and primary decision | Always visible |
| Context panel | Preview, readiness, or compact summary for the current step | Visible only when useful |
| Photo status chip | Compact count/selection/rotation status outside photo steps | Replaces large rail |
| Action footer | Previous, next, generate, retry, or result actions | Reserved space, never overlaying content |

Step-kind layout contract:

| Step kind | Primary canvas | Context panel | Large photo rail | Preview |
|---|---|---|---|---|
| `choice` | Two job cards | Short readiness summary | No | No |
| `photo` | Photo grid/list and photo actions | Compact help/status | Yes | Optional compact preview |
| `content` | Board or PDF content fields | Compact photo status | No | Optional |
| `adjust` | Board size, position, lower band, highlight controls | Live preview | No | Required |
| `generate` | Readiness checklist and generate CTA | Compact preview/status | No | Required |
| `result` | Completion or failure recovery | Result actions | No | Optional |

Global state model:

| State | Values |
|---|---|
| `job` | `none`, `board`, `pdf` |
| `photos` | `empty`, `loading`, `loaded`, `selected`, `noneSelected`, `rotated`, `ordered`, `error` |
| `preview` | `unavailable`, `stale`, `ready`, `rendering`, `error` |
| `saveFolder` | `unset`, `set`, `unavailable` |
| `boardConfig` | `incomplete`, `valid`, `dirty` |
| `lowerBand` | `off`, `empty`, `hasItems`, `deleteReady` |
| `pdfConfig` | `incomplete`, `valid`, `dirty` |
| `generate` | `disabled`, `ready`, `running`, `success`, `failure` |
| `viewport` | `default`, `fullscreen`, `narrow` |

## Screen Visibility Policy

The visibility policy is the contract that prevents PR #6's panel competition from returning.

| Screen | Large photo rail | Compact photo status | Preview | Detail settings | Main CTA |
|---|---|---|---|---|---|
| Task Choice | Hidden | Hidden | Hidden | Hidden | Continue after job selection |
| Photo Preparation | Visible | Optional | Optional compact | Hidden | Continue to content |
| Board/Ledger Content | Hidden | Visible | Optional | Contextual tab or side drawer | Continue to adjustment |
| Board Size/Position/Lower Band | Hidden | Visible | Required | Above-fold contextual controls | Continue to generate |
| Generate Ready | Hidden | Visible | Required compact preview | Hidden or compact edit shortcuts | Generate |
| Result/Failure | Hidden | Optional | Optional result preview | Hidden | Open, retry, or revise |

Failure conditions:

- a default-window screen shows large photo rail, settings canvas, and preview rail together
- visual adjustment controls appear without preview
- generate-ready CTA appears enabled while photo selection or preview is not ready
- action footer covers status text or form fields
- detail settings are reachable only after long scroll

## Screen 1 Task Choice

Purpose:

- Let the user choose the PRO job before any dense settings appear.

Primary canvas:

- Two task cards:
  - `사진 보드판 만들기`
  - `사진대지 PDF 만들기`
- Each card uses one short result description and one small status line.

Context panel:

- Optional compact explanation of what happens next:
  - add photos
  - check direction
  - choose output settings
  - generate

Required behavior:

- No preview rail.
- No large photo rail.
- No advanced setting drawer.
- One primary CTA appears after selecting a job.

Acceptance notes:

- A first-time user should understand the difference between board image and PDF without reading a long paragraph.
- The screen should not look like a setup form.
- Default, fullscreen, and narrow frames all show the same two decisions without adding preview clutter.

## Screen 2 Photo Preparation

Purpose:

- Add photos, select photos, set order, and confirm rotation before job-specific settings.

Primary canvas:

- Empty state with clear photo add/drop action.
- Photo grid/list after load.
- Visible selected/checked state.
- Rotation controls for the selected photo.
- Ordering controls when multiple photos exist.

Context panel:

- Compact guidance:
  - photo count
  - selected count
  - current rotation
  - next action

Required states:

- empty
- loaded
- selected/checked
- rotation-applied
- invalid or failed photo

Restrictions:

- Do not show the full job settings and full preview beside a large photo rail in the default window.
- The preview can be compact, but photo management must be the dominant task.
- Photo rail is intentionally large here because the task is photo management.

## Screen 3 Board/Ledger Content

Purpose:

- Collect content required for the selected job.

Board job primary canvas:

- Board title/content fields.
- Field list for board insertion.
- Compact access to detailed board settings.

PDF job primary canvas:

- Document title or file label.
- Caption or metadata controls.
- Page grouping or ordering controls.

Context panel:

- Compact photo status chip:
  - photo count
  - selected count
  - current photo name redacted to basename only when shown
  - return to photo management action

Required behavior:

- Only settings relevant to the selected job are visible.
- Board-only lower-band controls are not shown in the PDF branch.
- PDF-only page settings are not shown in the board branch.
- Detail settings are available through contextual tabs or a bounded side drawer near the current fields.

## Screen 4 Board Size/Position/Lower Band

Purpose:

- Adjust visual board settings while seeing the result.

Primary canvas:

- Board size controls.
- Position controls.
- Lower-band mode controls.
- Item-cell visibility controls.
- Lower-band item add/edit/delete controls.
- Highlight controls when enabled.

Context panel:

- Live preview of the selected photo with the board overlay.

Required behavior:

- Controls and preview must be visible together.
- The preview must update when size, position, lower-band mode, item cells, or highlight settings change.
- Lower-band item management must show real empty, added, and delete-ready states.
- Add/delete controls must have at least 40px target height.

Restrictions:

- Large photo rail is not visible here.
- Advanced detail controls are not placed below a long scroll-only section.
- Hover scale must not create overflow or overlap.
- Lower-band item rows show add, added, and delete-ready states before implementation approval.

## Screen 5 Generate Ready

Purpose:

- Confirm that the output is ready, then run generation.

Primary canvas:

- Readiness checklist:
  - job selected
  - photo loaded
  - photo selected/checked
  - rotation confirmed
  - job settings valid
  - save folder set
- Main generate CTA.
- Progress status area.

Context panel:

- Compact preview matching the selected photo and selected job.

Required behavior:

- Photo selected/checked state, preview state, and CTA enabled state must be consistent.
- Generate CTA is visible in the default window.
- Generate running disables duplicate clicks.
- Failure state uses the same status area with a retry path.
- No fake percentage is shown unless real progress exists.
- Save folder readiness appears as a state row, not as a hidden requirement.

## Screen 6 Result/Failure

Purpose:

- Show a stable completion or recovery state.

Success state:

- Clear completion sentence.
- Open result action.
- Open folder action.
- Start another output action.

Failure state:

- Clear error sentence without sensitive paths.
- Retry action.
- Return to settings action.
- The failed state must not expose local full paths, account names, tokens, signed URLs, storage paths, or full UUIDs.

## Component Model

Required components:

| Component | Responsibility |
|---|---|
| `ProTaskWorkspaceShell` | Overall layout, step-kind contract, responsive panel policy |
| `ProJobChoice` | Board/PDF job selection |
| `ProPhotoPreparation` | Photo add, selection, order, rotation states |
| `ProPhotoStatusChip` | Compact photo readiness outside photo steps |
| `ProBoardContentStep` | Board content fields |
| `ProPdfContentStep` | PDF document/page fields |
| `ProVisualAdjustmentStep` | Board size, position, lower band, item cells, highlight |
| `ProPreviewPanel` | Preview states for board/PDF/generate |
| `ProReadinessChecklist` | Generate readiness state |
| `ProGenerationStatus` | Idle, running, success, failure |
| `ProActionFooter` | Previous/next/generate/retry actions with reserved space |

State guidance:

- Job state determines which branch is visible.
- Step kind determines layout, not ad hoc CSS overrides.
- Preview state must be derived from selected photo and job settings.
- Generate state must derive from the same readiness model that enables the CTA.
- Detail settings should be contextual tabs or bounded drawers inside the current step.

## Responsive Model

### Default Window

Target:

- Packaged default window, roughly 1280x720 equivalent.

Rules:

- Current title, primary controls, and action footer are visible.
- No visual horizontal scrollbar.
- `horizontalOverflowPx <= 1`.
- `defaultRequiredScrollToCtaPx <= 120`.
- `defaultMainCtaVisible = true` for generate-ready.
- Main task canvas should stay at least 560px wide when preview is visible.
- Preview panel should be at least 360px wide when required.
- Large photo rail appears only on the photo step.
- Content, adjustment, and generate steps use compact photo status instead of a full rail.
- Detail settings are above the fold through contextual tabs or side controls.

### Fullscreen

Target:

- 1500px+ width and 850px+ height, with 1920x1080 as an additional review point.

Rules:

- Extra space expands preview and active controls.
- Side summary stays bounded.
- The layout must not simply create empty margins.
- Preview stage area should increase by at least 1.5x compared with default for visual adjustment screens.
- Typography and controls may scale modestly, but repeated summary rows stay bounded.
- Extra width goes to preview, visual controls, and readable comparison space.

### Narrow

Target:

- 900x720 and below.

Rules:

- Single-column layout.
- Visual adjustment screens place preview adjacent to controls vertically.
- Generate-ready prioritizes readiness and CTA over large preview.
- CTA is visible or reachable with no more than 120px short scroll.
- No horizontal overflow.
- Core buttons remain text-labeled, not icon-only.
- Preview can move below controls, but it cannot disappear on visual adjustment steps.

## Prototype Review Frames

The local prototype at `review-artifacts/pro-task-workspace-v2/` must show:

- Default Window Flow
- Fullscreen Flow
- Narrow Flow
- Acceptance Mapping

The prototype is not production code. It is a static review artifact that should make the v2 layout decisions visible before implementation starts.

Required visual evidence in the prototype:

- task choice with no preview rail
- photo preparation with large photo rail and rotation controls
- board or ledger content with compact photo status
- board size, position, lower-band controls near live preview
- lower-band item add and delete-ready controls
- generate-ready checklist, preview, status area, and visible CTA
- result and failure actions
- PR #6 problem-to-v2 solution mapping

## Motion Model

Principles:

- Motion is guidance, not decoration.
- Avoid infinite bounce, repeated flashing, or full-screen movement.
- Use 120ms to 180ms transitions for border, background, shadow, and color.
- Avoid layout-affecting hover scale. If scale is used, it must be no more than 1.01 and must not create overlap.

Reduced motion:

- Disable animated scroll.
- Remove scale and repeated animation.
- Keep selected, current, completed, disabled, success, and error states visible through color, border, icon, and text.

## Accessibility Model

Minimum targets:

- General action target: 40px minimum height.
- Primary CTA: 44px minimum height.
- Focus-visible ring is never clipped.
- Keyboard tab order follows the visual task order.
- Disabled actions do not show hover lift.
- Busy state prevents duplicate submit.
- Error messages appear near the affected panel, not only as transient notifications.

Text model:

- Use action-oriented labels.
- Prefer `사진 추가`, `보드판 위치 확인`, `PDF 만들기`, and `저장 위치 선택`.
- Avoid long descriptive blocks in the primary canvas.
- Keep helper text short and specific to the current step.

## No-Exposure Rules

Design artifacts and QA evidence must use synthetic data only.

Never expose:

- account names
- personal names
- email addresses
- phone numbers
- local full paths
- API keys
- tokens
- passwords
- signed URLs
- storage paths
- full UUIDs
- real customer file names
- real customer document content
- image, PDF, or workbook binary/base64 content

Review artifacts must remain local-only unless a later task explicitly asks to commit them.

## Implementation Split

Recommended sequence:

1. Keep PR #6 as a Draft experimental reference branch.
2. Review this v2 spec and static prototype before product-code work.
3. Implement a fresh shell and layout contract in a new implementation branch.
4. Build the common job choice and photo preparation screens first.
5. Implement the board branch separately.
6. Implement the PDF branch separately.
7. Implement shared generate/result/failure states.
8. Regenerate review artifacts only after the screen model is stable.
9. Run build, UI verification, board verification, output-settings verification, direct package check, no-exposure, and packaged default-window QA before Ready for review.

Implementation should replace layered override patches with a coherent step-kind layout model.

Implementation PR split:

1. Workspace shell and step-kind layout contract.
2. Job choice and photo preparation.
3. Board branch content and visual adjustment screens.
4. PDF branch content and page preview screens.
5. Shared generate, result, and failure states.
6. Packaged QA evidence and user-facing polish.

Each implementation PR should keep its scope small enough to review without mixing layout, output internals, and packaging changes.
