# 로그인/구독 준비 설정 가이드

## Supabase 프로젝트 설정

1. Supabase 프로젝트를 생성합니다.
2. SQL Editor에서 `supabase/migrations/20260610_auth_subscriptions.sql` 내용을 실행합니다.
3. Project Settings > API에서 Project URL과 anon public key를 확인합니다.
4. 프로젝트 루트에 `.env`를 만들고 `.env.example` 형식으로 값을 입력합니다.

```powershell
Copy-Item .env.example .env
```

## 초기 관리자

- 초기 관리자 이메일은 `hamori4919@naver.com`입니다.
- 이 이메일로 앱에서 회원가입하면 `profiles.role`이 자동으로 `admin`이 됩니다.
- 추가 관리자는 관리자 탭에서 해당 사용자의 role을 `admin`으로 변경합니다.
- 일반 사용자에게는 관리자 탭이 보이지 않으며, RLS 정책으로 관리자 데이터 접근도 차단됩니다.

## 기본 정책

- 미로그인 사용자는 앱 전체를 사용할 수 없습니다.
- 신규 가입자는 기본 14일 `trial` 구독으로 생성됩니다.
- 관리자 탭에서 구독 상태와 만료일을 수동으로 조정할 수 있습니다.
- 사용자별 활성 기기는 1대로 제한됩니다.
- 기존 PC를 해제해야 다른 PC에서 같은 계정으로 사용할 수 있습니다.

## 추후 Stripe 연동 지점

- `subscriptions.stripe_customer_id`
- `subscriptions.stripe_subscription_id`
- `subscriptions.status`
- `subscriptions.current_period_end`

Stripe Checkout/webhook 연동 시 위 필드만 갱신하면 앱 권한 판단은 그대로 사용할 수 있습니다.
