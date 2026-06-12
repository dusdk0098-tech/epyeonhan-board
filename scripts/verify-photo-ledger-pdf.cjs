const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const {
  createPhotoLedgerPdf,
  resolvePhotoLedgerInfo
} = require('../dist-electron/electron/photoLedgerPdf.js');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const baseSettings = {
  showBoard: true,
  boardLayoutMode: 'table',
  bottomStripShowLabels: true,
  position: 'bottom-right',
  widthRatio: 0.675,
  margin: 0,
  boardSize: 135,
  labelColumnWidthRatio: 0.176,
  valueColumnWidthRatio: 0.499,
  fontFamily: 'Malgun Gothic Semilight',
  fontSize: 16,
  itemAlign: 'center',
  contentAlign: 'left',
  fontWeight: 'bold',
  rowHeight: 70,
  borderWeight: 'bold',
  borderColor: 'black',
  jpgQuality: 92,
  boardBackgroundOpacity: 100,
  labelTextColor: 'black',
  valueTextColor: 'black',
  outputMaxLongEdge: 0,
  outputGrayscale: false,
  openFolderAfterProcessing: false,
  createPdf: true,
  pdfTitle: '사진대지',
  photoLedgerUseBoardFields: true,
  photoLedgerUsePhotoDate: false,
  photoLedgerLocation: '',
  photoLedgerContent: '',
  photoLedgerDate: ''
};

const fields = [
  { id: '1', label: '공사명', value: '154kV 북평택변전소 토건공사' },
  { id: '2', label: '공종', value: '직영' },
  { id: '3', label: '위치', value: '변전소 내' },
  { id: '4', label: '내용', value: '장비 점검' },
  { id: '5', label: '날짜', value: '2026.06.11' },
  { id: '6', label: '촬영시간', value: '10:30' }
];

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'epyeonhan-ledger-'));
  const imagePaths = [];
  const imageBuffers = [];

  for (let index = 0; index < 3; index += 1) {
    const imagePath = path.join(tmpDir, `board-${index + 1}.jpg`);
    const imageBuffer = await sharp({
      create: {
        width: 960,
        height: 540,
        channels: 3,
        background: index % 2 === 0 ? '#dbeafe' : '#dcfce7'
      }
    })
      .jpeg({ quality: 90 })
      .toBuffer();
    fs.writeFileSync(imagePath, imageBuffer);
    imagePaths.push(imagePath);
    imageBuffers.push(imageBuffer);
  }

  const pdfPath = path.join(tmpDir, 'ledger.pdf');
  await createPhotoLedgerPdf(
    imagePaths.map((imagePath) => ({ imagePath, fields })),
    pdfPath,
    '사진대지',
    baseSettings
  );

  const bytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(bytes);
  assert(pdfDoc.getPageCount() === 2, `3 images must create 2 ledger pages, got ${pdfDoc.getPageCount()}`);

  const firstPage = pdfDoc.getPage(0);
  assert(Math.round(firstPage.getWidth()) === 595, `A4 page width mismatch: ${firstPage.getWidth()}`);
  assert(Math.round(firstPage.getHeight()) === 842, `A4 page height mismatch: ${firstPage.getHeight()}`);

  const bufferPdfPath = path.join(tmpDir, 'ledger-buffer.pdf');
  await createPhotoLedgerPdf(
    imageBuffers.map((imageBuffer) => ({ imageBuffer, fields })),
    bufferPdfPath,
    '사진대지',
    baseSettings
  );
  const bufferPdfDoc = await PDFDocument.load(fs.readFileSync(bufferPdfPath));
  assert(bufferPdfDoc.getPageCount() === 2, `in-memory ledger images must create 2 pages, got ${bufferPdfDoc.getPageCount()}`);

  const autoInfo = resolvePhotoLedgerInfo(fields, baseSettings);
  assert(autoInfo.location === '변전소 내', 'ledger auto location mapping failed');
  assert(autoInfo.content === '장비 점검', 'ledger auto content mapping failed');
  assert(autoInfo.date === '2026.06.11', 'ledger auto date mapping failed');

  const manualInfo = resolvePhotoLedgerInfo(fields, {
    ...baseSettings,
    photoLedgerUseBoardFields: false,
    photoLedgerLocation: '수동 위치',
    photoLedgerContent: '수동 내용',
    photoLedgerDate: '2026.06.12'
  });
  assert(manualInfo.location === '수동 위치', 'ledger manual location mapping failed');
  assert(manualInfo.content === '수동 내용', 'ledger manual content mapping failed');
  assert(manualInfo.date === '2026.06.12', 'ledger manual date mapping failed');

  const perPhotoInfo = resolvePhotoLedgerInfo(
    fields,
    {
      ...baseSettings,
      photoLedgerUseBoardFields: false,
      photoLedgerLocation: '공통 위치',
      photoLedgerContent: '공통 내용',
      photoLedgerDate: '2026.06.13'
    },
    {
      location: '사진별 위치',
      content: '사진별 내용',
      date: '2026.06.14'
    }
  );
  assert(perPhotoInfo.location === '사진별 위치', 'per-photo ledger location must override shared manual value');
  assert(perPhotoInfo.content === '사진별 내용', 'per-photo ledger content must override shared manual value');
  assert(perPhotoInfo.date === '2026.06.14', 'per-photo ledger date must override shared manual value');

  const photoDatePriorityInfo = resolvePhotoLedgerInfo(
    fields,
    {
      ...baseSettings,
      photoLedgerUseBoardFields: true,
      photoLedgerUsePhotoDate: true
    },
    {
      location: '',
      content: '',
      date: '2026.06.15'
    }
  );
  assert(photoDatePriorityInfo.location === '변전소 내', 'photo-date option must keep board-field location mapping');
  assert(photoDatePriorityInfo.content === '장비 점검', 'photo-date option must keep board-field content mapping');
  assert(photoDatePriorityInfo.date === '2026.06.15', 'photo-date option must override board-field date when present');

  const app = fs.readFileSync(path.join(__dirname, '..', 'src', 'App.tsx'), 'utf8');
  const mainSource = fs.readFileSync(path.join(__dirname, '..', 'electron', 'main.ts'), 'utf8');
  const sharedTypes = fs.readFileSync(path.join(__dirname, '..', 'src', 'shared', 'types.ts'), 'utf8');
  assert(app.includes('사진대지 문서 설정'), 'premium settings must expose photo ledger document settings');
  assert(app.includes('보드판 입력값 자동 적용'), 'photo ledger board-field sync option missing');
  assert(app.includes('사진정보 촬영일자 사용') && sharedTypes.includes('photoLedgerUsePhotoDate'), 'photo ledger photo-date option missing');
  assert(app.includes('사진대지 미리보기') && app.includes('PhotoLedgerPreviewPage'), 'photo ledger preview modal missing');
  assert(app.includes('PHOTO_LEDGER_LAYOUT') && app.includes('resolvePhotoLedgerInfo'), 'photo ledger preview must use the shared ledger layout/resolver');
  assert(app.includes('selectedPhotoLedger') && app.includes('updateSelectedPhotoLedgerPatch'), 'photo ledger inputs must edit the selected photo');
  assert(app.includes('사진별 하단정보와 출력 순서를 지정해 PDF에 반영합니다.'), 'photo ledger UI must explain per-photo output');
  assert(app.includes('moveSelectedPhotoOrder') && app.includes('출력 순서'), 'photo ledger UI must support per-photo output order');
  assert(app.includes('보드 내용 불러오기') && app.includes('체크 사진에 적용'), 'photo ledger per-photo helper actions are missing');
  assert(sharedTypes.includes('interface PhotoLedgerInfo') && sharedTypes.includes('photoLedger?: PhotoLedgerInfo'), 'photo ledger info must be stored per photo');
  assert(app.includes("activeOutputSettingsTab === 'ledger'"), 'photo ledger settings must be a premium tab');
  assert(app.includes('사진대지 만들기'), 'premium tab must expose a photo ledger creation button');
  assert(!app.includes('commonOutputSettings.createPdf'), 'photo ledger PDF toggle must not be in common settings');
  assert(mainSource.includes('createPhotoLedgerPdf'), 'image processing must use the photo ledger PDF renderer');
  assert(mainSource.includes('resolvePhotoLedgerForPdf'), 'PDF entries must resolve per-photo ledger info and photo date');
  assert(/if \(createPhotoLedgerPdfOnly\) \{\s+const imageBuffer = await renderBoardCompositeBuffer\(photo, fields, payload\.settings\);\s+pdfEntries\.push\(\{ imageBuffer, fields, photoLedger \}\);\s+\} else \{/.test(mainSource), 'photo ledger PDF mode must feed in-memory images without saving JPG files first');
  assert(/else \{\s+const outputPath = await nextAvailablePath[\s\S]+await renderBoardImage\(photo, outputPath, fields, payload\.settings\);[\s\S]+savedFiles\.push\(outputPath\);/.test(mainSource), 'normal board image processing must still save JPG files');
  assert(!mainSource.includes('async function createPdf('), 'old image-per-page PDF generator must be removed');
  assert(!app.includes('이미지 1장/페이지'), 'image-per-page PDF option must not be rendered');

  console.log(JSON.stringify({ ok: true, checked: 15, pdfPath }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
