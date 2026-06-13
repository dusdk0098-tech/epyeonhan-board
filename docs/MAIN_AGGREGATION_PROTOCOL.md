# Main Aggregation Protocol

메인 에이전트는 서브에이전트의 검증 결과를 그대로 복사하지 않고, 증거 기준으로 취합한다.


## Aggregation Rules

- 같은 원인의 이슈는 하나로 병합한다.
- 심각도는 사용자 영향과 배포 위험 기준으로 재분류한다.
- 서브에이전트 PASS를 그대로 믿지 않는다.
- 증거 없는 PASS는 PARTIAL 또는 NOT_RUN으로 낮춘다.
- S0/S1 발견 시 다음 지시문은 fix-only 또는 stabilization으로 생성한다.
- 누락 증거는 별도 Missing Evidence로 기록한다.


## Duplicate Handling

- 여러 에이전트가 같은 문제를 보고하면 가장 구체적인 증거를 기준으로 병합한다.
- 같은 증상이지만 원인이 다르면 별도 이슈로 유지한다.
- product, security, design, test 영향이 겹치면 가장 높은 심각도를 적용한다.


## Conflicting Agent Opinions

- 충돌 의견은 어떤 증거가 있는지 먼저 비교한다.
- 증거가 더 강한 의견을 채택한다.
- 둘 다 증거가 부족하면 NOT_RUN 또는 PARTIAL로 둔다.
- 최종 결정과 이유를 기록한다.


## Next Work Type

- `fix-only`: S0/S1 또는 명확한 FAIL이 있을 때.
- `stabilization`: 여러 PARTIAL/S2 또는 배포 전 안정화가 필요할 때.
- `QA-only`: 코드 변경 없이 검증 증거가 부족할 때.
- `feature continuation`: S0/S1 없고 핵심 검증이 충분할 때.
- `release readiness`: 기능 범위가 안정되고 배포 준비 검토가 필요할 때.


## Main Aggregated Review Template

```md


# Main Aggregated Review


## Executive Verdict

PASS / PARTIAL / FAIL / NOT_RUN


## Merge / Proceed Decision

- Safe to merge:
  - Yes / No / Conditional
- Safe to start next feature:
  - Yes / No
- Required next action:
  - fix-only PR / stabilization PR / additional QA / next feature allowed


## Critical Findings


### Finding A

- Severity:
- Source agents:
- Consolidated description:
- Evidence:
- Why it matters:
- Required fix:


## Duplicated or Related Findings

- [병합한 이슈 설명]


## Conflicting Agent Opinions

- Conflict:
- Resolution:
- Final decision:


## Missing Evidence

- [없는 증거]
- Impact:
- Required verification:


## PASS/PARTIAL/NOT_RUN/FAIL Matrix

| Area | Status | Reason |
|---|---|---|
| Functional QA |  |  |
| Design regression |  |  |
| Code quality |  |  |
| Security/no-exposure |  |  |
| Tests/build |  |  |
| DB/API compatibility |  |  |
| Release readiness |  |  |


## Next Work Type

fix-only / QA-only / stabilization / feature continuation / release readiness


## Draft Next Instruction For GPT5.5PRO

[GPT5.5PRO에게 붙여넣을 요약]


## Draft Direct Codex Prompt

[Codex에 바로 붙여넣을 수 있는 다음 지시문]

```
