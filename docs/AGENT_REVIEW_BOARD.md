# Agent Review Board

이 문서는 PEDIT 개발 결과를 여러 독립 서브에이전트가 검증하고, 메인 에이전트가 취합하는 운영 구조를 정의한다.

## Core Rules

- 개발 에이전트와 검증 에이전트를 분리한다.
- 서브에이전트는 코드를 수정하지 않는다.
- 서브에이전트는 Evidence Bundle과 증거만 보고 검증한다.
- 메인 에이전트만 취합, 심각도 재분류, 다음 작업 우선순위 결정을 수행한다.
- 증거 없는 PASS는 무효이며 PARTIAL 또는 NOT_RUN으로 낮춘다.
- S0/S1 이슈가 있으면 새 기능 개발을 금지한다.

## Main Orchestrator

- 서브에이전트 보고서를 취합한다.
- 중복 이슈를 병합한다.
- 충돌 의견을 증거 기준으로 해소한다.
- PASS/PARTIAL/FAIL/NOT_RUN matrix를 작성한다.
- GPT5.5PRO에 전달할 다음 지시문 요약을 만든다.

## Required Subagents

### Functional QA Agent

- 기능 요구사항 충족 여부를 검증한다.
- happy path와 edge case를 검증한다.
- 기존 기능 회귀 가능성을 확인한다.

### Design Regression Agent

- UI, 레이아웃, 반응형, spacing, typography, color, interaction 상태를 검증한다.
- before/after screenshot 또는 브라우저 확인 증거 없이는 visual PASS를 허용하지 않는다.

### Code Quality & Architecture Agent

- 코드 구조, 책임 분리, 중복, 타입 안정성, 예외 처리, 하드코딩, 기존 패턴 위반을 검증한다.

### Security & Privacy Agent

- 민감값, 권한 우회, public URL, service role, 사용자 데이터 노출을 검증한다.

### Test & Build Verification Agent

- `git diff --check`, lint, typecheck, test, build, NOT_RUN reason을 검증한다.

## Optional Subagents

### API/DB Contract Agent

- API request/response, DB migration, 기존 데이터 호환성, rollback 가능성을 검증한다.

### Product Requirements Agent

- 원래 요구사항과 구현 결과의 일치 여부, 범위 초과, 누락 기능을 검증한다.

### Release Risk Agent

- 배포 가능성, known issue, rollback, monitoring, readiness를 검증한다.

## Conflict Handling

- 서브에이전트 의견이 충돌하면 증거가 더 강한 쪽을 채택한다.
- 양쪽 모두 증거가 부족하면 NOT_RUN 또는 PARTIAL로 둔다.
- 최종 결정과 이유를 Main Aggregated Review에 기록한다.
