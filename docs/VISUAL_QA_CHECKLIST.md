# Visual QA Checklist

PEDIT는 데스크톱 Electron 앱이므로 창 크기, 패널 비율, 버튼 텍스트, 아이콘, 미리보기 영역, 인쇄/저장 액션의 시각적
안정성이 중요하다.

## Screenshot Evidence

- UI 변경 전후 screenshot 또는 명시적 브라우저/Electron 확인 증거를 남긴다.
- visual PASS는 screenshot 또는 직접 확인 증거가 있을 때만 인정한다.
- screenshot에는 민감값, 실제 파일명, 로컬 개인 경로가 보이지 않도록 한다.

## Viewport Matrix

| Viewport | Status | Evidence | Notes |
|---|---|---|---|
| Desktop | PASS/PARTIAL/FAIL/NOT_RUN |  |  |
| Tablet | PASS/PARTIAL/FAIL/NOT_RUN |  |  |
| Mobile | PASS/PARTIAL/FAIL/NOT_RUN |  |  |

Electron 전용 화면은 기본 창 크기, 최대화 상태, 최소 지원 크기를 우선 확인한다. 웹 공개 페이지가 있으면
tablet/mobile도 확인한다.

## Layout Checks

- layout overflow 확인.
- element overlap 확인.
- button/input/modal/table/card 깨짐 확인.
- panel과 container의 padding, gap, border radius 일관성 확인.
- text wrapping, ellipsis, 긴 한글 문구 잘림 확인.
- 아이콘과 텍스트 정렬 확인.

## State Checks

- hover 상태.
- focus 상태.
- disabled 상태.
- loading 상태.
- empty 상태.
- error 상태.
- success 상태.

## Typography And Color

- 글자 크기가 컨테이너 대비 과하지 않은가.
- 버튼 안 텍스트가 잘리지 않는가.
- 색상이 로고, 배경, 주요 액션과 충돌하지 않는가.
- 대비가 낮아 읽기 어려운 텍스트가 없는가.

## Accessibility

- 주요 버튼과 입력이 keyboard focus를 받을 수 있는가.
- disabled 상태가 의미 있게 구분되는가.
- 색상만으로 상태를 전달하지 않는가.
- 아이콘 버튼에 의미 있는 label 또는 tooltip이 있는가.
