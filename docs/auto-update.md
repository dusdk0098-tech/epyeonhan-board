# 자동 업데이트 배포 가이드

이 앱은 GitHub Releases에 설치 파일을 올리고, GitHub Pages의 `latest.json`을 앱이 확인하는 방식으로 자동 업데이트를 수행합니다.

## 구조

- 앱 업데이트 확인 URL: `https://dusdk0098-tech.github.io/epyeonhan-board/updates/win/latest.json`
- 설치 파일 위치: GitHub Releases의 업데이트 브릿지 `.exe` 자산
- 앱 동작:
  - 설치된 앱 실행 후 약 2.5초 뒤 `latest.json?t={timestamp}`를 확인합니다.
  - `latest.json.version`이 현재 앱 버전보다 높으면 확인 팝업 없이 설치 파일을 자동 다운로드합니다.
  - 파일 크기와 SHA256을 검증한 뒤 업데이트 브릿지를 실행합니다.
  - 브릿지는 구버전 앱에서도 실행 가능한 비관리자 EXE이며, 내부에 포함된 실제 설치 파일을 UAC `runas`로 실행합니다.
  - 최신 앱의 런처는 현재 앱이 종료될 때까지 기다린 뒤 브릿지를 실행하고, 브릿지는 실제 silent NSIS 설치를 진행합니다.
  - 네트워크 오류나 manifest 오류는 조용히 무시합니다.
  - 다운로드, 검증, 설치 파일 실행 실패만 오류창으로 알립니다.
  - `mandatory` 값과 무관하게 현재 버전보다 높으면 자동 업데이트 대상입니다.

## latest.json 예시

```json
{
  "version": "1.0.1",
  "pub_date": "2026-06-10T00:00:00.000Z",
  "platform": "windows",
  "download_url": "https://github.com/dusdk0098-tech/epyeonhan-board/releases/download/v1.0.1/PEDIT-1.0.1-setup.exe",
  "file_name": "PEDIT-1.0.1-setup.exe",
  "sha256": "64자리 SHA256",
  "size_bytes": 12345678,
  "mandatory": false,
  "min_supported_version": "1.0.0",
  "notes": "변경 내용"
}
```

## 최초 1회 설정

현재 폴더에서 아래 명령을 실행합니다.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-update-infra.ps1
```

스크립트가 수행하는 작업:

- `gh auth status` 확인
- Git 저장소가 없으면 `git init`
- `origin`이 없으면 public GitHub 저장소 `epyeonhan-board` 생성
- GitHub Pages를 GitHub Actions 배포 방식으로 활성화 시도
- `src/shared/updateConfig.ts`의 `UPDATE_BASE_URL`을 저장소 기준으로 갱신

## 새 버전 배포

GitHub Actions에서 수동 실행:

1. GitHub 저장소의 `Actions` 탭으로 이동합니다.
2. `Release Windows` workflow를 선택합니다.
3. `Run workflow`에서 `version`, `notes`, `mandatory`, `prerelease`를 입력합니다.
4. 실행이 완료되면 Release 자산과 Pages `latest.json`이 함께 갱신됩니다.

태그로 배포:

```powershell
git tag v1.0.1
git push origin v1.0.1
```

태그 배포는 기본적으로 `mandatory=false`, `prerelease=false`로 manifest를 생성합니다.

GitHub Release와 로컬 배포 설치 파일명은 `PEDIT-{version}-setup.exe` 형식을 사용합니다. 이 파일은 업데이트 브릿지이며, 실제 관리자 권한 설치 파일은 빌드 산출물에 `PEDIT-{version}-full-setup.exe`로 함께 보관됩니다. 업데이트 manifest에는 항상 브릿지 파일의 해시와 크기를 기록합니다. 업데이트 저장소 URL과 내부 저장소명은 기존 사용자 호환을 위해 `epyeonhan-board`를 유지하지만, 설치된 앱 이름과 바로가기 이름은 `PEDIT (페딧)`으로 표시됩니다.

로컬에서 직접 설치 파일을 만들 때는 아래 명령을 사용합니다.

```powershell
npm run package:win:versioned -- 1.0.2
```

이 명령은 `package.json`의 앱 버전을 먼저 `1.0.2`로 변경한 뒤 설치 파일을 만들기 때문에, 앱 내부 버전과 배포 파일명이 함께 맞춰집니다.

- 사용자 전달용 로컬 파일명: `PEDIT-1.0.2-setup.exe`
- GitHub 업데이트 자산용 파일명: `PEDIT-1.0.2-setup.exe`
- 실제 내부 설치 파일명: `PEDIT-1.0.2-full-setup.exe`

## 기존 사용자 안내

자동 업데이트 기능이 없는 기존 설치본은 스스로 업데이트를 시작할 수 없습니다. 자동 업데이트가 포함된 설치 파일을 사용자가 한 번 수동 설치해야 하며, 그 다음 버전부터 앱 실행 시 새 버전 설치 파일이 자동으로 실행됩니다.

## 검증

로컬 검증:

```powershell
npm run verify:update
npm run verify:board
```

배포 검증:

- `https://dusdk0098-tech.github.io/epyeonhan-board/updates/win/latest.json` 접속 확인
- `download_url`이 GitHub Releases의 실제 설치 파일로 연결되는지 확인
- `sha256`과 설치 파일 해시가 일치하는지 확인
- 설치된 구버전 앱을 실행했을 때 최신 버전에서만 설치 파일 다운로드와 실행이 자동으로 진행되는지 확인

## 문제 해결

- Pages가 404이면 GitHub 저장소 `Settings > Pages`에서 Source가 `GitHub Actions`인지 확인합니다.
- 자동 업데이트가 시작되지 않으면 `package.json`의 현재 버전보다 `latest.json.version`이 높은지 확인합니다.
- 설치 실패가 뜨면 `sha256`, `size_bytes`, `download_url`이 Release 자산과 일치하는지 확인합니다.
- 내부 업데이트 창이 `업데이트 설치 준비`에서 멈춘 경우 `%TEMP%\epyeonhan-board-updates\update-launcher.log`를 확인합니다.
- 업데이트가 진행된 것처럼 보이지만 버전이 그대로면 UAC 승인 여부와 `latest.json`이 `PEDIT-{version}-setup.exe` 브릿지 파일을 가리키는지 확인합니다. `*-full-setup.exe`를 직접 manifest에 올리면 구버전 앱에서 실행되지 않을 수 있습니다.
- private 저장소는 현재 기본 구성에서 지원하지 않습니다. public Releases + public Pages를 사용하거나 별도 public 업데이트 저장소를 분리해야 합니다.
