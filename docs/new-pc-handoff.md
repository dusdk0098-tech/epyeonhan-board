# PEDIT 프로젝트 다른 PC 이전 가이드

이 문서는 다른 PC에서 PEDIT 프로젝트 개발, 패키징, 배포를 이어가기 위한 최소 절차입니다.

## 현재 기준 정보

- GitHub 저장소: `https://github.com/dusdk0098-tech/epyeonhan-board.git`
- 기본 브랜치: `main`
- Supabase project ref: `mnopxruzrpgixislomsp`
- Supabase URL: `https://mnopxruzrpgixislomsp.supabase.co`
- Windows 설치 파일 출력 위치: `release\PEDIT-{version}-setup.exe`

`node_modules`, `dist`, `dist-electron`, `release`, `.env`는 Git에 올리지 않습니다. 새 PC에서 다시 생성합니다.

## 1. 새 PC 필수 프로그램 설치

PowerShell을 열고 아래를 실행합니다.

```powershell
winget install Git.Git
winget install GitHub.cli
winget install OpenJS.NodeJS
npm install -g supabase
```

Edge Function 타입 체크까지 하려면 Deno도 설치합니다.

```powershell
winget install DenoLand.Deno
```

설치 확인:

```powershell
git --version
node --version
npm --version
gh --version
supabase --version
deno --version
```

## 2. 프로젝트 가져오기

```powershell
git clone https://github.com/dusdk0098-tech/epyeonhan-board.git
cd epyeonhan-board
npm ci
```

GitHub 로그인:

```powershell
gh auth login
gh auth status
```

필요 권한은 `repo`, `workflow`입니다.

Supabase 로그인:

```powershell
supabase login
```

Supabase Personal Access Token은 Dashboard에서 새로 발급합니다. 토큰 형식은 `sbp_...`입니다.

## 3. 환경변수 복구

`.env`는 Git에 포함되지 않으므로 새 PC에서 직접 만듭니다.

```powershell
Copy-Item .env.example .env
```

`.env` 내용:

```env
VITE_SUPABASE_URL=https://mnopxruzrpgixislomsp.supabase.co
VITE_SUPABASE_ANON_KEY=Supabase_publishable_or_anon_key
```

주의:

- 앱에는 public publishable/anon key만 넣습니다.
- `SUPABASE_SERVICE_ROLE_KEY`는 로컬 `.env`에 넣지 않습니다.
- Service Role key는 Supabase Edge Function secret으로만 관리합니다.

Secret 확인:

```powershell
supabase secrets list --project-ref mnopxruzrpgixislomsp
```

`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`가 있어야 관리자 Edge Function이 동작합니다.

## 4. 로컬 개발

```powershell
npm run dev
```

빌드만 확인:

```powershell
npm run build
```

## 5. 검증 명령

일반 검증:

```powershell
npm run verify:ui
npm run verify:auth
npm run verify:update
npm run verify:board
```

Edge Function 배포 전 타입 확인:

```powershell
deno check supabase/functions/admin-users/index.ts supabase/functions/admin-delete-user/index.ts supabase/functions/admin-set-password/index.ts
```

DB 상태 확인:

```powershell
supabase db query --linked -o json "select (select count(*) from auth.users) as auth_users, (select count(*) from public.profiles) as profiles, (select count(*) from public.subscriptions) as subscriptions, (select count(*) from public.profiles where role='admin' and status='active') as active_admins;"
```

## 6. 패키징

```powershell
npm run package:win:installer
```

생성 파일:

```text
release\PEDIT-{version}-setup.exe
release\PEDIT-{version}-full-setup.exe
```

자동 업데이트 manifest에는 `PEDIT-{version}-setup.exe` 브릿지 설치 파일만 올라가야 합니다.

## 7. Supabase Edge Function 배포

관리자 기능 함수 변경 시:

```powershell
npm run deploy:admin-functions
supabase functions list --project-ref mnopxruzrpgixislomsp --output json
```

배포 후 `admin-users`, `admin-delete-user`, `admin-set-password`가 `ACTIVE`인지 확인합니다.

## 8. 버전업 및 자동 업데이트 배포

사용자가 “업데이트해줘”라고 요청한 경우에만 수행합니다.

1. `package.json`, `package-lock.json` 버전 변경
2. 검증 실행
3. 패키징 실행
4. 커밋 및 푸시
5. GitHub Actions `Release Windows` 실행
6. `latest.json` 확인

수동 workflow 실행 예:

```powershell
gh workflow run release-windows.yml --ref main -f version=1.0.23 -f mandatory=false -f prerelease=false -f notes="변경 내용 요약"
gh run list --workflow release-windows.yml --limit 3
```

배포 확인:

```powershell
gh release view v1.0.23 --json tagName,name,isPrerelease,assets,url
Invoke-WebRequest -Uri "https://dusdk0098-tech.github.io/epyeonhan-board/updates/win/latest.json?check=$(Get-Random)" -UseBasicParsing | Select-Object -ExpandProperty Content
```

`latest.json`의 `download_url`은 반드시 `PEDIT-{version}-setup.exe`를 가리켜야 합니다.

## 9. 휴가 전 체크리스트

현재 PC에서:

```powershell
git status --short
git branch --show-current
git remote -v
gh auth status
supabase functions list --project-ref mnopxruzrpgixislomsp --output json
```

확인할 것:

- `git status --short`가 비어 있음
- 최신 커밋이 GitHub `main`에 push됨
- `.env`의 Supabase URL/key를 안전한 곳에 별도 보관
- 새 PC에서 GitHub와 Supabase 로그인 가능
- Service Role key를 앱 코드, 문서, 채팅에 복사하지 않음

## 10. 자주 발생하는 문제

### `Supabase_Personal_Access_Token` 오류

`supabase login --token "Supabase_Personal_Access_Token"`처럼 문구 그대로 입력하면 실패합니다. 실제 토큰은 `sbp_...` 형식입니다.

### 관리자 탭에 회원이 0명으로 보임

확인 순서:

```powershell
supabase db query --linked -o json "select (select count(*) from auth.users) as auth_users, (select count(*) from public.profiles) as profiles, (select count(*) from public.subscriptions) as subscriptions, (select count(*) from public.profiles where role='admin' and status='active') as active_admins;"
npm run deploy:admin-functions
```

그래도 실패하면 앱이 최신 버전인지 확인합니다.

### 자동 업데이트가 반복됨

확인 순서:

```powershell
npm run verify:update
Invoke-WebRequest -Uri "https://dusdk0098-tech.github.io/epyeonhan-board/updates/win/latest.json?check=$(Get-Random)" -UseBasicParsing | Select-Object -ExpandProperty Content
```

`latest.json`이 `full-setup.exe`가 아닌 브릿지 파일 `PEDIT-{version}-setup.exe`를 가리켜야 합니다.
