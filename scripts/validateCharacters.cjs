const fs = require('fs');
const path = require('path');

const CHAR_BASE_DIR = path.resolve(__dirname, '../src/character');
const charDirs = ['abnormal', 'elysion', 'missilis', 'pilgrim', 'tetra'];

let totalFiles = 0;
let errors = [];
let warnings = [];

const KNOWN_STATS = new Set([
  'atk_pct', 'atk_dmg_pct', 'normal_atk_dmg_pct', 'burst_dmg_pct', 'burst_dmg_aoe_pct',
  'charge_dmg_pct', 'charge_dmg_mag_pct', 'charge_speed_pct', 'charge_time_flat',
  'crit_rate', 'crit_dmg_pct', 'core_dmg_pct', 'part_dmg_pct', 'pierce_dmg_pct',
  'dot_dmg_pct', 'dot_damage', 'split_dmg_pct', 'element_bonus_pct', 'received_dmg',
  'armor_break_dmg_pct', 'max_ammo_pct', 'max_ammo_flat', 'reload_speed_pct',
  'attack_speed_pct', 'accuracy_pct', 'mg_warmup_speed_pct', 'pellet_count',
  'burst_cooldown_pct', 'burst_cooldown_reduce', 'skill_cooldown_pct', 'lifesteal_pct',
  'max_hp_pct', 'def_pct', 'enemy_def_down_pct', 'pierce_enabled', 'armor_break_enabled',
  'stun', 'stun_immune', 'debuff_immune', 'charge_speed_buff_immune',
  'charge_speed_debuff_immune', 'skill_damage', 'extra_damage', 'burst_damage',
  'heal_hp_pct', 'shield', 'burst_gauge_charge', 'ammo_charge_pct', 'change_weapon',
  'invincible', 'immortality', 'taunt', 'decoy', 'revive', 'dispel', 'dispel_buff',
  'explosion_range_up', 'charge_speed_caster_based_pct', 'atk_caster_based_pct',
  'current_hp_down', 'max_range_up', 'next_shield_hp_up', 'shield_hp_heal',
  'full_burst_time_down', 'full_burst_time_up', 'full_charge_count_change',
  'remove_status', 'stealth', 'target_extermination', 'charge_status',
  'skill_trigger_count_reduction', 'copy_atk', 'copy_max_hp', 'buff'
]);

for (const dir of charDirs) {
  const dirPath = path.join(CHAR_BASE_DIR, dir);
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));

  for (const f of files) {
    totalFiles++;
    const fullPath = path.join(dirPath, f);
    const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    if (!content.characterName && !content.name) {
      errors.push(`[${dir}/${f}] Missing characterName`);
    }
    if (!content.stats) {
      errors.push(`[${dir}/${f}] Missing stats`);
    }
    if (!Array.isArray(content.skills) || content.skills.length < 3) {
      errors.push(`[${dir}/${f}] skills length < 3`);
      continue;
    }

    for (const skill of content.skills) {
      if (!Array.isArray(skill.effects)) continue;
      for (const eff of skill.effects) {
        const stat = eff.effect || eff.stat;
        if (!stat) {
          errors.push(`[${dir}/${f}] Skill ${skill.id} effect missing stat/effect`);
        } else if (!KNOWN_STATS.has(stat)) {
          warnings.push(`[${dir}/${f}] Unknown stat: "${stat}" in skill ${skill.id}`);
        }

        if (!eff.target) {
          errors.push(`[${dir}/${f}] Skill ${skill.id} effect missing target`);
        }

        if (Array.isArray(eff.value)) {
          if (eff.value.length !== 10) {
            errors.push(`[${dir}/${f}] Skill ${skill.id} effect value length is ${eff.value.length}, expected 10`);
          }
        }
      }
    }
  }
}

console.log(`\n📊 Character Validation Results:`);
console.log(`- Total files inspected: ${totalFiles}`);
console.log(`- Errors: ${errors.length}`);
console.log(`- Warnings (unknown stats): ${warnings.length}`);

if (errors.length > 0) {
  console.log('\n❌ Errors:');
  errors.forEach(e => console.log('  ', e));
}

if (warnings.length > 0) {
  console.log('\n⚠️ Warnings:');
  warnings.forEach(w => console.log('  ', w));
}
