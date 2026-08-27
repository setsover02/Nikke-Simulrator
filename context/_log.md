문제 5: buildDamageParams에서 BuffManager 버프와 char.buff fallback의 이중 적용 위험
damageCalc.ts L231-295

현상: buildDamageParams가 buffs (BuffManager)가 있으면 BuffManager 값을, 없으면 char.buff 값을 사용한다. 그런데 BuffManager가 항상 존재(battleEngine.ts L51)하므로 char.buff fallback은 사실상 실행되지 않는다.

한편, buildSkillDamageParams(skillResolver 내부)는 char.buff만 참조한다. 이로 인해 두 시스템이 동시에 운영되고 있다:

일반 공격: BuffManager → buildDamageParams
스킬 대미지: char.buff → buildSkillDamageParams
skillResolver의 applyEffect가 char.buff에 직접 값을 써넣고, BuffManager의 registerTeamSkills도 같은 스킬을 등록하므로 일부 버프가 이중 적용될 수 있다.

영향: 패시브/배틀스타트 버프가 char.buff에도 쓰이고 BuffManager._active에도 들어가면, 일반 공격 대미지에 BuffManager 값이, 스킬 대미지에 char.buff 값이 적용되어 각기 다른 값으로 계산됨. 이중 적용은 ATK% 같은 주요 스탯에서 오류가 된다.

✅ RESOLVED 2026-08-27: calc-master buff_manager.py 아키텍처 기준으로 통합 완료.
- buildDamageParams: AND 합산 → OR fallback 패턴 (BuffManager 우선)
- buildSkillDamageParams: char.buff → ctx.buffManager.getBuffs() 전환
- applyEffect: 대미지 관련 8종 char.buff 직접 변경 제거 (BuffManager 단일 정본)