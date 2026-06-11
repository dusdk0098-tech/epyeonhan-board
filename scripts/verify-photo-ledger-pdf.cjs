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
  boardLayoutMode: 'table',
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

  for (let index = 0; index < 3; index += 1) {
    const imagePath = path.join(tmpDir, `board-${index + 1}.jpg`);
    await sharp({
      create: {
        width: 960,
        height: 540,
        channels: 3,
        background: index % 2 === 0 ? '#dbeafe' : '#dcfce7'
      }
    })
      .jpeg({ quality: 90 })
      .toFile(imagePath);
    imagePaths.push(imagePath);
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

  const app = fs.readFileSync(path.join(__dirname, '..', 'src', 'App.tsx'), 'utf8');
  const mainSource = fs.readFileSync(path.join(__dirname, '..', 'electron', 'main.ts'), 'utf8');
  const sharedTypes = fs.readFileSync(path.join(__dirname, '..', 'src', 'shared', 'types.ts'), 'utf8');
  assert(app.includes('사진대지 PDF 설정'), 'premium settings must expose photo ledger PDF settings');
  assert(app.includes('보드판 내용과 동일하게 적용'), 'photo ledger board-field sync option missing');
  assert(app.includes('selectedPhotoLedger') && app.includes('updateSelectedPhotoLedgerPatch'), 'photo ledger inputs must edit the selected photo');
  assert(app.includes('사진별로 다르게 출력됩니다'), 'photo ledger UI must explain per-photo output');
  assert(app.includes('moveSelectedPhotoOrder') && app.includes('출력 순서'), 'photo ledger UI must support per-photo output order');
  assert(app.includes('보드판 내용 불러오기') && app.includes('체크 사진에 적용'), 'photo ledger per-photo helper actions are missing');
  assert(sharedTypes.includes('interface PhotoLedgerInfo') && sharedTypes.includes('photoLedger?: PhotoLedgerInfo'), 'photo ledger info must be stored per photo');
  assert(app.includes("activeOutputSettingsTab === 'ledger'"), 'photo ledger settings must be a premium tab');
  assert(app.includes('사진대지 만들기'), 'premium tab must expose a photo ledger creation button');
  assert(!app.includes('commonOutputSettings.createPdf'), 'photo ledger PDF toggle must not be in common settings');
  assert(mainSource.includes('createPhotoLedgerPdf'), 'image processing must use the photo ledger PDF renderer');
  assert(mainSource.includes('photoLedger: photo.photoLedger'), 'PDF entries must carry per-photo ledger info');
  assert(!mainSource.includes('async function createPdf('), 'old image-per-page PDF generator must be removed');
  assert(!app.includes('이미지 1장/페이지'), 'image-per-page PDF option must not be rendered');

  console.log(JSON.stringify({ ok: true, checked: 15, pdfPath }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
