# Security Guardrails

이 문서는 PEDIT 작업 중 민감값, 사용자 데이터, 권한 경계가 노출되거나 약화되지 않도록 하는 기준이다.

## Never Expose

- `.env`, `.env.local` 값
- 비밀번호, API key, token, service role key
- access token, refresh token
- signed URL
- 내부 storage path
- full UUID 형태의 user id, organization id, internal id
- 사용자 Desktop 전체 경로
- 실제 고객 파일명 또는 파일 내용
- image/PDF/workbook binary 또는 base64 본문

## Repository Rules

- 실제 고객 파일은 저장소에 커밋하지 않는다.
- public asset 변경은 PR scope에 명시된 경우만 허용한다.
- DB migration은 별도 위험과 rollback 고려를 기록한다.
- service role client는 클라이언트 코드에 노출하지 않는다.
- public URL 또는 getPublicUrl 사용은 필요성과 범위를 PR에 기록한다.

## No-Exposure Checklist

- secret/key/token/password 노출 없음.
- signed URL 노출 없음.
- storage path 노출 없음.
- full UUID 노출 없음.
- 사용자 파일명/내용 노출 없음.
- 로컬 개인 경로 노출 없음.
- 실제 고객 파일 커밋 없음.
- service role client가 클라이언트 코드에 노출되지 않음.
- binary/base64 blob이 문서나 PR 본문에 포함되지 않음.

## Local And Production Separation

- local-only fixture와 production 데이터를 섞지 않는다.
- QA는 synthetic fixture를 우선 사용한다.
- production key, real account, customer data는 테스트 기록에 포함하지 않는다.

## Security Agent Review

Security & Privacy Agent는 다음을 확인한다.

- 인증/인가 체크 누락 여부
- Supabase RLS 또는 Edge Function 권한 경계 약화 여부
- 로그가 과도하게 상세한지 여부
- PR 본문, docs, console output에 민감값이 포함되었는지 여부
- public URL, getPublicUrl, signed URL 사용이 적절한지 여부
