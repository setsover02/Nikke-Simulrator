import React from 'react';
import Select from 'react-select';
import { SlotState } from '../types/simulator';
import { characterOptions, avatarMap, SLOT_COLORS } from '../constants/characters';

const inputStyle: React.CSSProperties = {
    width: '75px', padding: '5px 7px', fontSize: '13px',
    background: '#1a1a2e', color: '#e0e0e0',
    border: '1px solid #444', borderRadius: '4px', textAlign: 'right',
};

const labelStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: '3px',
    fontSize: '12px', color: '#bbb',
};

interface Props {
    slot: SlotState;
    index: number;
    canRemove: boolean;
    onUpdate: (patch: Partial<SlotState>) => void;
    onRemove: () => void;
}

const CharacterSlot: React.FC<Props> = ({ slot, index, canRemove, onUpdate, onRemove }) => {
    const color = SLOT_COLORS[index % SLOT_COLORS.length];
    const avatar = avatarMap[slot.char.data.characterID];

    return (
        <div style={{
            display: 'flex', gap: '16px', alignItems: 'center',
            padding: '12px 16px', background: '#1e1e2e',
            borderRadius: '8px', border: `1px solid ${color}44`,
        }}>
            {/* 슬롯 번호 배지 */}
            <div style={{
                minWidth: '24px', height: '24px', borderRadius: '50%',
                background: color, color: '#000',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 'bold',
            }}>{index + 1}</div>

            {/* 아바타 */}
            {avatar ? (
                <img
                    src={avatar}
                    alt={slot.char.data.characterName}
                    style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '6px' }}
                />
            ) : (
                <div style={{
                    width: '52px', height: '52px', borderRadius: '6px',
                    background: '#2a2a3e', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#888', fontSize: '10px', textAlign: 'center',
                }}>{slot.char.data.characterName}</div>
            )}

            {/* 캐릭터 선택 드롭다운 */}
            <div style={{ width: '220px' }}>
                <Select
                    options={characterOptions}
                    value={slot.char}
                    onChange={(sel: any) => onUpdate({
                        char: sel,
                        customHP: String(sel.data.stats.hp || ''),
                        customATK: String(sel.data.stats.atk || ''),
                        customDEF: String(sel.data.stats.defense || '')
                    })}
                    styles={{
                        control: (b) => ({ ...b, background: '#1a1a2e', borderColor: '#444' }),
                        menu: (b) => ({ ...b, background: '#1a1a2e' }),
                        option: (b, s) => ({ ...b, background: s.isFocused ? '#2a2a3e' : '#1a1a2e', color: '#e0e0e0' }),
                        singleValue: (b) => ({ ...b, color: '#e0e0e0' }),
                    }}
                />
            </div>

            {/* 기본 스탯 입력 */}
            <label style={labelStyle}>
                HP
                <input type="number" value={slot.customHP}
                    onChange={e => onUpdate({ customHP: e.target.value })}
                    style={inputStyle} placeholder="0" />
            </label>
            <label style={labelStyle}>
                ATK
                <input type="number" value={slot.customATK}
                    onChange={e => onUpdate({ customATK: e.target.value })}
                    style={inputStyle} placeholder="0" />
            </label>
            <label style={labelStyle}>
                DEF
                <input type="number" value={slot.customDEF}
                    onChange={e => onUpdate({ customDEF: e.target.value })}
                    style={inputStyle} placeholder="0" />
            </label>

            {/* 소장품 입력 */}
            <label style={labelStyle}>
                소장품
                <div style={{ display: 'flex', gap: '4px' }}>
                    <select
                        value={slot.collectionGrade}
                        onChange={e => onUpdate({ collectionGrade: e.target.value as any })}
                        style={{ ...inputStyle, width: '50px', padding: '0 2px' }}
                    >
                        <option value="None">무</option>
                        <option value="R">R</option>
                        <option value="SR">SR</option>
                    </select>
                    <input
                        type="number"
                        min="0" max="15"
                        value={slot.collectionLevel}
                        onChange={e => onUpdate({ collectionLevel: e.target.value })}
                        style={{ ...inputStyle, width: '40px' }}
                        placeholder="Lv"
                        disabled={slot.collectionGrade === 'None'}
                    />
                </div>
            </label>

            {/* 장비 입력 */}
            <label style={labelStyle}>
                ATK %
                <input type="number" value={slot.equipATK}
                    onChange={e => onUpdate({ equipATK: e.target.value })}
                    style={inputStyle} placeholder="0" />
            </label>
            <label style={labelStyle}>
                우월코드 %
                <input type="number" value={slot.equipWeakPoint}
                    onChange={e => onUpdate({ equipWeakPoint: e.target.value })}
                    style={inputStyle} placeholder="0" />
            </label>
            <label style={labelStyle}>
                장탄수 %
                <input type="number" value={slot.equipAmmo}
                    onChange={e => onUpdate({ equipAmmo: e.target.value })}
                    style={inputStyle} placeholder="0" />
            </label>

            {/* 슬롯 제거 버튼 */}
            {canRemove && (
                <button onClick={onRemove} style={{
                    marginLeft: 'auto', padding: '4px 10px', fontSize: '14px',
                    background: '#3a1a1a', color: '#ff7875', border: '1px solid #5a2020',
                    borderRadius: '4px', cursor: 'pointer',
                }}>✕</button>
            )}
        </div>
    );
};

export default CharacterSlot;
