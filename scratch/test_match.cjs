const fs = require('fs');
const path = require('path');

function getCharFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      if (!full.includes('backup')) results = results.concat(getCharFiles(full));
    } else if (file.endsWith('.json')) {
      results.push(full);
    }
  });
  return results;
}

const files = getCharFiles('src/character');
const chars = files.map(f => {
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  return {
    file: path.basename(f),
    id: data.characterID,
    name: data.characterName,
    company: data.stats?.company,
    rarity: data.stats?.rarity,
    weapon: data.stats?.weapon,
    element: data.stats?.element,
    burst: data.stats?.burstLevel,
    class: data.stats?.class,
    data: data
  };
});

const csvRaw = fs.readFileSync('context/니케정보_.csv', 'utf8');
const lines = csvRaw.split(/\r?\n/).filter(l => l.trim().length > 0);

function normalize(s) {
  return (s || '').replace(/\s+/g, '').replace(/:/g, '').replace(/\(.*?\)/g, '').toLowerCase();
}

function companyNormalize(c) {
  if (!c) return '';
  const map = {
    '엘리시온': 'elysion',
    '미실리스': 'missilis',
    '테트라': 'tetra',
    '필그림': 'pilgrim',
    '어브노멀': 'abnormal'
  };
  return map[c] || c.toLowerCase();
}

let matched = 0;
let unmatched = [];

for (let i = 1; i < lines.length; i++) {
  const row = [];
  let inQuotes = false;
  let current = '';
  for (let c = 0; c < lines[i].length; c++) {
    const ch = lines[i][c];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      row.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += ch;
    }
  }
  row.push(current.trim().replace(/^"|"$/g, ''));

  const csvName = row[0];
  const csvElement = row[3] || '';
  const csvCompany = row[5] || '';
  const csvWeapon = row[6] || '';
  const csvClass = row[7] || '';

  // 1단계: characterName 일치 + 기업 일치
  let cand = chars.filter(c => c.name === csvName && companyNormalize(c.company) === companyNormalize(csvCompany));
  if (cand.length === 1) {
    matched++;
    continue;
  }

  // 2단계: 정규화 이름 일치 + 기업 일치
  const normCsv = normalize(csvName);
  cand = chars.filter(c => normalize(c.name) === normCsv && companyNormalize(c.company) === companyNormalize(csvCompany));
  if (cand.length === 1) {
    matched++;
    continue;
  }

  // 3단계: 기업 + 무기 + 클래스 + 속성 일치
  cand = chars.filter(c => 
    companyNormalize(c.company) === companyNormalize(csvCompany) &&
    c.weapon === csvWeapon &&
    c.element === csvElement &&
    (normalize(c.name).includes(normCsv) || normCsv.includes(normalize(c.name)))
  );
  if (cand.length === 1) {
    matched++;
    continue;
  }

  unmatched.push({ line: i + 1, csvName, csvCompany, csvWeapon, csvElement, cand: cand.map(c => c.name) });
}

console.log('Total CSV rows:', lines.length - 1);
console.log('Successfully Matched:', matched);
console.log('Unmatched count:', unmatched.length);
if (unmatched.length > 0) {
  console.log('Unmatched rows:', JSON.stringify(unmatched, null, 2));
}
