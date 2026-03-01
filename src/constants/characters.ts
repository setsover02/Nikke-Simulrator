// 캐릭터 데이터 상수

import LittleMermaidData from '../character/LittleMermaid.json';
import AriaData from '../character/Aria.json';
import CrowData from '../character/Crow.json';
import LittleMermaidAvatar from '../assets/avatar/LittleMermaid.webp';
import AriaAvatar from '../assets/avatar/Aria.webp';

export const avatarMap: Record<string, string> = {
    LittleMermaid: LittleMermaidAvatar,
    Aria: AriaAvatar,
    Crow: '', // 아바타가 없으면 CharacterSlot에서 이름 텍스트로 폴백됨
};

export const characterOptions = [
    { value: 'little_mermaid', label: LittleMermaidData.characterName, data: LittleMermaidData },
    { value: 'aria', label: AriaData.characterName, data: AriaData },
    { value: 'crow', label: CrowData.characterName, data: CrowData },
];

export const SLOT_COLORS = ['#1890ff', '#ff7a45', '#52c41a', '#b37feb', '#ff7ec8'];
