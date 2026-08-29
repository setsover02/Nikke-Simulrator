import React, { useState } from 'react';
import { SlotState } from '../../types/simulator';
import { characterOptions } from '../../constants/characters';
import { Avatar } from '../../components/Avatar/Avatar';
import { Icon } from '../../components/Icon/Icon';
import { Font } from '../../components/Font';
import { Grid } from '../../components/Layout/Grid';
import { ButtonIcon } from '../../components/Button/ButtonIcon';
import { ELEMENT_ICONS, BURST_ICONS } from '../../constants/icons';
import styles from './SquadAvatarList.module.scss';

// _theme.scss의 Accent-Lime, Cyan, Blue, Purple, Orange 토큰
const ACCENT_COLORS = [
    'var(--Accent-Lime)',
    'var(--Accent-Cyan)',
    'var(--Accent-Blue)',
    'var(--Accent-Purple)',
    'var(--Accent-Orange)',
];

interface SquadAvatarListProps {
    slots: (SlotState | null)[];
    onUpdateSlot: (idx: number, patch: Partial<SlotState> | null) => void;
    onSwapSlots?: (fromIdx: number, toIdx: number) => void;
    onOpenDetailModal: (idx: number) => void;
}

export const SquadAvatarList: React.FC<SquadAvatarListProps> = ({
    slots,
    onUpdateSlot,
    onSwapSlots,
    onOpenDetailModal,
}) => {
    const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
    const [draggedSlotIdx, setDraggedSlotIdx] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, idx: number) => {
        const slot = slots[idx];
        if (!slot || !slot.char) return;

        setDraggedSlotIdx(idx);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'squad-slot', fromIdx: idx }));
        e.dataTransfer.setData('text/plain', slot.char.data.characterID);
    };

    const handleDragEnd = () => {
        setDraggedSlotIdx(null);
        setDragOverIdx(null);
    };

    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverIdx !== idx) {
            setDragOverIdx(idx);
        }
    };

    const handleDragLeave = (idx: number) => {
        if (dragOverIdx === idx) {
            setDragOverIdx(null);
        }
    };

    const handleDrop = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        setDragOverIdx(null);
        setDraggedSlotIdx(null);

        // 1. 스쿼드 슬롯 간 드래그 스왑(Swap) 검사
        const rawJson = e.dataTransfer.getData('application/json');
        if (rawJson) {
            try {
                const data = JSON.parse(rawJson);
                if (data.type === 'squad-slot' && typeof data.fromIdx === 'number') {
                    if (data.fromIdx !== idx) {
                        onSwapSlots?.(data.fromIdx, idx);
                    }
                    return;
                }
            } catch (err) {
                // Ignore JSON parse errors
            }
        }

        // 2. 캐릭터 패널에서 드래그해온 새 캐릭터 배치
        const charID = e.dataTransfer.getData('text/plain');
        if (!charID) return;

        const charOption = characterOptions.find(c => c.data.characterID === charID);
        if (!charOption) return;

        onUpdateSlot(idx, { char: charOption });
    };

    // Pad to 5 slots
    const displaySlots = [...slots];
    while (displaySlots.length < 5) displaySlots.push(null);

    return (
        <Grid columns={1} gap={0}>
            <div className={`pa-2 ${styles['squad-title-bar']}`}>
                <Font as="span" variant="subtitle" weight="bold">
                    스쿼드 편성 (5인)
                </Font>
            </div>

            <Grid columns="repeat(5, max-content)" justifyContent="start" className="pa-1">
                {displaySlots.slice(0, 5).map((slot, idx) => {
                    const isFilled = Boolean(slot && slot.char);
                    const charID = slot?.char?.data?.characterID;
                    const charName = slot?.char?.label || slot?.char?.data?.characterName || '';
                    const isDragOver = dragOverIdx === idx;
                    const isDragging = draggedSlotIdx === idx;
                    const badgeBgColor = ACCENT_COLORS[idx % 5];

                    const stats = slot?.char?.data?.stats;
                    const burstLevel = stats?.burstLevel;
                    const elementStr = stats?.element || '';
                    const elemIconUrl = ELEMENT_ICONS[elementStr === '전기' ? '전격' : elementStr];
                    const burstIconUrl = burstLevel ? BURST_ICONS[burstLevel] : null;

                    return (
                        <div key={idx} className={`${styles['squad-item']}`}>
                            <div
                                className={[
                                    styles['squad-card'],
                                    isFilled ? styles.filled : styles.empty,
                                    isDragOver ? styles['drag-over'] : '',
                                    isDragging ? styles.dragging : '',
                                ].filter(Boolean).join(' ')}
                                draggable={isFilled}
                                onDragStart={(e) => isFilled && handleDragStart(e, idx)}
                                onDragEnd={handleDragEnd}
                                onClick={() => onOpenDetailModal(idx)}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDragLeave={() => handleDragLeave(idx)}
                                onDrop={(e) => handleDrop(e, idx)}
                                title={isFilled ? `${charName} (드래그하여 자리 이동 / 클릭하여 상세 설정)` : `슬롯 ${idx + 1} 캐릭터 배치`}
                            >
                                {/* 1~5번 숫자 및 Accent-Lime부터 5가지 순차적 배지 배경색 */}
                                <div
                                    className={styles['slot-badge']}
                                    style={{ backgroundColor: badgeBgColor }}
                                >
                                    {idx + 1}
                                </div>

                                {/* 우측 상단 속성 및 버스트 배지 */}
                                {isFilled && (
                                    <div className={styles['badge-group']}>
                                        {elemIconUrl && (
                                            <div className={styles['badge-item']}>
                                                <img src={elemIconUrl} alt={elementStr} className={styles['badge-icon']} />
                                            </div>
                                        )}
                                        {burstIconUrl && (
                                            <div className={styles['badge-item']}>
                                                <img src={burstIconUrl} alt={`Burst ${burstLevel}`} className={styles['badge-icon']} />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {isFilled && charID ? (
                                    <Avatar
                                        charId={charID}
                                        alt={charName}
                                        ratio="1:1"
                                        className={styles['avatar-image']}
                                    />
                                ) : (
                                    <Icon name="add" className={styles['empty-icon']} />
                                )}

                                {isFilled && (
                                    <ButtonIcon
                                        icon="close"
                                        size="xsmall"
                                        variant="assistive"
                                        className={styles['remove-button']}
                                        title="슬롯 해제"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onUpdateSlot(idx, null);
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </Grid>
        </Grid >
    );
};

export default SquadAvatarList;
