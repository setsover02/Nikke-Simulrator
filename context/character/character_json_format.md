# 캐릭터 JSON 형식

``` {
    "characterID": "캐릭터 ID 카멜케이스",
    "characterName": "캐릭터 이름",
    "stats": {
        rarity, atkCoef 등 각종 니케 기본 스탯
    },
    "skills": [
        {
            "id": "skill_1",
            "name": "이글 아이",
            "type": "passive",
            "effects": [
                {
                    "trigger": "normal_attack_hit",
                    "condition": {
                        "chance": 5
                    },
                    "target": "self",
                    "effect": "attack_power_up",
                    "value": 1.98,
                    "unit": "percent",
                    "duration": 5
                }
            ]
        },
        {
            "id": "skill_2",
            "name": "이글 택틱",
            "type": "active",
            "cooldown": 9.0,
            "effects": [
                {
                    "target": "self",
                    "effect": "max_ammo_up",
                    "value": 28.19,
                    "unit": "percent",
                    "duration": 5
                }
            ]
        },
        {
            "id": "burst",
            "name": "이글 샷",
            "type": "burst",
            "cooldown": 40.0,
            "effects": [
                {
                    "target": "enemies_in_range",
                    "effect": "damage",
                    "value": 180,
                    "unit": "percent",
                    "based_on": "final_atk"
                }
            ]
        }
    ]
} ```