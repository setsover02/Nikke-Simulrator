import React, { useState } from 'react';
import Select from 'react-select';
import { simulateBattle } from './engine/battleEngine';
import { Team, Enemy, SimConfig } from './types/battle';
import LittleMermaidData from './character/LittleMermaid.json';
import AriaData from './character/Aria.json';
import LittleMermaidAvatar from './assets/avatar/LittleMermaid.webp';
import AriaAvatar from './assets/avatar/Aria.webp';
import CanvasChart from './components/CanvasChart';
import { applyBaseStats, EquipmentOptions } from './utils/charUtils';
import { generateChartData, generateSkillChartData } from './utils/simUtils';
import { calcHitChance, WeaponType } from './engine/accuraySystem';

// 아바타 매핑 (없으면 null)
const avatarMap: Record<string, string> = {
    LittleMermaid: LittleMermaidAvatar,
};

const characterOptions = [
    { value: 'little_mermaid', label: LittleMermaidData.characterName, data: LittleMermaidData },
    { value: 'aria', label: AriaData.characterName, data: AriaData },
];

const inputStyle: React.CSSProperties = {
    width: '80px',
    padding: '6px 8px',
    fontSize: '14px',
    background: '#1a1a2e',
    color: '#e0e0e0',
    border: '1px solid #444',
    borderRadius: '4px',
    textAlign: 'right',
};

const labelStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '13px',
    color: '#bbb',
};

function App() {
    const [selectedChar, setSelectedChar] = useState(characterOptions[0]);
    const [simulationResults, setSimulationResults] = useState<{
        normal: any;
        core: any;
        coreHitPct: number;
        skillTotal: number;
    } | null>(null);
    const [chartDatasets, setChartDatasets] = useState<any[]>([]);

    // 장비 추가 옵션 (% 값 입력)
    const [equipATK, setEquipATK] = useState('0');
    const [equipWeakPoint, setEquipWeakPoint] = useState('0');
    const [equipAmmo, setEquipAmmo] = useState('0');

    const handleSimulate = () => {
        // 장비 옵션을 소수로 변환
        const equip: EquipmentOptions = {
            atkPercent: parseFloat(equipATK || '0') / 100,
            weakPointPercent: parseFloat(equipWeakPoint || '0') / 100,
            ammoPercent: parseFloat(equipAmmo || '0') / 100,
        };

        // 1. 공통 설정
        const config: SimConfig = { duration: 180, tick: 0.016, seed: 42 };
        const enemy: Enemy = { hp: 1000000000, defense: 2000 };

        // 2. 실제 코어 명중률 계산 (accuraySystem 기준)
        const stats = selectedChar.data.stats || {};
        const weaponKey = (stats.weapon ?? 'AR') as WeaponType;
        const validWeapon = Object.values(WeaponType).includes(weaponKey) ? weaponKey : WeaponType.AR;
        const coreHitChance = calcHitChance({
            weapon: validWeapon,
            distance: 15,
            comboShots: 0,
            accuracyBuff: (stats as any).accuracyBuff ?? 0,
        });
        const coreHitPct = Math.round(coreHitChance * 100);
        const coreLabel = `Total Damage (Core Hit ~${coreHitPct}%)`;

        // 3. Normal 시뮬레이션 (coreDamage 미적용, 장비 적용)
        const teamNormal: Team = { members: [applyBaseStats(selectedChar.data, false, equip)] };
        const resultNormal = simulateBattle(teamNormal, { ...enemy }, config);

        // 4. Core 시뮬레이션 (코어 히트 + 장비 적용)
        const teamCore: Team = { members: [applyBaseStats(selectedChar.data, true, equip)] };
        const resultCore = simulateBattle(teamCore, { ...enemy }, config);

        // 5. 스킬 데미지 합산
        const skillTotal = resultCore.log
            .filter((l: any) => l.type === 'skill_damage')
            .reduce((sum: number, l: any) => sum + (l.value || 0), 0);

        setSimulationResults({ normal: resultNormal, core: resultCore, coreHitPct, skillTotal });

        const charName = selectedChar.data.characterName || selectedChar.data.characterID;
        setChartDatasets([
            { label: 'Total Damage (Normal)', color: '#1890ff', data: generateChartData(resultNormal, config.duration) },
            { label: coreLabel, color: '#ff4d4f', data: generateChartData(resultCore, config.duration) },
            { label: `Skill Damage (${charName})`, color: '#52c41a', data: generateSkillChartData(resultCore, config.duration) },
        ]);
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>Nikke Damage Simulator</h1>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px' }}>
                {avatarMap[selectedChar.data.characterID] ? (
                    <img
                        src={avatarMap[selectedChar.data.characterID]}
                        alt={selectedChar.data.characterName}
                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
                    />
                ) : (
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '8px',
                        background: '#2a2a3e', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#888', fontSize: '12px', textAlign: 'center',
                    }}>
                        {selectedChar.data.characterName}
                    </div>
                )}
                <div style={{ width: '300px' }}>
                    <Select
                        options={characterOptions}
                        value={selectedChar}
                        onChange={(selected: any) => setSelectedChar(selected)}
                    />
                </div>
                <button
                    onClick={handleSimulate}
                    style={{ padding: '10px 20px', fontSize: '16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                >
                    Simulate (3 Mins)
                </button>
            </div>

            {/* 장비 추가 옵션 입력 */}
            <div style={{
                display: 'flex',
                gap: '24px',
                alignItems: 'flex-end',
                marginBottom: '24px',
                padding: '16px',
                background: '#1e1e2e',
                borderRadius: '8px',
                border: '1px solid #333',
            }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#ddd', alignSelf: 'center' }}>
                    ⚙️ Equipment
                </span>
                <label style={labelStyle}>
                    추가 공격력 %
                    <input
                        type="number"
                        value={equipATK}
                        onChange={(e) => setEquipATK(e.target.value)}
                        style={inputStyle}
                        placeholder="0"
                    />
                </label>
                <label style={labelStyle}>
                    우월코드 데미지 %
                    <input
                        type="number"
                        value={equipWeakPoint}
                        onChange={(e) => setEquipWeakPoint(e.target.value)}
                        style={inputStyle}
                        placeholder="0"
                    />
                </label>
                <label style={labelStyle}>
                    장탄수 %
                    <input
                        type="number"
                        value={equipAmmo}
                        onChange={(e) => setEquipAmmo(e.target.value)}
                        style={inputStyle}
                        placeholder="0"
                    />
                </label>
            </div>

            {simulationResults && (
                <div style={{ marginBottom: '20px' }}>
                    <h2>Result Summary</h2>
                    <div style={{ display: 'flex', gap: '40px' }}>
                        <div>
                            <h3 style={{ color: '#1890ff' }}>Normal</h3>
                            <p><strong>Total Damage:</strong> {Math.floor(simulationResults.normal.totalDamage).toLocaleString()}</p>
                            <p><strong>Average DPS:</strong> {Math.floor(simulationResults.normal.dps).toLocaleString()}</p>
                        </div>
                        <div>
                            <h3 style={{ color: '#ff4d4f' }}>Core Hit ~{simulationResults.coreHitPct}%</h3>
                            <p><strong>Total Damage:</strong> {Math.floor(simulationResults.core.totalDamage).toLocaleString()}</p>
                            <p><strong>Average DPS:</strong> {Math.floor(simulationResults.core.dps).toLocaleString()}</p>
                        </div>
                        <div>
                            <h3 style={{ color: '#52c41a' }}>Skill Damage ({selectedChar.data.characterName})</h3>
                            <p><strong>Total:</strong> {Math.floor(simulationResults.skillTotal).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            )}

            {chartDatasets.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                    <h3>Cumulative Damage Over Time</h3>
                    <CanvasChart datasets={chartDatasets} />
                </div>
            )}
        </div>
    );
}

export default App;
