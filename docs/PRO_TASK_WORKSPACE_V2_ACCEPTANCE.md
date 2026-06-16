# PRO Task Workspace v2 Acceptance

## Default Window

| Criterion | Required result | Blocker level | Required evidence |
|---|---|---|---|
| `defaultRequiredScrollToCtaPx` | `<= 120` | S1 | Layout metrics JSON and default screenshot |
| `defaultMainCtaVisible` | `true` or short-scroll reachable | S1 | Default generate-ready screenshot |
| `defaultBottomOverflowDetected` | `false` | S1 | Layout metrics JSON |
| `horizontalOverflowPx` | `<= 1` | S1 | DOM metrics for document, body, workspace |
| Visual horizontal scrollbar | Not visible | S1 | Default packaged-window screenshot |
| Control overlap | No overlap | S1 | Default screenshots across active steps |
| Information density | One primary task canvas is dominant | S2 | Default task and settings screenshots |
| Preview clipping | Preview toolbar and buttons stay inside viewport | S1 | Default preview screenshot |

## Photo Rail

| Criterion | Required result | Blocker level | Required evidence |
|---|---|---|---|
| Large photo rail | Visible only on photo preparation | S2 | Photo step and non-photo step screenshots |
| Compact photo status | Used on non-photo steps | S2 | Content and generate-ready screenshots |
| Photo loaded state | At least one synthetic photo is visible | S1 | Photo loaded screenshot |
| Photo selected state | Selected or checked state is visible | S1 | Photo selected screenshot |
| Rotation state | Rotation-applied state is visible | S2 | Rotation evidence screenshot |
| Empty state | Explains add or drop action | S2 | Empty photo step screenshot |
| Photo evidence safety | Synthetic data only | S0 | No-exposure review notes |

## Preview

| Criterion | Required result | Blocker level | Required evidence |
|---|---|---|---|
| `boardSizeStepPreviewVisible` | `true` | S1 | Board size step screenshot |
| `boardSizePreviewNearControls` | `true` | S1 | Board size and position screenshot |
| Preview consistency | Preview matches selected job and photo state | S1 | Generate-ready screenshot |
| Preview toolbar | Buttons are not clipped | S1 | Default and fullscreen preview screenshots |
| Preview panel width | Does not force body overflow | S1 | Layout metrics JSON |
| Preview in narrow mode | Hidden, compact, or stacked without overflow | S2 | Narrow screenshot |

## Lower Band

| Criterion | Required result | Blocker level | Required evidence |
|---|---|---|---|
| Empty state | Clear add action is visible | S2 | Lower-band empty screenshot |
| Added state | Real row with label and value is visible | S1 | Lower-band added screenshot |
| Delete-ready state | Row removal target is clear | S2 | Lower-band delete-ready screenshot |
| Add control target | At least 40px | S2 | Layout metrics or screenshot annotation |
| Delete control target | At least 40px | S2 | Layout metrics or screenshot annotation |
| Density | Controls are not cramped | S2 | Lower-band screenshots |
| Row actions | Row-level edit or delete is understandable | S2 | Added and delete-ready screenshots |

## Fullscreen

| Criterion | Required result | Blocker level | Required evidence |
|---|---|---|---|
| Useful scaling | Extra space improves preview or work area | S2 | Fullscreen screenshot and metrics |
| Empty margin inflation | Not the primary scaling effect | S2 | Fullscreen comparison screenshot |
| Active task canvas | Remains visually dominant | S2 | Fullscreen active-step screenshot |
| Preview capacity | Preview gains useful space when appropriate | S2 | Fullscreen preview screenshot |
| Horizontal overflow | `horizontalOverflowPx <= 1` | S1 | Fullscreen DOM metrics |
| Visual scrollbar | No horizontal scrollbar | S1 | Fullscreen screenshot |

## Narrow

| Criterion | Required result | Blocker level | Required evidence |
|---|---|---|---|
| Horizontal overflow | `horizontalOverflowPx <= 1` | S1 | Narrow DOM metrics |
| Visual scrollbar | No horizontal scrollbar | S1 | Narrow screenshot |
| Main panel | Stacked and usable | S1 | Narrow active-step screenshot |
| Preview | Hidden, compact, or below main panel | S2 | Narrow generate-ready screenshot |
| Core CTA | Visible or short-scroll reachable | S1 | Narrow generate-ready screenshot |
| Action target | `>= 40px` | S2 | Metrics or screenshot annotation |
| Primary CTA | `>= 44px` | S1 | Metrics or screenshot annotation |

## Accessibility

| Criterion | Required result | Blocker level | Required evidence |
|---|---|---|---|
| Keyboard focus | `focus-visible` is clear | S1 | Keyboard QA notes or screenshot |
| Focus clipping | Focus ring is not clipped | S1 | Default and narrow screenshots |
| Reduced motion | State remains visible with reduced motion | S2 | Reduced-motion QA notes |
| Color independence | State does not rely on color only | S2 | Visual QA notes |
| Button wording | Purpose-centered labels | S3 | Copy review notes |
| Icon-only core action | Not used for critical actions | S2 | Screen review notes |

## Packaging

| Criterion | Required result | Blocker level | Required evidence |
|---|---|---|---|
| `npm.cmd run build` | PASS | S1 | Command output summary |
| `npm.cmd run verify:ui` | PASS when product code changes | S1 | Command output summary |
| `npm.cmd run verify:board` | PASS when product code changes | S1 | Command output summary |
| `node scripts/verify-output-settings.cjs` | PASS when product code changes | S1 | Command output summary |
| `npm.cmd run package:win` | Direct PASS preferred | S1 | Command output summary |
| EPERM fallback | Document as caveat if used | S2 | Packaging notes |
| Generated output | Not committed | S0 | Git status and scope check |

## No-Exposure

| Criterion | Required result | Blocker level | Required evidence |
|---|---|---|---|
| Synthetic data | Only synthetic photos and text | S0 | Evidence review notes |
| Real customer data | Not present | S0 | Evidence review notes |
| Sensitive path | Not present | S0 | No-exposure scan |
| Token or key | Not present | S0 | No-exposure scan |
| Signed URL or storage path | Not present | S0 | No-exposure scan |
| Full UUID or internal ID | Not present | S0 | No-exposure scan |
| Binary or base64 in reports | Not present | S0 | Artifact inspection |

## Artifact Consistency

| Criterion | Required result | Blocker level | Required evidence |
|---|---|---|---|
| `COMMIT.txt` | Matches implementation HEAD | S1 | Zip inspection |
| Screenshot count | Matches metrics, index, and zip listing | S1 | Artifact validation output |
| `index.md` refs | Match screenshot count | S1 | Artifact validation output |
| `index.html` refs | Match screenshot count | S1 | Artifact validation output |
| `layout-metrics.json` | Contains numeric metrics, not PASS strings | S1 | Metrics file inspection |
| Contact sheet | Shows real thumbnails | S2 | Contact sheet inspection |
| Evidence markdown | Includes required QA notes | S2 | Artifact file listing |
| Review artifacts | Remain uncommitted unless explicitly requested | S0 | Git status |

## Ready Gate

| Criterion | Required result | Blocker level | Required evidence |
|---|---|---|---|
| PR #6 state | Remains Draft until v2 prototype is approved | S1 | GitHub PR state |
| PR #7 state | Remains Draft until design review approval | S2 | GitHub PR state |
| Design approval | Required before implementation starts | S1 | Review decision |
| Implementation base | Accepted v2 design, not patching PR #6 | S1 | New branch plan |
| Scope split | Small PR A/B/C/D/E implementation path | S2 | Implementation plan |
| Product code change | None in design-spec PR | S0 | Scope check |
| Package changes | None in design-spec PR | S0 | Scope check |
| DB/public/CI changes | None in design-spec PR | S0 | Scope check |
| User manual PNG changes | None in design-spec PR | S0 | Scope check |
