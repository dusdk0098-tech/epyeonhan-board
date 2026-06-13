# Security Guardrails

PEDIT는 Electron 앱, Supabase 연동, 로컬 파일 처리, 관리자 기능을 포함하므로 민감값 노출과 권한 경계가 특히 중요하다.


## Never Expose

다음 값은 터미널 출력, 로그, 문서, PR 본문, 스크린샷, 테스트 fixture, 커밋에 포함하지 않는다.

- `.env`, `.env.local` 값
- API key, token, access token, refresh token
- password, service role key
- signed URL
- storage path
- user id, organization id, internal id full UUID
- 사용자 파일명, 실제 고객 파일명, 실제 고객 파일 내용
- 로컬 개인 경로
- image/PDF/workbook binary 또는 base64


## Repository File Rules

- 실제 사용자 파일, 고객 파일, 원본 이미지, PDF, XLSX, JSON을 저장소에 복사하거나 커밋하지 않는다.
- 테스트가 필요하면 synthetic fixture를 생성하고, 테스트 후 삭제하거나 명확한 fixture 디렉터리에 최소 데이터만 둔다.
- `.env.example`은 구조와 변수명만 담고 실제 값을 담지 않는다.
- Supabase `.temp` 또는 로컬 연결 상태 파일은 값 노출 위험이 있으므로 커밋하지 않는다.


## Supabase And Public URL Rules

- `getPublicUrl` 또는 공개 URL 사용은 꼭 필요한 범위와 이유를 문서화한다.
- private bucket, signed URL, user-specific storage path를 로그나 문서에 남기지 않는다.
- service role client는 서버 측 또는 Edge Function의 제한된 관리자 작업에만 둔다.
- 클라이언트 코드에 service role key, 관리자 권한 client, 민감 환경값을 노출하지 않는다.


## Auth And Authorization Principles

- 로그인 여부와 사용자 권한을 별도로 검증한다.
- 관리자 기능은 클라이언트 UI 숨김만으로 보호하지 않고 서버 측 권한 검사를 포함해야 한다.
- Supabase Row Level Security와 Edge Function 권한 경계를 함께 검토한다.
- 사용자 A/B 데이터, 다른 계정 데이터, 조직 데이터가 섞이지 않는지 확인한다.


## Local-Only Versus Production

- local-only 테스트와 production 작업을 분리한다.
- 배포, migration, Edge Function 배포는 대상 프로젝트와 권한을 확인한 뒤 실행한다.
- production에서 재현이 필요한 경우에도 민감값과 실제 사용자 파일은 출력하지 않는다.


## No-Exposure Checklist

- `.env` 값 노출 없음.
- key/token/password 노출 없음.
- signed URL 노출 없음.
- storage path 노출 없음.
- full UUID 노출 없음.
- 사용자 파일명/내용 노출 없음.
- 로컬 개인 경로 노출 없음.
- 실제 고객 파일 커밋 없음.
- service role client가 클라이언트 코드에 노출되지 않음.
- public URL/getPublicUrl 사용이 필요한 경우 이유와 범위 기록.


## Security & Privacy Agent Criteria

Security & Privacy Agent는 다음을 검증한다.

- 민감값 또는 사용자 데이터가 diff, 로그, 문서, PR에 노출되지 않았는가.
- 인증/인가 검사가 누락되지 않았는가.
- service role과 public URL 사용 범위가 적절한가.
- Supabase RLS, Edge Function, 관리자 기능의 권한 경계가 약해지지 않았는가.
- no-exposure checklist를 증거 기반으로 판정했는가.
