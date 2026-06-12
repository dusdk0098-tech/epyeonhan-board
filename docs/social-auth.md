# PEDIT 소셜 로그인 설정

PEDIT은 Supabase Auth를 통해 Google 로그인을 사용한다. 앱에는 Supabase public key만 포함하고, Google Client Secret이나 Supabase Service Role Key는 포함하지 않는다.

## 왜 Google 화면에 Supabase 주소가 보이나

Google 로그인 동의 화면의 큰 제목은 앱 코드가 아니라 Google Cloud OAuth 동의 화면의 앱 이름과 Supabase Google Provider에 등록된 OAuth Client가 결정한다.

현재 `mnopxruzrpgixislomsp.supabase.co 서비스로 로그인`처럼 보인다면, Google Provider가 PEDIT 전용 OAuth 클라이언트로 설정되지 않았거나 OAuth 동의 화면 앱 이름이 Supabase 프로젝트 도메인으로 되어 있다는 뜻이다.

PEDIT으로 보이게 하려면 Google Cloud Console에서 OAuth 동의 화면의 앱 이름을 `PEDIT`으로 설정하고, 그 프로젝트에서 만든 Web OAuth Client ID/Secret을 Supabase Dashboard의 Google Provider에 등록해야 한다.

## Supabase Redirect URL

Supabase Dashboard > Authentication > URL Configuration에 아래 URL을 추가한다.

```text
pedit://auth/callback
epyeonhan-board://auth/callback
http://127.0.0.1:5180/**
http://127.0.0.1:4173/**
```

`pedit://auth/callback`이 새 기본 콜백이다. `epyeonhan-board://auth/callback`은 기존 설치와 이전 설정 호환을 위해 유지한다.

## Google Cloud 설정

Google Cloud Console > APIs & Services > OAuth consent screen에서 다음 값을 확인한다.

- App name: `PEDIT`
- User support email: 운영자 이메일
- Developer contact information: 운영자 이메일
- Authorized domains: Google이 요구하는 실제 서비스 도메인
- Privacy Policy / Terms URL: 외부 공개 URL이 있으면 등록

Google Cloud Console > APIs & Services > Credentials에서 Web application OAuth Client를 만들고 Authorized redirect URI에 아래 값을 등록한다.

```text
https://mnopxruzrpgixislomsp.supabase.co/auth/v1/callback
```

그 다음 Supabase Dashboard > Authentication > Sign In / Providers > Google에 위 Google OAuth Client ID와 Client Secret을 등록하고 Google Provider를 켠다.

## Supabase Provider 설정

Supabase Dashboard에서 Google Provider가 PEDIT 전용 Client ID/Secret을 사용해야 한다. Supabase 기본/공유 설정이나 다른 프로젝트의 OAuth Client를 사용하면 Google 동의 화면에 PEDIT 대신 Supabase 프로젝트 도메인이 표시될 수 있다.

관리자 탭에서 기존 이메일 계정에 Google 로그인을 연결하려면 Supabase Dashboard > Authentication > Security에서 Manual Linking을 켠다. 로컬 설정에는 `supabase/config.toml`의 `[auth] enable_manual_linking = true`로 기록한다.

## 동작 방식

- 로그인 화면은 Google 로그인 버튼과 이메일 로그인을 제공한다.
- 소셜 인증은 기본 브라우저에서 진행되고, 완료 후 `pedit://auth/callback`으로 앱에 돌아온다.
- 기존 `epyeonhan-board://auth/callback` 콜백도 앱에서 계속 처리한다.
- 소셜 계정에서 이메일과 이름을 가져오고, 회사명은 최초 1회 앱에서 입력한다.
- 기존 관리자 이메일 계정은 관리자 탭의 `소셜 계정 연결` 버튼으로 Google 계정을 연결할 수 있다.
