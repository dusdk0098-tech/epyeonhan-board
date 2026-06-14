# Release Readiness

이 문서는 PEDIT 출시 전 internal QA, pilot, production readiness를 판단하는 기준이다.

## Internal QA Readiness

- 주요 LITE/PRO 플로우가 PASS 상태이다.
- 자동 검증과 manual smoke QA가 완료되었다.
- S0/S1 이슈가 없다.
- 핵심 NOT_RUN 항목이 남아 있으면 release readiness를 Ready로 표시하지 않는다.

## Pilot Readiness

- known issue와 제한 사항이 문서화되어 있다.
- 사용자 제공 자료, 설치 안내, 업데이트 안내가 준비되어 있다.
- rollback 또는 이전 버전 복구 방법이 확인되어 있다.
- synthetic fixture가 아닌 실제 사용자 파일이 필요한 경우 별도 승인과 보안 검토가 있다.

## Production Readiness

- 보안/권한/데이터 경계 검증이 완료되었다.
- DB migration 또는 배포 순서가 있다면 rollback 조건을 기록했다.
- installer, update metadata, public asset이 의도한 버전과 일치한다.
- post-release monitoring 또는 사용자 확인 항목이 정리되어 있다.

## Release Risk Decision

- `Ready`: S0/S1 없음, 핵심 검증 PASS, known issue 관리 가능.
- `Conditional`: S0/S1은 없지만 S2 또는 PARTIAL/NOT_RUN 항목이 있어 제한 조건이 필요함.
- `Not Ready`: S0/S1, 보안 노출, 빌드 실패, 핵심 플로우 회귀가 있음.

## Final Report Must Include

- milestone executive summary
- 완료된 기능 목록
- 검증 결과 matrix
- 남은 PARTIAL/NOT_RUN 항목
- 보안/no-exposure 결과
- 사용자에게 필요한 첨부자료
- release readiness 상태
- 후속 roadmap
