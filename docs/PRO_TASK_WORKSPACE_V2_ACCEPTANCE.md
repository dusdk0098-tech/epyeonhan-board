# PRO Task Workspace v2 Acceptance

## Default Window

| Criterion | Required result | Blocker level |
|---|---|---|
| Current task title is visible | PASS | S1 |
| Primary controls are visible | PASS | S1 |
| Previous/next or main CTA is visible or within short scroll | `defaultRequiredScrollToCtaPx <= 120` | S1 |
| Generate-ready CTA is visible | `defaultMainCtaVisible = true` | S1 |
| Horizontal overflow | `horizontalOverflowPx <= 1` and no visual horizontal scrollbar | S0/S1 |
| Bottom overflow | `defaultBottomOverflowDetected = false` | S1 |
| Sticky/footer overlap | `defaultStickyFooterOverlapsContent = false` | S1 |
| Control overlap | `controlOverlapDetected = false` | S0/S1 |
| Photo-added state | No three-panel pressure from large photo rail, settings, and preview | S1 |
| Default-window density | Repeated cards and summary rows do not crowd the main task | S2 |

Required screenshots:

- PRO task choice
- PRO photo empty
- PRO photo loaded
- PRO photo selected/checked with rotation controls
- board content entry
- board size/position with live preview
- lower-band item management empty
- lower-band item added
- lower-band item delete-ready
- generate-ready with selected photo and preview
- generated result

## Photo Rail

| Criterion | Required result | Blocker level |
|---|---|---|
| Large photo rail appears only in photo preparation | `photoRailLargeOnlyOnPhotoStep = true` | S1 |
| Non-photo steps show compact photo readiness | PASS | S1 |
| Photo loaded evidence uses synthetic photo | `evidenceUsesSyntheticPhoto = true` | S0 |
| Selected/checked state is visible | PASS | S1 |
| Rotation-applied state is visible | PASS | S1 |
| Return to photo management is clear | PASS | S2 |
| Photo rail does not create horizontal overflow | `horizontalOverflowPx <= 1` | S1 |

Required states:

- empty
- loaded
- selected/checked
- rotation-applied
- error or invalid photo

## Preview

| Criterion | Required result | Blocker level |
|---|---|---|
| Board size/position preview is visible | `boardSizeStepPreviewVisible = true` | S1 |
| Preview is near controls | `boardSizePreviewNearControls = true` | S1 |
| Lower-band preview matches selected mode | `lowerBandPreviewMatchesMode = true` | S1 |
| Generate-ready preview matches selected photo | `generateReadyPhotoPreviewCtaConsistent = true` | S0/S1 |
| Preview does not overlap primary controls | `previewOverlapsStage = false` | S1 |
| Preview panel has useful width in default window | `previewRailUsefulWidth >= 360` when required | S2 |
| Fullscreen preview uses extra space | `fullscreenPreviewAreaRatio >= 1.5` versus default | S2 |

Visual adjustment steps requiring preview:

- board size
- board position
- lower-band mode
- item-cell visibility
- highlight settings
- generate-ready

## Lower Band

| Criterion | Required result | Blocker level |
|---|---|---|
| Empty state captured | PASS | S1 |
| Added state captured | PASS | S1 |
| Delete-ready state captured | PASS | S1 |
| Add/delete controls visible | `lowerBandAddDeleteControlsVisible = true` | S1 |
| Add/delete target height | At least 40px | S1 |
| Lower-band settings do not hide the CTA | PASS | S1 |
| Lower-band preview updates near controls | PASS | S1 |
| Deletion is clearly reversible or confirmed | PASS | S2 |

Evidence must show actual rows, not only an empty settings panel.

## Fullscreen

| Criterion | Required result | Blocker level |
|---|---|---|
| Meaningful workspace expansion | Preview or active controls gain useful area | S2 |
| Preview stage growth | `fullscreenPreviewAreaRatio >= 1.5` versus default for adjustment screens | S2 |
| Side summary bounded | PASS | S2 |
| No horizontal overflow | `horizontalOverflowPx <= 1` | S1 |
| Generate CTA remains visible | PASS | S1 |
| Extra space is not only empty margins | PASS | S2 |

Required screenshots:

- fullscreen board size/position with preview
- fullscreen generate-ready with preview and CTA

## Narrow

| Criterion | Required result | Blocker level |
|---|---|---|
| Single-column layout | PASS | S1 |
| No horizontal overflow | `horizontalOverflowPx <= 1` | S1 |
| Generate CTA visible or short-scroll reachable | `narrowRequiredScrollToCtaPx <= 120` | S1 |
| Preview is compact or hidden when lower priority | PASS | S2 |
| Visual adjustment preview remains reachable | PASS | S1 |
| Touch targets preserved | Action target >= 40px, primary CTA >= 44px | S1 |
| Focus ring not clipped | `focusVisibleClippedCount = 0` | S2 |

Required screenshots:

- narrow photo step
- narrow board size/position step
- narrow generate-ready with CTA visible

## Accessibility

| Criterion | Required result | Blocker level |
|---|---|---|
| General action target size | `minActionTargetHeight >= 40` | S1/S2 |
| Primary CTA target size | `minPrimaryCtaHeight >= 44` | S1 |
| Focus ring visibility | `focusVisibleClippedCount = 0` | S2 |
| Keyboard order follows visual order | PASS | S2 |
| Disabled actions have no hover lift | PASS | S2 |
| Busy state blocks duplicate submit | PASS | S1 |
| Error message appears near related panel | PASS | S1 |
| Reduced motion keeps state feedback visible | `reducedMotionStateFeedbackVisible = true` | S2 |

## Packaging

| Criterion | Required result | Blocker level |
|---|---|---|
| Build | `npm.cmd run build` PASS | S1 |
| UI verification | `npm.cmd run verify:ui` PASS | S1 |
| Board verification | `npm.cmd run verify:board` PASS | S1 |
| Output settings verification | `node scripts/verify-output-settings.cjs` PASS | S1 |
| Direct packaging | `npm.cmd run package:win` PASS | S1 |
| Packaging caveat | Any EPERM or fallback path is documented as caveat, not clean PASS | S1 |
| Generated output | Not committed | S0 |

Preferred packaging wording for caveats:

```text
package:win: PASS with caveat.
Direct npm.cmd run package:win hit a local Windows EPERM rename lock.
Manual recovery plus prepackaged builder completed and installer was generated.
Treat as not a clean direct-script PASS until a fresh direct package:win run passes.
```

## No-Exposure

| Criterion | Required result | Blocker level |
|---|---|---|
| Synthetic photos only | `evidenceUsesSyntheticPhoto = true` | S0 |
| Sensitive local path absent | `evidenceContainsSensitivePath = false` | S0 |
| Real customer data absent | `evidenceContainsRealCustomerData = false` | S0 |
| Token/signed URL absent | `evidenceContainsTokenOrSignedUrl = false` | S0 |
| Account/personal identifiers absent | PASS | S0 |
| Image/PDF/workbook binary or base64 absent | PASS | S0 |
| Review artifacts local-only | PASS unless explicitly requested otherwise | S1 |

No-exposure scan targets:

- Markdown evidence
- JSON metrics
- HTML index
- screenshot visual review
- PR body

## Artifact Consistency

| Criterion | Required result | Blocker level |
|---|---|---|
| Commit file | `COMMIT.txt` equals reviewed HEAD | S1 |
| Screenshot count | zip, index.md, index.html, and metrics count match | S1 |
| Contact sheet | Shows actual thumbnails | S1 |
| Required evidence docs | Present when claimed in PR body | S1 |
| Metrics contain numbers | Not only string PASS values | S1 |
| Artifacts untracked | `review-artifacts` not staged or committed | S1 |

Required metrics fields:

```json
{
  "commit": "",
  "screenshotCount": 0,
  "viewport": {
    "width": 0,
    "height": 0,
    "mode": "default"
  },
  "defaultRequiredScrollToCtaPx": 0,
  "defaultMainCtaVisible": true,
  "defaultBottomOverflowDetected": false,
  "defaultStickyFooterOverlapsContent": false,
  "horizontalOverflowPx": 0,
  "visualHorizontalScrollbarVisible": false,
  "controlOverlapDetected": false,
  "photoRailLargeOnlyOnPhotoStep": true,
  "detailSettingsAccessibleAboveFold": true,
  "boardSizeStepPreviewVisible": true,
  "boardSizePreviewNearControls": true,
  "lowerBandPreviewMatchesMode": true,
  "lowerBandAddDeleteControlsVisible": true,
  "generateReadyPhotoPreviewCtaConsistent": true,
  "failedActionTargets": 0,
  "minActionTargetHeight": 40,
  "minPrimaryCtaHeight": 44,
  "focusVisibleClippedCount": 0,
  "reducedMotionStateFeedbackVisible": true,
  "evidenceUsesSyntheticPhoto": true,
  "evidenceContainsSensitivePath": false,
  "evidenceContainsRealCustomerData": false,
  "evidenceContainsTokenOrSignedUrl": false
}
```

## Ready Gate

The v2 implementation can move toward Ready for review only when:

- S0/S1 blockers are closed.
- Default-window packaged QA passes.
- Required screenshots are present and consistent.
- Build and verification commands pass.
- Direct packaging passes, or any fallback is documented as a caveat.
- No-exposure passes.
- Generated output and review artifacts remain uncommitted.

Design approval gate:

- PR #6 is not merged as-is.
- The v2 prototype is reviewed before implementation.
- The implementation starts from a separate branch after design approval.
- Implementation PRs are split into small reviewable slices.
- Direct `package:win` PASS is preferred for implementation readiness.
- EPERM fallback is allowed only as a documented caveat, not as a clean direct-script PASS.

Required screenshots or static frames before implementation:

- default task choice
- default photo preparation
- default content step with compact photo status
- default board size/position/lower-band with preview
- default generate-ready
- default result/failure
- fullscreen visual adjustment
- fullscreen generate-ready
- narrow photo preparation
- narrow visual adjustment
- narrow generate-ready
