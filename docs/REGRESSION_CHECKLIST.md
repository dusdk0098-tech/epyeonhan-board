# Functional Regression Checklist

이 체크리스트는 PEDIT 기능 변경 후 기존 플로우가 깨지지 않았는지 확인하는 기준이다.

## Core Areas

- 로그인과 세션 유지.
- LITE 사진 보드판 작업.
- PRO 사진대지 PDF 작업.
- 통합 설정 저장과 적용.
- 관리자 사용자/권한/구독/기기/비밀번호 관리.
- 자동 업데이트와 설치 파일 흐름.
- Supabase Edge Function과 DB migration 호환성.

## Happy Path

- 사용자가 정상 로그인한다.
- 사진 또는 폴더를 불러온다.
- 보드 내용을 입력하거나 불러온다.
- 미리보기에서 결과를 확인한다.
- 결과 이미지 또는 PDF를 생성한다.
- 작업 후 결과 폴더 또는 저장 위치를 확인한다.

## Edge Cases

- 빈 값.
- 잘못된 입력.
- 너무 긴 입력.
- 중복 클릭.
- 빠른 연속 클릭.
- 새로고침.
- 뒤로가기.
- 세션 만료.
- 권한 없음.
- 네트워크 실패.
- 서버 오류.
- 파일 선택 취소.
- 저장 경로 미지정.
- 이미지 로딩 실패.

## Compatibility

- 기존 데이터 호환성.
- 기존 API/route 호환성.
- 사용자 A/B 데이터 분리.
- Supabase RLS와 Edge Function 계약 유지.
- Electron main/preload/renderer IPC 계약 유지.

## Functional Regression Verdict

```md
## Functional Regression Verdict
- Overall:
  - PASS / PARTIAL / FAIL / NOT_RUN
- Evidence:
- Missing evidence:
- Required fix:
- Follow-up:
```

## PASS Rule

기능 PASS는 실제 명령, 테스트, 브라우저/Electron 확인, 또는 코드 증거가
있을 때만 인정한다. 증거가 부족하면 PARTIAL 또는 NOT_RUN으로 기록한다.
