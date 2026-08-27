import React, { useState, useMemo } from 'react';
import { characterOptions } from '../../constants/characters';
import { TextField } from '../../components/TextField';
import { ButtonIconToggle } from '../../components/Button/ButtonIconToggle';
import { Avatar } from '../../components/Avatar/Avatar';
import { Font } from '../../components/Font';
import { Grid } from '../../components/Layout/Grid';
import { getCustomIconUrl } from '../../utils/iconRegistry';
import styles from './CharacterSelectionPanel.module.scss';

const BURST_OPTIONS = [
    { value: 1, label: 'I', iconName: 'burst-1' },
    { value: 2, label: 'II', iconName: 'burst-2' },
    { value: 3, label: 'III', iconName: 'burst-3' },
    { value: 0, label: 'All', iconName: 'burst-A' },
];

const ELEMENT_OPTIONS = [
    { value: '전격', label: '전격', iconName: 'code-zeus', element: 'electric' as const },
    { value: '풍압', label: '풍압', iconName: 'code-anmi', element: 'wind' as const },
    { value: '수냉', label: '수냉', iconName: 'code-psid', element: 'water' as const },
    { value: '철갑', label: '철갑', iconName: 'code-dmtr', element: 'iron' as const },
    { value: '작열', label: '작열', iconName: 'code-hsta', element: 'fire' as const },
];

const ELEMENT_ICON_MAP: Record<string, { iconName: string; element: 'electric' | 'wind' | 'water' | 'iron' | 'fire' }> = {
    '전격': { iconName: 'code-zeus', element: 'electric' },
    '전기': { iconName: 'code-zeus', element: 'electric' },
    '풍압': { iconName: 'code-anmi', element: 'wind' },
    '수냉': { iconName: 'code-psid', element: 'water' },
    '철갑': { iconName: 'code-dmtr', element: 'iron' },
    '작열': { iconName: 'code-hsta', element: 'fire' },
};

interface CharacterSelectionPanelProps {
    onSelectCharacter: (charOption: typeof characterOptions[0]) => void;
    currentSquadCharIds?: string[];
}

function getCharRarity(char: typeof characterOptions[0]): 'SSR' | 'SR' | 'R' {
    const rawRarity = char.data?.stats?.rarity || char.data?.rarity;
    if (rawRarity) {
        const uppercase = String(rawRarity).toUpperCase();
        if (uppercase.includes('SSR')) return 'SSR';
        if (uppercase.includes('SR')) return 'SR';
        if (uppercase.includes('R')) return 'R';
    }
    const val = (char.value || '').toUpperCase();
    if (val.includes('_SSR_') || val.includes('-SSR-') || val.startsWith('E_SSR_') || val.startsWith('T_SSR_') || val.startsWith('M_SSR_') || val.startsWith('P_SSR_') || val.startsWith('A_SSR_')) return 'SSR';
    if (val.includes('_SR_') || val.includes('-SR-') || val.startsWith('E_SR_') || val.startsWith('T_SR_') || val.startsWith('M_SR_') || val.startsWith('P_SR_') || val.startsWith('A_SR_')) return 'SR';
    if (val.includes('_R_') || val.includes('-R-') || val.startsWith('E_R_') || val.startsWith('T_R_') || val.startsWith('M_R_') || val.startsWith('P_R_') || val.startsWith('A_R_')) return 'R';

    return 'SSR';
}

export const CharacterSelectionPanel: React.FC<CharacterSelectionPanelProps> = ({
    onSelectCharacter,
    currentSquadCharIds = []
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBursts, setSelectedBursts] = useState<number[]>([]);
    const [selectedElements, setSelectedElements] = useState<string[]>([]);

    const handleToggleBurst = (burst: number) => {
        setSelectedBursts(prev =>
            prev.includes(burst) ? prev.filter(b => b !== burst) : [...prev, burst]
        );
    };

    const handleToggleElement = (elementName: string) => {
        setSelectedElements(prev =>
            prev.includes(elementName) ? prev.filter(e => e !== elementName) : [...prev, elementName]
        );
    };

    const handleDragStart = (e: React.DragEvent, charID: string) => {
        e.dataTransfer.setData('text/plain', charID);
        e.dataTransfer.effectAllowed = 'copyMove';
    };

    // Filter character options based on search query, burst level, element
    const filteredCharacters = useMemo(() => {
        return characterOptions.filter(char => {
            const stats = char.data?.stats || {};
            const charName = char.label || char.data?.characterName || '';
            const charID = char.data?.characterID || '';

            // Search query filter (matches character name or ID)
            if (searchQuery.trim()) {
                const query = searchQuery.trim().toLowerCase();
                const matchName = charName.toLowerCase().includes(query);
                const matchID = charID.toLowerCase().includes(query);
                if (!matchName && !matchID) return false;
            }

            // Burst filter
            if (selectedBursts.length > 0) {
                const rawBurst = stats.burstLevel;
                let burstLevel = Number(rawBurst);
                if (rawBurst === 'A' || rawBurst === 'All' || rawBurst === 'all' || rawBurst === 0 || rawBurst === '0') {
                    burstLevel = 0;
                }
                if (!selectedBursts.includes(burstLevel)) return false;
            }

            // Element filter
            if (selectedElements.length > 0) {
                const elem = stats.element || '';
                // normalize '전기' and '전격'
                const normalizedElem = elem === '전기' ? '전격' : elem;
                const isMatch = selectedElements.some(sel => (sel === '전격' ? (normalizedElem === '전격') : sel === elem));
                if (!isMatch) return false;
            }

            return true;
        });
    }, [searchQuery, selectedBursts, selectedElements]);

    // Group filtered characters by rarity: SSR -> SR -> R
    const groupedCharacters = useMemo(() => {
        const ssr: typeof filteredCharacters = [];
        const sr: typeof filteredCharacters = [];
        const r: typeof filteredCharacters = [];

        filteredCharacters.forEach(char => {
            const rarity = getCharRarity(char);
            if (rarity === 'SSR') ssr.push(char);
            else if (rarity === 'SR') sr.push(char);
            else r.push(char);
        });

        return [
            { rarity: 'SSR', list: ssr },
            { rarity: 'SR', list: sr },
            { rarity: 'R', list: r },
        ].filter(group => group.list.length > 0);
    }, [filteredCharacters]);

    return (
        <Grid columns={1} gap={0}>
            {/* 1. Search Bar */}
            <Grid columns={1} className="px-2 pt-2 pb-1" >
                <TextField
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="니케 검색"
                    leftIcon="search"
                    onClear={() => setSearchQuery('')}
                    align="left"
                    size="default"
                />
            </Grid>
            {/* 2. Filter Buttons Row */}
            <Grid columns="repeat(auto-fill, minmax(32px, 1fr))" alignItems="center" gap={1} className="px-2 py-1">
                {/* Burst Filters */}
                {BURST_OPTIONS.map(opt => (
                    <ButtonIconToggle
                        key={opt.value}
                        svgIcon={opt.iconName}
                        selected={selectedBursts.includes(opt.value)}
                        onClick={() => handleToggleBurst(opt.value)}
                        size="small"
                    />
                ))}

                <div className={styles['filter-divider']} />

                {/* Element Filters */}
                {ELEMENT_OPTIONS.map(opt => (
                    <ButtonIconToggle
                        key={opt.value}
                        svgIcon={opt.iconName}
                        element={opt.element}
                        selected={selectedElements.includes(opt.value)}
                        onClick={() => handleToggleElement(opt.value)}
                        size="small"
                    />
                ))}
            </Grid>

            {/* 3. Avatar Grid grouped by Rarity (SSR -> SR -> R) */}
            {groupedCharacters.length > 0 ? (
                <div className={styles['avatar-grid-wrapper']}>
                    {groupedCharacters.map(group => (
                        <div key={group.rarity} className={styles['rarity-section']}>
                            {/* Rarity Subheading */}
                            <div className={styles['rarity-header']}>
                                <Font as="span" variant="caption-1" weight="bold" className={styles['rarity-title']}>
                                    {group.rarity}
                                </Font>
                                <Font as="span" variant="caption-2" color="muted" className={styles['rarity-count']}>
                                    ({group.list.length})
                                </Font>
                            </div>

                            {/* 4-Column Grid for this Rarity */}
                            <div className={styles['avatar-grid']}>
                                {group.list.map(char => {
                                    const charID = char.data?.characterID;
                                    const stats = char.data?.stats || {};
                                    const rawBurst = stats.burstLevel;
                                    const burstLevel = rawBurst;
                                    const elementStr = stats.element || '';

                                    const elemInfo = ELEMENT_ICON_MAP[elementStr];
                                    const burstIconName = (rawBurst === 'A' || rawBurst === 'All' || rawBurst === 'all' || rawBurst === 0 || rawBurst === '0')
                                        ? 'burst-A'
                                        : rawBurst
                                            ? `burst-${rawBurst}`
                                            : null;
                                    const elemIconUrl = elemInfo ? getCustomIconUrl(elemInfo.iconName) : null;
                                    const burstIconUrl = burstIconName ? getCustomIconUrl(burstIconName) : null;

                                    const inSquad = currentSquadCharIds.includes(charID);

                                    return (
                                        <div
                                            key={char.value}
                                            className={`${styles['avatar-card']} ${inSquad ? styles['in-squad'] : ''}`}
                                            onClick={() => onSelectCharacter(char)}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, charID)}
                                            title={`${char.label} (${elementStr}, Burst ${burstLevel})`}
                                        >
                                            <Avatar
                                                charId={charID}
                                                alt={char.label}
                                                ratio="1:1"
                                                className={styles['avatar-image']}
                                            >
                                                {char.label.substring(0, 2)}
                                            </Avatar>

                                            {/* Overlay Badges: Top Left (Element), Top Right (Burst) */}
                                            <div className={styles['badge-container']}>
                                                {elemIconUrl ? (
                                                    <div className={`${styles['badge-item']} ${styles['badge-item--element']}`}>
                                                        <img src={elemIconUrl} alt={elementStr} className={styles['badge-icon']} />
                                                    </div>
                                                ) : null}

                                                {burstIconUrl ? (
                                                    <div className={`${styles['badge-item']} ${styles['badge-item--burst']}`}>
                                                        <img src={burstIconUrl} alt={`Burst ${burstLevel}`} className={styles['badge-icon']} />
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <Font as="div" variant="caption-1" color="muted" className={styles['empty-results']}>
                    검색 조건에 일치하는 캐릭터가 없습니다.
                </Font>
            )}
        </Grid>
    );
};

export default CharacterSelectionPanel;

