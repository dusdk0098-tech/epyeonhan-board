# Next Prompt Generation

이 문서는 Main Aggregated Review를 GPT5.5PRO에 전달해 다음 Codex 작업 지시문을 만드는 기준이다.

## Required Inputs

- Original Task
- Evidence Bundle
- Subagent Reports
- Main Aggregated Review

## Decision Branches

- S0/S1 이슈가 있으면 새 기능 개발 금지, fix-only 또는 stabilization으로 작성한다.
- 핵심 검증 NOT_RUN이 있으면 QA-only 또는 보수적 stabilization으로 작성한다.
- S0/S1 없고 핵심 검증이 충분하면 feature continuation을 허용한다.
- 배포 준비 단계면 release readiness로 작성한다.

## Direct Codex Prompt Must Include

- 작업 목적.
- 작업 성격.
- 새 브랜치명.
- 허용 변경 범위.
- 금지 변경 범위.
- package 변경 가능 여부.
- DB migration 가능 여부.
- design 변경 가능 여부.
- public asset 변경 가능 여부.
- 구현 전 확인 파일.
- 필수 수정/구현 항목.
- 검증 명령.
- 디자인 회귀 검증.
- 기능 회귀 검증.
- 보안/no-exposure 검증.
- scope check.
- cleanup.
- commit/push/PR.
- 작업 후 보고 형식.

## GPT5.5PRO Paste Template

```md
아래는 Codex 구현 결과와 다중 서브에이전트 검증 결과를 메인 에이전트가 취합한 내용입니다.

목표:
이 내용을 바탕으로 다음 Codex 작업 지시문을 작성해 주세요.

중요:
- S0/S1 이슈가 있으면 새 기능 개발 금지
- fix-only 또는 stabilization PR 지시문으로 작성
- S0/S1이 없더라도 NOT_RUN이 핵심 검증에 있으면 추가 QA 또는 보수적 수정 지시문으로 작성
- 허용 변경 범위와 금지 변경 범위를 명확히 분리
- package 변경 가능 여부 명시
- DB migration 가능 여부 명시
- design 변경 가능 여부 명시
- public asset 변경 가능 여부 명시
- 검증 명령과 NOT_RUN 기록 원칙 포함
- 디자인 회귀 검증 항목 포함
- 기능 회귀 검증 항목 포함
- 보안/no-exposure 검증 항목 포함
- Codex가 사용자에게 shell 명령 실행을 시키지 않고 직접 수행하도록 작성
- 민감값, token, key, signed URL, storage path, full UUID, 사용자 파일명, 로컬 전체 경로 출력 금지

입력:

## Original Task
[원래 작업 지시문]

## Evidence Bundle
[Codex 작업 결과]

## Subagent Reports
[서브에이전트 검증 결과들]

## Main Aggregated Review
[메인 취합 결과]

## Required Output
다음 Codex 작업 지시문을 아래 형식으로 작성해 주세요.

1. 이번 라운드 목적
2. 작업 성격
   - fix-only / stabilization / QA-only / feature continuation / release readiness
3. 새 브랜치명
4. 허용 변경 범위
5. 금지 변경 범위
6. 필수 수정 또는 구현 항목
7. 구현 전 확인할 파일
8. 수정 후 검증 명령
9. 디자인 회귀 검증 항목
10. 기능 회귀 검증 항목
11. 보안/no-exposure 검증 항목
12. scope check
13. cleanup
14. commit/push/PR 생성 지시
15. PR 본문 템플릿
16. 작업 후 보고 형식
```

## Evidence Bundle Template

```md
# Evidence Bundle

## Project

- Project name:
- Base branch:
- Working branch:
- PR URL:
- Phase:
- Task type:
  - feature / fix / refactor / docs-only QA / security review / release readiness

## Original Request

[이번 작업의 원래 지시문]

## Intended Scope

- 허용된 변경:
- 금지된 변경:
- DB migration:
  - allowed / forbidden / none
- package change:
  - allowed / forbidden / none
- design change:
  - allowed / forbidden / minimal
- public asset change:
  - allowed / forbidden / none

## Changed Files

[수정 파일 목록]

## Diff Summary

[파일별 변경 요약. 민감값, full path, token, secret 출력 금지]

## Implementation Summary

- 구현한 것:
- 구현하지 않은 것:
- 의도적으로 제외한 것:
- 임시 처리한 것:

## Verification Results

- git diff --check:
  - PASS / FAIL / NOT_RUN
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

## Screenshots / Visual Evidence

- Before:
- After:
- Viewports checked:
  - desktop
  - tablet
  - mobile

## Known Issues

- Issue 1:
- Issue 2:

## Developer Self-Assessment

- Overall:
  - PASS / PARTIAL / FAIL / NOT_RUN
- Reason:
```
