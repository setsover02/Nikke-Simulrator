import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import { simulateBattle } from './engine/battleEngine';
import { Character, Team, Enemy, SimConfig } from './types/battle';
import LittleMermaidData from './character/LittleMermaid.json';
import LittleMermaidAvatar from './assets/avatar/LittleMermaid.webp';

// --- 간단한 Canvas 차트 컴포넌트 ---
const CanvasChart = ({ data }: { data: { time: number; dps: number }[] }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;

        // 배경 지우기
        ctx.clearRect(0, 0, width, height);

        if (data.length === 0) return;

        const maxTime = Math.max(...data.map(d => d.time), 1);
        const maxDps = Math.max(...data.map(d => d.dps), 100);

        // 축 그리기 (X축, Y축)
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 데이터 선 그리기
        ctx.beginPath();
        ctx.strokeStyle = '#ff4d4f';
        ctx.lineWidth = 2;
        data.forEach((d, i) => {
            const x = padding + (d.time / maxTime) * (width - 2 * padding);
            const y = height - padding - (d.dps / maxDps) * (height - 2 * padding);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // 텍스트 라벨
        ctx.fillStyle = '#333';
        ctx.font = '12px sans-serif';
        ctx.fillText(`Max DPS: ${Math.floor(maxDps).toLocaleString()}`, padding, padding - 10);
        ctx.fillText(`${maxTime}s`, width - padding, height - padding + 20);
        ctx.fillText('0s', padding, height - padding + 20);

    }, [data]);

    return (
        <canvas
            ref={canvasRef}
            width={800}
            height={400}
            style={{ width: '100%', maxWidth: '800px', height: 'auto', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9' }}
        />
    );
};

// --- 모의 베이스 스탯 ---
// JSON 파일에는 스킬만 정의되어 있으므로 시뮬레이션에 필요한 기본값을 합칩니다.
const applyBaseStats = (charData: any): Character => {
    const s = charData.stats || {};
    return {
        id: 'little_mermaid',
        atk: s.atk || 40000,
        defense: s.defense || 40000,
        hp: s.hp || 40000,
        element: s.element || 'Unknown',
        weapon: s.weapon || 'Unknown',
        charClass: s.class || 'Unknown',
        company: s.company || 'Unknown',
        burstLevel: s.burstLevel || 1,
        crit: 15, // Default base crit
        maxAmmo: s.maxAmmo || 120,
        ammo: s.maxAmmo || 120,
        reloadTime: s.reloadTime || 1.0,
        reloadRemain: 0,
        chargeTime: s.chargeTime || 0,
        fullChargeDamage: s.fullChargeDamage || 0,
        fireRate: s.fireRate || 5, // SMG 임의 스펙 (초당 5발)
        skills: charData.skills || [],
        atkCoef: (s.atkCoef || 10.12) / 100, // 계수는 %이므로 100으로 나눔
        critMult: 1.5,
    };
};

const characterOptions = [
    { value: 'little_mermaid', label: LittleMermaidData.character, data: LittleMermaidData },
];

function App() {
    const [selectedChar, setSelectedChar] = useState(characterOptions[0]);
    const [simulationResult, setSimulationResult] = useState<any>(null);
    const [chartData, setChartData] = useState<any[]>([]);

    const handleSimulate = () => {
        // 1. 선택한 캐릭터 데이터로 Team 구성
        const team: Team = {
            members: [applyBaseStats(selectedChar.data)]
        };

        // 2. 적 데이터 구성
        const enemy: Enemy = {
            hp: 1000000000, // 10억
            defense: 2000,
        };

        // 3. 설정 구성 (180초, 초당 60프레임 = delta 0.016)
        const config: SimConfig = {
            duration: 180,
            tick: 0.016,
            seed: 42
        };

        // 4. 시뮬레이션 돌리기!
        const result = simulateBattle(team, enemy, config);
        setSimulationResult(result);

        // 5. 로그 데이터를 1초 단위로 병합해서 차트 데이터 생성
        // (매 타격마다 찍히는 수천 개의 로그를 차트에 넣으면 렌더링이 버벅이므로)
        const aggregated: { [second: number]: number } = {};
        for (const log of result.log) {
            if (log.type === 'attack') {
                const sec = Math.floor(log.time);
                aggregated[sec] = (aggregated[sec] || 0) + (log.value || 0);
            }
        }

        const newChartData = [];
        for (let i = 0; i < config.duration; i++) {
            newChartData.push({
                time: i,
                dps: aggregated[i] || 0,
            });
        }

        setChartData(newChartData);
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>Nikke Damage Simulator</h1>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px' }}>
                <img
                    src={LittleMermaidAvatar}
                    alt="Little Mermaid"
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
                />
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

            {simulationResult && (
                <div style={{ marginBottom: '20px' }}>
                    <h2>Result Summary</h2>
                    <p><strong>Total Damage:</strong> {Math.floor(simulationResult.totalDamage).toLocaleString()}</p>
                    <p><strong>Average DPS:</strong> {Math.floor(simulationResult.dps).toLocaleString()}</p>
                </div>
            )}

            {chartData.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                    <h3>DPS Over Time</h3>
                    <CanvasChart data={chartData} />
                </div>
            )}
        </div>
    );
}

export default App;
