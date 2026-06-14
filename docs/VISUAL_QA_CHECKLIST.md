# Visual QA Checklist

이 체크리스트는 기능 수정 중 UI, 레이아웃, 반응형, 사용성이 망가지지 않았는지 확인하는 기준이다.

## Viewport Matrix

| Viewport | Status | Evidence | Notes |
|---|---|---|---|
| Desktop | PASS/PARTIAL/FAIL/NOT_RUN |  |  |
| Tablet | PASS/PARTIAL/FAIL/NOT_RUN |  |  |
| Mobile | PASS/PARTIAL/FAIL/NOT_RUN |  |  |

## Layout Checks

- overflow 없음.
- 요소 겹침 없음.
- 버튼 잘림 없음.
- 입력창, 카드, 모달, 테이블, 네비게이션 위치 정상.
- 미리보기 영역이 주요 컨트롤을 가리지 않음.
- sticky/header/footer 정상.

## Interaction Checks

- hover 상태 정상.
- focus 상태 정상.
- disabled 상태 정상.
- loading 상태 정상.
- empty 상태 정상.
- error 상태 정상.
- success 상태 정상.

## Visual Consistency

- spacing 일관성.
- font size 일관성.
- color token 일관성.
- border/radius/shadow 일관성.
- icon 크기 일관성.

## Accessibility

- keyboard navigation 가능.
- focus ring 보임.
- label/aria 누락 없음.
- contrast 문제 없음.

## PASS Rule

visual PASS는 screenshot 또는 명시적 브라우저/Electron 확인 증거가 있을 때만 인정한다.

모바일 확인이 없으면 responsive 항목은 NOT_RUN으로 기록한다.
