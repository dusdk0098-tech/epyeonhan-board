# Release Readiness

이 문서는 PEDIT 릴리스 전 내부 QA, 파일 패키징, Supabase 연동, 사용자 안내 자료, 배포 위험을 확인하기 위한
기준이다.

## Internal QA Readiness

- LITE 주요 플로우 확인: 사진 불러오기, 보드 설정, 저장 경로, 미리보기, 선택/전체 작업.
- PRO 주요 플로우 확인: 사진 목록, 사진대지 설정, 미리보기, PDF 생성.
- 통합 설정 확인: 출력 품질, 작업 후 동작, 기본값 유지.
- 관리자 기능 확인: 사용자 조회, 권한, 비밀번호 관리, 구독/기기 관련 동작.
- 업데이트 확인: 새 버전 감지, 설치 안내, 재실행 흐름.

## Pilot Readiness

- known issue와 우회 방법이 정리되어 있다.
- 사용자에게 제공할 설치 파일, 사용 설명서, FAQ가 준비되어 있다.
- 실제 사용자 파일 대신 synthetic fixture로 주요 기능을 검증했다.
- S0/S1이 없고, S2는 배포 전 해결 또는 명시적 승인 상태다.

## Production Readiness

- build와 packaging이 성공했다.
- installer, blockmap, update metadata가 버전과 일치한다.
- Supabase migration과 Edge Function 배포 상태가 확인되었다.
- public site 또는 다운로드 페이지가 올바른 설치 파일을 가리킨다.
- rollback 또는 이전 설치 파일 복구 방법이 준비되어 있다.

## Security, Permission, Data, Backup, Recovery, Monitoring

- 보안: 민감값과 사용자 파일이 노출되지 않는다.
- 권한: 관리자 기능과 서버 작업은 권한 검사를 통과해야 한다.
- 데이터: DB migration은 기존 데이터 호환성과 rollback 가능성을 검토한다.
- 백업/복구: migration 또는 production 변경 전 복구 계획을 기록한다.
- 모니터링: 배포 후 오류, 다운로드, 업데이트 실패, Supabase function 오류를 확인한다.

## User Materials

- 공개 배포용 사용 설명서.
- 설치 파일 안내.
- 업데이트 안내.
- 로그인/권한 문제 FAQ.
- 관리자 문의 경로.

## Known PARTIAL/NOT_RUN Handling

- PARTIAL은 남은 위험과 배포 영향도를 기록한다.
- NOT_RUN은 이유와 필요한 검증을 기록한다.
- 핵심 플로우의 NOT_RUN은 release decision을 Conditional 또는 Not Ready로 낮춘다.

## Release Risk Decision

- `Ready`: S0/S1 없음, 핵심 검증 PASS, 남은 S2가 없거나 승인됨.
- `Conditional`: S0/S1 없음, 일부 S2/PARTIAL/NOT_RUN이 있으나 우회 또는 제한 배포 가능.
- `Not Ready`: S0/S1 존재, build/package 실패, 보안 노출, 데이터 손실 가능성, 핵심 플로우 실패.

## Final Report Criteria

릴리스 최종 보고에는 다음을 포함한다.

- 버전
- 변경 요약
- packaging 산출물
- 검증 결과
- known issue
- migration/function 변경 여부
- public asset/CI 변경 여부
- rollback 계획
- release risk decision
