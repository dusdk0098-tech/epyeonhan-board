# 자동 업데이트 배포 가이드

이 앱은 GitHub Releases에 설치 파일을 올리고, GitHub Pages의 `latest.json`을 앱이 확인하는 방식으로 자동 업데이트를 수행합니다.

## 구조

- 앱 업데이트 확인 URL: `https://dusdk0098-tech.github.io/epyeonhan-board/updates/win/latest.json`
- 설치 파일 위치: GitHub Releases의 `.exe` 자산
- 앱 동작:
  - 설치된 앱 실행 후 약 2.5초 뒤 `latest.json?t={timestamp}`를 확인합니다.
  - `latest.json.version`이 현재 앱 버전보다 높으면 확인 팝업 없이 설치 파일을 자동 다운로드합니다.
  - 파일 크기와 SHA256을 검증한 뒤 설치 파일을 바로 실행합니다.
  - 네트워크 오류나 manifest 오류는 조용히 무시합니다.
  - 다운로드, 검증, 설치 파일 실행 실패만 오류창으로 알립니다.
  - `mandatory` 값과 무관하게 현재 버전보다 높으면 자동 업데이트 대상입니다.

## latest.json 예시

```json
{
  "version": "1.0.1",
  "pub_date": "2026-06-10T00:00:00.000Z",
  "platform": "windows",
  "download_url": "https://github.com/dusdk0098-tech/epyeonhan-board/releases/download/v1.0.1/e%ED%8E%B8%ED%95%9C%EB%B3%B4%EB%93%9C-1.0.1-setup.exe",
  "file_name": "e편한보드-1.0.1-setup.exe",
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
- private 저장소는 현재 기본 구성에서 지원하지 않습니다. public Releases + public Pages를 사용하거나 별도 public 업데이트 저장소를 분리해야 합니다.
