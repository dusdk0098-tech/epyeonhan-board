# 소셜 가입/로그인 설정

`PEDIT (페딧)`은 Supabase Auth를 통해 Google, Kakao, Naver 로그인을 사용한다. 앱에는 Supabase public client key만 포함하고, 각 provider의 client secret이나 service role key는 넣지 않는다.

## Supabase Redirect URL

Supabase Dashboard > Authentication > URL Configuration에 아래 값을 추가한다.

```text
epyeonhan-board://auth/callback
http://127.0.0.1:4173/**
```

Supabase callback URL은 각 provider 개발자 콘솔에 아래 형식으로 등록한다.

```text
https://mnopxruzrpgixislomsp.supabase.co/auth/v1/callback
```

## Google

Supabase Dashboard > Authentication > Providers > Google을 켠다.

Google Cloud Console OAuth Client에는 Supabase callback URL을 Authorized redirect URI로 등록한다. 필요한 기본 scope는 Supabase 기본값을 사용한다.

## Kakao

Kakao Developers에서 REST API 키와 Client Secret을 만든 뒤 Supabase Kakao provider에 입력한다.

Kakao Redirect URI에는 Supabase callback URL을 등록한다. 동의 항목에서 이메일과 닉네임/이름 제공을 활성화한다.

## Naver

Supabase에서 Custom OAuth2 Provider ID를 `naver`로 만든다. 앱 코드는 `custom:naver` provider를 호출한다.

권장 설정:

```text
Authorization URL: https://nid.naver.com/oauth2.0/authorize
Token URL: https://nid.naver.com/oauth2.0/token
User Info URL: https://mnopxruzrpgixislomsp.supabase.co/functions/v1/naver-userinfo
```

Naver 개발자 센터에서는 이메일과 이름 제공 동의를 활성화한다. Naver UserInfo 응답은 `response` 내부에 값이 들어오므로 `supabase/functions/naver-userinfo/index.ts` Edge Function이 `{ sub, email, name }` 형태로 정규화한다.

Edge Function 배포:

```powershell
supabase functions deploy naver-userinfo --project-ref mnopxruzrpgixislomsp --no-verify-jwt
```

`supabase/config.toml`에도 `naver-userinfo`의 `verify_jwt = false`를 지정했다. 이 함수는 Supabase JWT가 아니라 Naver OAuth access token을 받아야 하므로 JWT 검증을 끄는 것이 맞다.

## DB 적용

기존 DB에는 아래 증분 SQL을 Supabase SQL Editor에서 실행한다.

```text
supabase/migrations/20260610_social_auth_profile.sql
```

이 SQL은 `profiles.auth_provider`, `profiles.profile_completed_at`, `complete_current_profile()` RPC를 추가한다.

## 앱 동작

- 로그인 화면은 Google/Kakao/Naver 버튼을 우선 표시한다.
- 이메일/비밀번호는 `관리자 이메일 로그인`을 누를 때만 열린다.
- 소셜 인증은 기본 브라우저에서 진행되고, 완료 후 `epyeonhan-board://auth/callback`으로 앱에 돌아온다.
- 소셜 계정에서 이메일과 이름을 가져오고, 회사명은 최초 1회 앱에서 입력한다.
- 기존 관리자 이메일 계정은 관리자 탭의 `소셜 계정 연결` 버튼으로 Google/Kakao/Naver 계정을 연결할 수 있다.
- 초기 관리자 권한은 기존 allowlist 이메일 `hamori4919@naver.com` 기준으로 유지된다.
