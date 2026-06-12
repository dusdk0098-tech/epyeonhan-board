# 관리자 Edge Function 운영 메모

PEDIT 관리자 탭의 회원 삭제, 비밀번호 변경, 소셜 연동 상태 조회는 Supabase Edge Function에서만 Service Role 권한을 사용합니다.

## 필요한 Secret

Supabase 프로젝트에서 아래 secret을 설정합니다.

```powershell
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="서비스_롤_키"
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`는 Supabase Edge Function 기본 환경에서 제공되거나, 프로젝트 설정에 따라 별도 secret으로 설정할 수 있습니다.

## 배포

```powershell
npm run deploy:admin-functions
```

CLI가 로그인되어 있지 않으면 아래처럼 Supabase Personal Access Token을 환경변수로 설정한 뒤 실행합니다.

```powershell
$env:SUPABASE_ACCESS_TOKEN="Supabase_Personal_Access_Token"
npm run deploy:admin-functions
```

## 보안 규칙

- 앱에는 Service Role key를 넣지 않습니다.
- 함수는 호출자의 JWT를 확인한 뒤 `profiles.role = admin`, `status = active`인 경우만 허용합니다.
- 초기 관리자 `hamori4919@naver.com`과 현재 로그인한 관리자 본인은 삭제할 수 없습니다.
- 삭제와 비밀번호 변경은 `audit_logs`에 기록합니다.
