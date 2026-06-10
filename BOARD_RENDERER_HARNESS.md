# Board Renderer Harness

보드판 합성 시 사진 끝부분에 원본 사진 여백이 남는 문제를 방지하기 위한 검증 하네스입니다.

## 실행

```powershell
npm run verify:board
```

이 명령은 먼저 앱을 빌드한 뒤 `scripts/verify-board-no-gap.cjs`, `scripts/verify-preview-fit.cjs`, `scripts/verify-output-settings.cjs`를 실행합니다.

## 검사 기준

- 보드 SVG가 `preserveAspectRatio="none"`을 사용해야 합니다.
- SVG `viewBox`가 최종 보드 픽셀 크기와 정확히 같아야 합니다.
- 좌상단, 우상단, 좌하단, 우하단 모든 위치에서 보드판이 사진 모서리에 정확히 붙어야 합니다.
- 보드판 사각형 전체를 픽셀 단위로 검사했을 때, 원본 사진 배경색이 1픽셀도 남으면 실패합니다.
- 여러 사진 비율과 보드 크기에서 동일하게 통과해야 합니다.
- 세로 사진 미리보기는 실제 미리보기 컨테이너 안에 `object-fit: contain` 방식으로 들어가야 하며, 이미지가 컨테이너보다 커져 잘리면 실패합니다.
- 기본/큰 미리보기 컨테이너 크기에서 세로, 극단 세로, 가로, 정사각형 사진 모두 원본 비율과 방향이 유지되어야 합니다.
- 보드 배경 투명도, 항목/내용 글자색, 빨간 원형 강조 좌표, 원 밖 흑백 마스크, 출력 리사이즈 기준이 의도대로 반영되어야 합니다.

## 실패 의미

`transparent gap leaked original photo pixels inside board area`가 나오면 보드판 내부 또는 끝부분에 원본 사진 픽셀이 새어 들어간 것입니다. 이 경우 `src/shared/boardRenderer.ts`의 SVG 크기, `viewBox`, `preserveAspectRatio`, 보드 위치 계산을 먼저 확인합니다.

`preview image exceeds container and would be cropped`가 나오면 미리보기의 표시 이미지 크기가 컨테이너보다 커져 세로 사진 일부가 잘릴 수 있다는 뜻입니다. 이 경우 `src/shared/previewFit.ts`와 `src/App.tsx`의 `PreviewStage` 계산을 먼저 확인합니다.

`highlight center should preserve color` 또는 `outside highlight should be grayscale`가 나오면 원형 강조 마스크가 출력 파이프라인과 맞지 않는 것입니다. 이 경우 `src/shared/highlightRenderer.ts`와 `electron/main.ts`의 흑백/마스크 합성 순서를 확인합니다.

## 관련 파일

- `src/shared/boardRenderer.ts`
- `src/shared/previewFit.ts`
- `src/App.tsx`
- `scripts/verify-board-no-gap.cjs`
- `scripts/verify-preview-fit.cjs`
- `scripts/verify-output-settings.cjs`
