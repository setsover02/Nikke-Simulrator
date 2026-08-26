const fs = require('fs');
const path = require('path');

const PARSED_SKILLS_PATH = path.resolve(__dirname, '../../nikke-calc-master/data/parsed_skills.json');
const PARSED_NIKKE_PATH = path.resolve(__dirname, '../../nikke-calc-master/data/parsed_nikke.json');
const SCRAPED_PATH = path.resolve(__dirname, '../scraper/nikke_scraped.json');
const CHAR_BASE_DIR = path.resolve(__dirname, '../src/character');

const parsedSkills = JSON.parse(fs.readFileSync(PARSED_SKILLS_PATH, 'utf8'));
const parsedNikke = JSON.parse(fs.readFileSync(PARSED_NIKKE_PATH, 'utf8'));
const scraped = fs.existsSync(SCRAPED_PATH) ? JSON.parse(fs.readFileSync(SCRAPED_PATH, 'utf8')) : {};

// Normalization key
function norm(str) {
  if (!str) return '';
  return str.replace(/\s+/g, '').replace(/:/g, '').replace(/\(/g, '').replace(/\)/g, '').toLowerCase();
}

const parsedKeyMap = {};
for (const k of Object.keys(parsedSkills)) {
  parsedKeyMap[norm(k)] = k;
  parsedKeyMap[k] = k;
}

// Extra ALIASES
const ALIASES = {
  '라피_레드_후드': '라피 : 레드 후드',
  '앵커_이노센트_메이드': '앵커 : 이노센트 메이드',
  '마스트_로망틱_메이드': '마스트 : 로망틱 메이드',
  '메이든_아이스_로즈': '메이든 : 아이스 로즈',
  '네온_비전_아이': '네온 : 비전 아이',
  '아니스_스타': '아니스 : 스타',
  '아니스_스파클링_서머': '아니스 : 스파클링 서머',
  '미하라_본딩_체인': '미하라 : 본딩 체인',
  '도로시_세렌디피티': '도로시 : 세렌디피티',
  '디젤_윈터_스위츠': '디젤 : 윈터 스위츠',
  '아르카나_포츈_메이트': '아르카나 : 포츈 메이트',
  '솔린_프로스트_티켓': '솔린 : 프로스트 티켓',
  '브리드_사일런트_트랙': '브리드 : 사일런트 트랙',
  '루드밀라_윈터_오너': '루드밀라 : 윈터 오너',
  '에이드_에이전트_바니': '에이드 : 에이전트 바니',
  '일레그_붐앤쇼크': '일레그 : 붐 앤 쇼크',
  'd_킬러_와이프': 'D : 킬러 와이프',
  '퀀시_이스케이프_퀸': '퀀시 : 이스케이프 퀸',
  '소다_트윙클링_바니': '소다 : 트윙클링 바니',
  '헬름_아쿠아마린': '헬름 : 아쿠아마린',
  '델타_닌자_시프': '델타 : 닌자 시프',
  '스노우_화이트_헤비_암즈s': '스노우 화이트 : 헤비암즈',
  '아스카_wille': '아스카 : WILLE',
  '마르차나_마린_스터디': '마르차나 : 마린 스터디',
  '신데렐라_크리스탈_웨이브': '신데렐라 : 크리스탈 웨이브',
  '라플라스_얼티밋_히어로': '라플라스 : 얼티밋 히어로',
  '맥스웰_오디너리_미케닉': '맥스웰 : 오디너리 미케닉',
  '홍련_흑영': '홍련 : 흑영',
  '앤_미라클_페어리': '앤 : 미라클 페어리',
  '루피_윈터_쇼퍼': '루피 : 윈터 쇼퍼',
  '메어리_베이_갓데스': '메어리 : 베이 갓데스',
  '미카_스노우_버디': '미카 : 스노우 버디',
  '밀크_블루밍_바니': '밀크 : 블루밍 바니',
  '사쿠라_블룸_인_서머': '사쿠라 : 블룸 인 서머',
  '앨리스_원더랜드_바니': '앨리스 : 원더랜드 바니',
  '스노우_화이트_이노센트_데이즈': '스노우 화이트 : 이노센트 데이즈',
  '라푼젤_퓨어_그레이스': '라푼젤 : 퓨어 그레이스',
  '프리바티_언카인드_메이드': '프리바티 : 언카인드 메이드',
};

// Stat mapping for legacy effect names
const LEGACY_EFFECT_MAP = {
  'atk_up': 'atk_pct',
  'atk_down': 'atk_pct',
  'atk_damage_up': 'atk_dmg_pct',
  'charge_speed_up': 'charge_speed_pct',
  'charge_speed_down': 'charge_speed_pct',
  'charge_damage_up': 'charge_dmg_pct',
  'critical_rate_up': 'crit_rate',
  'critical_damage_up': 'crit_dmg_pct',
  'damage_taken_up': 'received_dmg',
  'damage_taken_down': 'received_dmg',
  'damage_taken_pct': 'received_dmg',
  'parts_damage_up': 'part_dmg_pct',
  'pierce_damage_up': 'pierce_dmg_pct',
  'core_damage_up': 'core_dmg_pct',
  'max_ammo_up': 'max_ammo_pct',
  'max_ammo_down': 'max_ammo_pct',
  'reload_speed_up': 'reload_speed_pct',
  'accuracy_up': 'accuracy_pct',
  'burst_cooldown_reduction': 'burst_cooldown_reduce',
  'burst_cooldown_reduce': 'burst_cooldown_reduce',
  'heal': 'heal_hp_pct',
  'dot_heal': 'heal_hp_pct',
  'pierce': 'pierce_enabled',
  'damage': 'skill_damage',
  'extra_damage': 'extra_damage',
  'def_up': 'def_pct',
  'def_down': 'enemy_def_down_pct',
  'max_hp_up': 'max_hp_pct',
  'element_damage_up': 'element_bonus_pct',
  'dot_damage': 'dot_damage',
  'dot_damage_up': 'dot_dmg_pct',
  'accumulate_damage': 'split_dmg_pct',
  'distribute_damage': 'split_dmg_pct',
  'damage_share': 'split_dmg_pct',
  'differential_damage_share': 'split_dmg_pct',
  'pellet_count_up': 'pellet_count',
  'single_target_burst_damage_up': 'burst_dmg_pct',
  'burst_gauge_charge': 'burst_gauge_charge',
  'ammo_charge': 'ammo_charge_pct',
  'shield': 'shield',
  'debuff_immunity': 'debuff_immune',
  'immobile': 'stun',
  'stun': 'stun',
  'change_weapon': 'change_weapon',
};

// Target mapping for legacy target names
const LEGACY_TARGET_MAP = {
  'highest_atk_allies_2': 'allies_top_atk:2',
  'highest_atk_allies_1': 'allies_top_atk:1',
  'highest_atk_allies_3': 'allies_top_atk:3',
  'top_atk_allies:2': 'allies_top_atk:2',
  'top_atk_allies:1': 'allies_top_atk:1',
  'attacker_allies': 'allies_class:화력형',
  'supporter_allies': 'allies_class:지원형',
  'defender_allies': 'allies_class:방어형',
  'fire_element_allies': 'allies_element:작열',
  'water_element_allies': 'allies_element:수냉',
  'wind_element_allies': 'allies_element:풍압',
  'electric_element_allies': 'allies_element:전격',
  'iron_element_allies': 'allies_element:철갑',
  'sg_allies': 'allies_weapon:SG',
  'smg_allies': 'allies_weapon:SMG',
  'ar_allies': 'allies_weapon:AR',
  'mg_allies': 'allies_weapon:MG',
  'sr_allies': 'allies_weapon:SR',
  'rl_allies': 'allies_weapon:RL',
  'sg_allies_excluding_self': 'sg_allies_excluding_self',
  'allies_excluding_self': 'allies_excluding_self',
  'closest_enemy': 'target',
  'lowest_hp_enemy': 'lowest_hp_enemy',
  'highest_atk_enemy_1': 'highest_atk_enemy_1',
  'highest_def_enemy_1': 'highest_def_enemy_1',
  'same_target': 'same_target',
};

function convertValuesToArray(valObj) {
  if (Array.isArray(valObj)) {
    if (valObj.length === 10) return valObj.map(v => Number(v) || 0);
    const first = Number(valObj[0]) || 0;
    const res = [];
    for (let i = 0; i < 10; i++) res.push(valObj[i] !== undefined ? Number(valObj[i]) || 0 : first);
    return res;
  }
  if (typeof valObj === 'object' && valObj !== null) {
    const res = [];
    for (let lv = 1; lv <= 10; lv++) {
      const v = valObj[String(lv)] ?? valObj[lv] ?? valObj['10'] ?? valObj['1'] ?? 0;
      res.push(Number(v) || 0);
    }
    return res;
  }
  const num = Number(valObj) || 0;
  return new Array(10).fill(num);
}

function formatParsedEffect(eff) {
  const valuesArray = convertValuesToArray(eff.values || eff.fixed_value);
  const out = {
    trigger: eff.trigger?.timing?.[0] || 'passive',
    target: eff.target || 'self',
    effect: eff.stat || 'atk_pct',
    value: valuesArray,
    unit: 'percent',
    duration: eff.duration === -1 || eff.duration === 'permanent' ? 'permanent' : (eff.duration ?? null),
  };

  if (eff.name) out.name = eff.name;
  if (eff.type) out.type = eff.type;
  if (eff.trigger && eff.trigger.condition && eff.trigger.condition.length > 0) {
    out.condition = eff.trigger.condition[0];
  }
  if (eff.max_stack && eff.max_stack > 1) {
    out.stack = eff.max_stack;
  }
  if (eff.duration_bullets) {
    out.bullet = eff.duration_bullets;
  }
  if (eff.scaling) {
    out.scaling = eff.scaling;
    if (eff.scaling_ref) out.scaling_ref = eff.scaling_ref;
  }
  if (eff.target_effect) {
    out.target_effect = eff.target_effect;
  }
  if (eff.weapon_override) {
    out.weapon_override = eff.weapon_override;
  }

  return out;
}

const charDirs = ['abnormal', 'elysion', 'missilis', 'pilgrim', 'tetra'];
let updatedCount = 0;
let parsedAppliedCount = 0;
let standardizedCount = 0;

for (const dir of charDirs) {
  const dirPath = path.join(CHAR_BASE_DIR, dir);
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));

  for (const f of files) {
    const fullPath = path.join(dirPath, f);
    const charData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    const rawName = charData.characterName || charData.name || '';

    // Check match in ALIASES or parsedSkills
    let canonical = ALIASES[f.replace('.json', '')] || parsedSkills[rawName] ? rawName : parsedKeyMap[norm(rawName)];
    if (!canonical && ALIASES[norm(rawName)]) {
      canonical = ALIASES[norm(rawName)];
    }

    if (canonical && parsedSkills[canonical]) {
      // 100% Verified parsed_skills sync
      const pEffs = parsedSkills[canonical];
      const nikkeMeta = parsedNikke[canonical] || {};

      const baseEffs = pEffs.filter(e => e.favorite === undefined || e.favorite === null);
      const favEffs = pEffs.filter(e => e.favorite !== undefined && e.favorite !== null);

      const skill1List = baseEffs.filter(e => e.source === '스킬1');
      const skill2List = baseEffs.filter(e => e.source === '스킬2');
      const burstList = baseEffs.filter(e => e.source === '스킬3');

      // Preserve skill names from existing or first effect name
      const s1Name = charData.skills?.[0]?.name || skill1List[0]?.name || '스킬 1';
      const s2Name = charData.skills?.[1]?.name || skill2List[0]?.name || '스킬 2';
      const bName = charData.skills?.[2]?.name || burstList[0]?.name || '버스트 스킬';
      const bCooldown = nikkeMeta.burst_cooldown ?? charData.skills?.[2]?.cooldown ?? 40;

      charData.skills = [
        {
          id: 'skill_1',
          name: s1Name,
          type: 'passive',
          effects: skill1List.map(formatParsedEffect),
        },
        {
          id: 'skill_2',
          name: s2Name,
          type: 'passive',
          effects: skill2List.map(formatParsedEffect),
        },
        {
          id: 'burst',
          name: bName,
          type: 'burst',
          cooldown: bCooldown,
          effects: burstList.map(formatParsedEffect),
        },
      ];

      // Favorite item stages if present
      if (favEffs.length > 0) {
        const favSlots = nikkeMeta.favorite_slots || [1, 2, 3];
        const stages = [];
        for (let st = 1; st <= 3; st++) {
          const stEffs = favEffs.filter(e => e.favorite === st);
          if (stEffs.length > 0) {
            const src = stEffs[0].source;
            const replaceSlot = src === '스킬1' ? 1 : src === '스킬2' ? 2 : 3;
            const skillId = replaceSlot === 1 ? 'skill_1' : replaceSlot === 2 ? 'skill_2' : 'burst';
            const skillName = replaceSlot === 1 ? s1Name : replaceSlot === 2 ? s2Name : bName;
            stages.push({
              stage: st,
              replaceSlot,
              skill: {
                id: skillId,
                name: skillName,
                effects: stEffs.map(formatParsedEffect),
              },
            });
          }
        }
        if (stages.length > 0) {
          charData.favoriteItem = {
            itemName: charData.favoriteItem?.itemName || `${rawName} 애장품`,
            stages,
          };
        }
      }

      parsedAppliedCount++;
    } else {
      // Non-parsed characters: standardize existing effects
      if (charData.skills) {
        for (const skill of charData.skills) {
          if (skill.effects) {
            skill.effects = skill.effects.map(eff => {
              const effectKey = eff.effect || eff.stat || 'atk_pct';
              const canonicalStat = LEGACY_EFFECT_MAP[effectKey] || effectKey;
              const targetKey = eff.target || 'self';
              const canonicalTarget = LEGACY_TARGET_MAP[targetKey] || targetKey;

              let condition = eff.condition;
              let trigger = eff.trigger || 'passive';

              if (typeof condition === 'object' && condition !== null) {
                if (condition.hp_above) {
                  const hpVal = Array.isArray(condition.hp_above) ? condition.hp_above[0] : condition.hp_above;
                  condition = `self_hp_above:${hpVal}`;
                } else if (condition.hp_below) {
                  const hpVal = Array.isArray(condition.hp_below) ? condition.hp_below[0] : condition.hp_below;
                  condition = `self_hp_below:${hpVal}`;
                } else if (condition.count) {
                  const cntVal = Array.isArray(condition.count) ? condition.count[0] : condition.count;
                  trigger = `hit_count:${cntVal}`;
                  condition = undefined;
                } else if (condition.chance) {
                  const chVal = Array.isArray(condition.chance) ? condition.chance[0] : condition.chance;
                  condition = `prob:${chVal}`;
                }
              }

              return {
                ...eff,
                effect: canonicalStat,
                target: canonicalTarget,
                trigger,
                condition,
                value: convertValuesToArray(eff.value || eff.values || 0),
              };
            });
          }
        }
      }
      standardizedCount++;
    }

    fs.writeFileSync(fullPath, JSON.stringify(charData, null, 4), 'utf8');
    updatedCount++;
  }
}

console.log(`✅ Completed character standardization:`);
console.log(`- Total files updated: ${updatedCount}`);
console.log(`- Directly applied parsed_skills.json: ${parsedAppliedCount}`);
console.log(`- Standardized remaining characters: ${standardizedCount}`);
