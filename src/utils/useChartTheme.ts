import { useState, useEffect, useMemo } from 'react';

export interface ChartThemeTokens {
    theme: 'dark' | 'light';
    fontDefault: string;
    fontMuted: string;
    fontInactive: string;
    gridLine: string;
    axisLine: string;
    hoverLine: string;
    burstBg: string;
    burstText: string;
    slotColors: string[];
    tooltipBg: string;
    tooltipBorder: string;
    tooltipShadow: string;
    getSlotColor: (slotIndexOrId: number | string) => string;
    resolveColor: (color: string, fallbackIdx?: number) => string;
}

const DARK_TOKENS = {
    fontDefault: '#EBEBEB',
    fontMuted: '#C7C7C7',
    fontInactive: '#8E8E8E',
    gridLine: 'rgba(255, 255, 255, 0.05)',
    axisLine: 'rgba(255, 255, 255, 0.15)',
    hoverLine: '#717171',
    burstBg: 'rgba(255, 182, 25, 0.12)',
    burstText: '#FFCB50',
    slotColors: ['#6BE016', '#28D0ED', '#4F95FF', '#D478FF', '#FFA938'],
    tooltipBg: 'rgba(26, 26, 26, 0.95)',
    tooltipBorder: 'rgba(255, 255, 255, 0.12)',
    tooltipShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
};

const LIGHT_TOKENS = {
    fontDefault: '#393939',
    fontMuted: '#535353',
    fontInactive: '#717171',
    gridLine: 'rgba(0, 0, 0, 0.08)',
    axisLine: 'rgba(0, 0, 0, 0.15)',
    hoverLine: '#8E8E8E',
    burstBg: 'rgba(255, 182, 25, 0.16)',
    burstText: '#D98200',
    slotColors: ['#4CAF0A', '#00A8C6', '#2E6FE0', '#A740DE', '#E07800'],
    tooltipBg: 'rgba(255, 255, 255, 0.95)',
    tooltipBorder: 'rgba(0, 0, 0, 0.12)',
    tooltipShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
};

const getCurrentTheme = (): 'dark' | 'light' => {
    if (typeof document === 'undefined') return 'dark';
    const attr = document.documentElement.getAttribute('data-theme');
    return attr === 'light' ? 'light' : 'dark';
};

export const useChartTheme = (): ChartThemeTokens => {
    const [theme, setTheme] = useState<'dark' | 'light'>(getCurrentTheme);

    useEffect(() => {
        const updateTheme = () => {
            setTheme(getCurrentTheme());
        };

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                    updateTheme();
                    break;
                }
            }
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });

        return () => observer.disconnect();
    }, []);

    const tokens = useMemo<ChartThemeTokens>(() => {
        const base = theme === 'light' ? LIGHT_TOKENS : DARK_TOKENS;

        const getSlotColor = (val: number | string, fallbackIdx: number = 0) => {
            if (typeof val === 'number') {
                return base.slotColors[val % base.slotColors.length];
            }
            if (typeof val === 'string') {
                if (!val || val === '__enemy__') return '#E53935';
                
                // 1. 뒤에 _0, _1, _2, _3, _4 형태의 슬롯 인덱스가 붙은 경우 (예: c001_0, alice_1, rouge_2)
                const matchEnd = val.match(/_(\d+)$/);
                if (matchEnd) {
                    const idx = parseInt(matchEnd[1], 10);
                    return base.slotColors[idx % base.slotColors.length];
                }

                // 2. slot_1, slot1, slot_0 등
                const matchSlot = val.match(/slot_?(\d+)/i);
                if (matchSlot) {
                    const num = parseInt(matchSlot[1], 10);
                    const idx = num >= 1 && num <= 5 ? num - 1 : num;
                    return base.slotColors[idx % base.slotColors.length];
                }

                // 3. 단일 숫자 문자열 ("0", "1", "2")
                if (/^\d+$/.test(val)) {
                    return base.slotColors[parseInt(val, 10) % base.slotColors.length];
                }
            }
            return base.slotColors[fallbackIdx % base.slotColors.length];
        };

        const resolveColor = (color: string, fallbackIdx: number = 0) => {
            const darkIdx = DARK_TOKENS.slotColors.indexOf(color);
            if (darkIdx !== -1) {
                return base.slotColors[darkIdx];
            }
            const lightIdx = LIGHT_TOKENS.slotColors.indexOf(color);
            if (lightIdx !== -1) {
                return base.slotColors[lightIdx];
            }
            if (color.startsWith('#')) return color;
            return base.slotColors[fallbackIdx % base.slotColors.length];
        };

        return {
            theme,
            ...base,
            getSlotColor,
            resolveColor,
        };
    }, [theme]);

    return tokens;
};
