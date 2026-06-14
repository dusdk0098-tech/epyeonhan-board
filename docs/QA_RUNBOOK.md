# QA Runbook

이 문서는 PEDIT 작업 후 Evidence Bundle에 기록할 검증 명령과 판정 기준을 정의한다.

## Command Discovery

- `package.json`의 `scripts`를 먼저 확인한다.
- `lint`, `typecheck`, `test` script가 있으면 실행한다.
- 해당 script가 없으면 `NOT_RUN with reason`으로 기록한다.
- PEDIT는 `build`, `verify:ui`, `verify:board`, `verify:update`, `verify:auth` 등의 검증 script를 제공할 수 있다.
- DB/migration 확인은 안전한 local-only 파일 목록 또는 dry-run 성격의 확인만 수행한다.

## Execution Principles

- `git diff --check`는 기본으로 실행한다.
- TypeScript 확인은 별도 `typecheck` script가 없으면 `npm run build` 결과로 대체할 수 있다.
- UI나 화면 레이아웃 변경이 있으면 Electron 또는 browser QA 증거를 남긴다.
- docs-only PR은 제품 앱 실행이 필수는 아니지만 scope check와 no-exposure check를 반드시 수행한다.
- 실행하지 않은 검증을 PASS로 적지 않는다.

## Fixtures And Files

- 실제 사용자 파일을 사용하지 않는다.
- 이미지, PDF, XLSX가 필요한 경우 synthetic fixture를 사용한다.
- 임시 파일, 캡처, review artifact는 작업 후 삭제한다.
- 저장소에 포함할 fixture는 최소 크기, 가짜 데이터, 명확한 목적을 가져야 한다.

## Verification Result Format

```md
- git diff --check:
  - PASS / FAIL / NOT_RUN
  - command:
  - evidence:
- lint:
  - PASS / FAIL / NOT_RUN
  - command:
  - evidence:
- typecheck:
  - PASS / FAIL / NOT_RUN
  - command:
  - evidence:
- tests:
  - PASS / FAIL / NOT_RUN
  - command:
  - evidence:
- build:
  - PASS / FAIL / NOT_RUN
  - command:
  - evidence:
- browser QA:
  - PASS / PARTIAL / FAIL / NOT_RUN
  - tested routes:
  - evidence:
- migration check:
  - PASS / FAIL / NOT_RUN
  - evidence:
- no-exposure check:
  - PASS / FAIL / NOT_RUN
  - evidence:
```

## Browser QA Conditions

Browser 또는 Electron QA는 다음 조건에서 수행한다.

- UI, CSS, layout, modal, interaction이 바뀐 경우.
- LITE/PRO/Admin/통합 설정 주요 플로우가 바뀐 경우.
- 화면 크기, 버튼, 입력, 미리보기, 인쇄, 다운로드 동작이 바뀐 경우.
- visual PASS를 주장하려면 screenshot 또는 명시적 브라우저 확인 증거가 필요하다.

## Evidence Bundle Minimum

서브에이전트에게 전달할 최소 증거는 다음이다.

- 원래 요청
- 허용/금지 범위
- 변경 파일 목록
- diff 요약
- 실행한 검증 명령과 결과
- NOT_RUN 이유
- UI 변경 시 before/after 또는 확인한 화면 상태
- migration/package/public asset/CI 변경 여부
- no-exposure check 결과

## Docs-Only QA PR

- 변경 파일이 의도한 문서 범위에만 있는지 확인한다.
- 제품 코드, package, lockfile, public asset, DB migration, CI, scripts/tool 변경이 없는지 확인한다.
- 문서에 민감값, 실제 사용자 파일명, 로컬 개인 경로가 없는지 확인한다.
- 문서 내용이 기존 프로젝트 구조와 맞는지 확인한다.
