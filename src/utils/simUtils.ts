export const generateChartData = (result: any, duration: number) => {
    const aggregated: { [second: number]: number } = {};
    for (const log of result.log) {
        if (log.type === 'attack' || log.type === 'skill_damage') {
            const sec = Math.floor(log.time);
            aggregated[sec] = (aggregated[sec] || 0) + (log.value || 0);
        }
    }
    const data = [];
    let cumulativeDamage = 0;
    for (let i = 0; i <= duration; i++) {
        cumulativeDamage += (aggregated[i] || 0);
        data.push({ time: i, dps: cumulativeDamage });
    }
    return data;
};

/** 스킬 데미지만 집계한 누적 차트 데이터 */
export const generateSkillChartData = (result: any, duration: number) => {
    const aggregated: { [second: number]: number } = {};
    for (const log of result.log) {
        if (log.type === 'skill_damage') {
            const sec = Math.floor(log.time);
            aggregated[sec] = (aggregated[sec] || 0) + (log.value || 0);
        }
    }
    const data = [];
    let cumulativeDamage = 0;
    for (let i = 0; i <= duration; i++) {
        cumulativeDamage += (aggregated[i] || 0);
        data.push({ time: i, dps: cumulativeDamage });
    }
    return data;
};
