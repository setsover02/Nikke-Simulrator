## 26.03.02
소장품 일반대미지 공격 배율 계산이 원인을 모르겠으나 정확하지 않음
- 소수점 반올림 등 확인하였으나 미묘하게 수치가 다르게 나옴, 아주 크게 차이나지는 않음


# Damage Formula

- Base Damage = (Base Attack × (1 + ATK%) + % Caster’s ATK) – (Enemy Base Defense × (1 + DEF%) + % caster’s DEF)
- Final ATK modifiers = Final ATK damage of Attack/Skill × (1 + Final ATK modifiers)
- Major Modifiers = 1 + Other Critical Damage Sources + 0.5 Base + Other Core Damage Sources + Core Hit Bonus 1/1.5 [depends on Nikke] + Full Burst Bonus 0.5 + Effective Range Bonus 0.3
- Element Bonus Damage = Base 1.1 + Other Elemental Damage Sources
- Charge Damage = 1 + Other Charge Damage Sources + 0.5/1.5/2.5 [depends on Nikke]
- Damage Up = 1 + Attack Damage + Sustained Damage + True Damage + Pierce Damage + Damage To Parts + Damage to Interruption Parts
- Damage Taken = 1 + Damage Taken + Distributed Damage


## Base Damage
The number that will be input into final ATK% of skills or normal attacks.

Base Attack – The Attack stat seen on the Nikke’s summary screen.
ATK% – Includes all standard ATK% modifiers, including reductions.
% Caster’s ATK – Includes all flat, additive ATK buffs, including HP → ATK conversions seen on units like 2B or Cinderella.
Enemy Base Defense – The defense stat of the opponent. Normally not visible.
DEF% – Includes all DEF% modifiers, including reductions.
% caster’s DEF – Includes all flat, additive DEF modifiers, including reductions. Only Mast has access to this currently.

## Final ATK modifiers
Final ATK damage of Attack/Skill – The final damage of an attack or skill that will be input into the remainder of the formula, unless affected by a Final ATK modifier.
Final ATK modifiers – Modifies the damage output of a skill after all Base Damage modifications. Incredibly rare damage bonus.
Normal Attack Damage Multiplier – A lesser version of this modifier that only affects the damage of normal attacks of the user.

## Major Modifiers
Modifiers that can occur without secondary buffs.

Critical Damage – Damage multiplier that occurs if the damage rolls a critical hit. Base Damage is 150%, stated as 0.5 in the formula. Base Critical Rate is 15%.
Critical Damage Sources include buffs from the unit or allies.
Core Damage – Bonus damage dealt if the normal attack hits an opponent’s core. Base varies, but most Nikkes have it at 200%, stated as 1 in the formula.
Core Damage Sources include buffs from the unit or allies.
Full Burst Bonus – Affects damage dealt within Full Burst Time. Base value is 50%.
Effective Range Bonus – Increases normal attack damage when a Nikke’s weapon corresponds with the opponent’s distance. (Close, Mid or Long) Rocket Launchers cannot benefit from Effective Range bonus. Base value is 30%.

## Element Bonus Damage
Bonus Damage dealt if and only if the attacker has an elemental advantage over the opponent, based on the following chart.
Base bonus damage is 10%, stated as 1.1 in the equation. Bonus Elemental Damage Sources include buffs from the unit or allies.

## Charge Damage
Damage bonus available to Charge weapons’ normal attacks, which only include Sniper Rifles(SR) and Rocket Launchers(RL).
Base Charge damage varies between Nikkes, but the majority have it at 250%, stated as 1.5 in the damage formula.
Charge Damage Sources include buffs from the unit or allies.

## Damage Up##
Secondary buffs that boosts damage dealt, if it meets their respective criteria. Outside of Attack Damage, all of these are exclusive and will strictly buff what they specify.

Attack Damage – A general damage up buff. Affects all damage dealt.
Sustained Damage – Buff that only affects Sustained Damage, which applies a constant, damaging effect on the opponent for a specified duration.
True Damage – Buff that only affects True Damage, which ignores enemy DEF.
Pierce Damage – Buff that only affects Pierce Damage, normal attacks with the property to attack anything in its path, depending on what the pellet intersects with.
Damage To Parts – Buff that only affects Parts; Certain enemies, the majority of them being bosses, have parts to destroy. Very effective when combined with Pierce or Rocket Launcher splash damage.
Damage to Interruption Parts – Buff that only affects Interruption Parts. Only bosses will perform these moves that must be interrupted to continue its fight normally; Usually does not affect the boss itself. (See notes)

## Damage Taken
Classified as a debuff; Directly modifies the damage received based on its value.

Damage Taken – Includes all Damage Taken modifiers, including reductions.
Distributed Damage – Even though it is a buff that goes on a Nikke, it equates into this part of the equation. Distributed Damage usually bases its damage on the lowest DEF target available, and evenly distributes the damage dealt based on the number of enemies in combat.

## Notes
- Buffs and modifiers sharing the same category/color are effectively the same damage multiplier. (i.e. True Damage + Damage to Parts if a part is hit, Critical Damage + Full Burst Bonus)
Certain modifiers are exclusive to the benefit of normal attacks, unless otherwise specified. These include Core Damage, Damage to Interruption Parts, Charge Damage, Normal Attack Damage Multiplier, Damage To Parts and Effective Range Bonus. If a normal attack has additional damage sources or activations, those additional effects will not benefit from these multipliers.
Core Damage only affects damage that hits the core directly. If a target lacks a core, it isn’t possible to get this damage bonus against them.
A target’s defense value cannot drop below 0 through DEF% debuffs.
If a Rocket hits multiple targets, only the primary target can be affected by Core Damage bonuses if the projectile hits their core. The remaining units will receive splash damage unaffected by the multiplier.
Damage to Interruption Parts is conventionally only supposed to increase damage dealt to the red/grey circles that appear in a boss fight in order to Interrupt/Fail the gimmick, respectively. However, if a basic attack that hits an Interruption Part overlaps with a boss’ hitbox, the boss will take extra damage from that basic attack based on the Damage to Interruption Parts multiplier.
Even though Damage Taken and Distributed Damage are effectively the same damage modifier for DPS, Distributed Damage by itself cannot add away from Damage Taken ▼.
- Damage Taken nor DEF% debuffs don’t do anything to enemies/projectiles that take a fixed amount of damage. (typically 1)
- Certain Nikkes have ways to modify the base final ATK of their skills. (i.e. Bready, EVE)
SG and SMG Collection Items boost the Normal Attack Damage Multiplier of Nikkes that equip them.
Helm’s Burst at max rank Treasure, RL and SR Collection Items boost Charge Damage by the Charge Damage Multiplier × Base Charge Damage. Additional Charge Damage sources aren’t considered for this equation.