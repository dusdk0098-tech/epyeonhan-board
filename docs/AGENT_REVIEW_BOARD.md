# Agent Review Board

PEDIT 작업은 구현자와 검증자를 분리한다. 구현 담당 Codex는 코드를 수정하고 Evidence Bundle을 만든다. 서브에이전트는 코드를 수정하지 않고 독립 검증만 수행한다. 메인 에이전트만 검증 결과를 취합하고 우선순위를 결정한다.

## Core Rules

- 서브에이전트는 코드 수정 금지.
- 서브에이전트는 Evidence Bundle과 명시 증거만 검증.
- 증거 없는 PASS는 무효.
- 메인 에이전트는 중복 이슈를 병합하고 심각도를 재분류한다.
- S0/S1이 있으면 새 기능 개발 금지.

## Main Orchestrator

- 작업 범위와 금지 범위를 확인한다.
- Evidence Bundle을 작성한다.
- 서브에이전트 검증 결과를 수집한다.
- 중복/충돌 이슈를 병합하고 최종 verdict를 낸다.
- 다음 작업 타입을 fix-only, stabilization, QA-only, feature continuation, release readiness 중 하나로 결정한다.

## Functional QA Agent

- 기능 요구사항 충족 여부 검증.
- happy path와 edge case 검증.
- 기존 기능 회귀 가능성 확인.

## Design Regression Agent

- UI, 레이아웃, 반응형, spacing, typography, color, interaction 상태 검증.
- before/after screenshot 또는 브라우저 확인 증거 없이는 visual PASS 금지.

## Code Quality & Architecture Agent

- 코드 구조, 책임 분리, 중복, 타입 안정성, 예외 처리, 하드코딩, 기존 패턴 위반 검증.

## Security & Privacy Agent

- 민감값, 권한 우회, public URL, service role, 사용자 데이터 노출 검증.

## Test & Build Verification Agent

- git diff --check, lint, typecheck, test, build 실행 여부와 NOT_RUN reason 검증.

## Optional API/DB Contract Agent

- API request/response, DB migration, 기존 데이터 호환성, rollback 가능성 검증.
- Supabase migration과 Edge Function 변경이 있을 때 우선 사용한다.

## Optional Product Requirements Agent

- 원래 요구사항과 구현 결과 일치 여부 검증.
- 범위 초과, 누락, 사용자 기대와 다른 결과를 확인한다.

## Optional Release Risk Agent

- 배포 가능성, known issue, rollback, monitoring, readiness 검증.
- installer, update metadata, release note, 사용자 안내 자료를 확인한다.

## Conflicting Opinions

- 메인 에이전트는 충돌 의견을 같은 증거 기준으로 재검토한다.
- 더 엄격한 판정이 타당하면 낮은 상태로 조정한다.
- 증거가 부족하면 PASS로 올리지 않고 PARTIAL 또는 NOT_RUN으로 둔다.
