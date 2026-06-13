# PEDIT Development Process

이 문서는 PEDIT 개발 작업에서 기능, 디자인, 보안, 테스트, DB/API 계약,
아키텍처가 함께 관리되도록 하는 운영 기준이다. 모든 작업은 작은 브랜치와
작은 PR 단위로 진행하고, 검증 증거가 없는 PASS 판정은 인정하지 않는다.

## Project Principles

- 제품 코드는 최소 변경으로 수정하고 기존 구조를 우선한다.
- 변경 범위는 `src/`, `electron/`, `supabase/`, `scripts/`, `public/`, `.github/`, `docs/` 중 작업 목적과 직접 관련된 영역으로 제한한다.
- 사용자 파일, 실제 고객 파일, 로컬 개인 경로, 비밀값은 저장소와 문서에 포함하지 않는다.
- DB migration, Supabase Edge Function, Electron packaging, public asset, CI 변경은 PR 본문에 별도 위험과 검증 결과를 기록한다.
- 사용자가 명령을 직접 실행하도록 시키지 않고, Codex가 가능한 명령과 검증을 직접 수행한다.

## Branch And PR Types

- `feature PR`: 새 기능 또는 사용자 플로우를 추가한다.
- `fix-only PR`: 기존 결함, S0/S1 이슈, 회귀를 해결한다. 새 기능을 추가하지 않는다.
- `stabilization PR`: 배포 전 안정화, 회귀 수정, 검증 보강에 집중한다.
- `docs-only QA PR`: 제품 코드 없이 운영 문서, 체크리스트, 검증 절차만 변경한다.
- `security review PR`: 권한, 민감값, 인증/인가, 공개 URL, service role 사용 범위를 점검하거나 수정한다.
- `release readiness PR`: 배포 전 체크리스트, known issue, rollback, monitoring, 사용자 제공 자료를 정리한다.

## Standard Flow

1. 설계: 요청 목적, 허용 범위, 금지 범위, 영향 영역을 확인한다.
2. 구현: 작은 단위로 변경하고, 불필요한 리팩터링을 피한다.
3. Evidence Bundle 작성: 변경 파일, 구현 요약, 검증 결과, 미검증 항목을 기록한다.
4. 서브에이전트 검증: 독립 에이전트가 Evidence Bundle과 증거만 보고 검증한다.
5. 메인 취합: 중복 이슈 병합, 심각도 분류, PASS/PARTIAL/FAIL/NOT_RUN 판정을 수행한다.
6. GPT5.5PRO 다음 지시문 생성: 취합 결과를 바탕으로 다음 Codex 작업 지시문을 만든다.
7. 후속 결정: S0/S1이 있으면 fix-only 또는 stabilization만 허용한다. 없으면 다음 기능 또는 release readiness로 진행한다.

## Status Definitions

- `PASS`: 증거가 있고 요구사항을 충족함.
- `PARTIAL`: 일부 충족했지만 누락, 제약, 미검증 항목이 있음.
- `NOT_RUN`: 실행하지 못했거나 증거가 없음.
- `FAIL`: 검증 실패, 요구사항 불충족, 회귀, 보안 위험, 빌드 실패 등이 있음.

## Severity Definitions

- `S0 / Blocker`: 앱 실행 불가, 빌드 실패, 핵심 기능 중단, 데이터 손실, 보안 노출, 권한 우회, production 배포 금지.
- `S1 / Critical`: 주요 사용자 플로우 실패, 기존 기능 회귀, API/DB 호환성 문제, 주요 화면 깨짐, 다음 라운드에서 반드시 수정.
- `S2 / Major`: 엣지 케이스 실패, UX 혼란, 테스트 부족, 성능 저하 가능성, 배포 전 해결 권장.
- `S3 / Minor`: 문구, spacing, polish, 문서 보완.
- `Info`: 참고 의견, 장기 개선, 리팩터링 제안.

## S0/S1 Gate

- S0 또는 S1이 확인되면 새 기능 개발을 시작하지 않는다.
- 다음 PR은 `fix-only PR` 또는 `stabilization PR`로 제한한다.
- S0/S1 해결 전 release readiness를 Ready로 판정하지 않는다.
- 증거가 없는 "문제 없음"은 PASS가 아니라 NOT_RUN 또는 PARTIAL이다.

## Merge And Cleanup

- PR merge 후 로컬 작업 브랜치와 임시 산출물을 정리한다.
- dev server, Electron 프로세스, 임시 캡처, 테스트 fixture, review artifact가 남아 있지 않은지 확인한다.
- merge 후에도 다음 작업 전에 `git status`로 의도하지 않은 변경이 없는지 확인한다.

## Result Report Format

작업 완료 보고에는 다음을 포함한다.

- 변경 요약
- 수정 파일 목록
- PR URL
- 검증 결과
- docs-only 여부 또는 제품 코드 변경 여부
- package/package-lock 변경 여부
- DB migration 추가 여부
- public asset 변경 여부
- CI 변경 여부
- 민감값 미노출 확인
- 미구현/후속 범위
- 최종 git status 상태
