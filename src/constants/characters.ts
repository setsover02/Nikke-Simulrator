// 캐릭터 데이터 상수

import LittleMermaidData from '../character/LittleMermaid.json';
import AriaData from '../character/Aria.json';
import CrowData from '../character/Crow.json';
import iDollSunData from '../character/iDollSun.json';
import SoldierOWData from '../character/SoldierOW.json';
import VestiData from '../character/Vesti.json';

import LittleMermaidAvatar from '../assets/avatar/LittleMermaid.webp';
import AriaAvatar from '../assets/avatar/Aria.webp';
import CrowAvatar from '../assets/avatar/Crow.webp';
import iDollSunAvatar from '../assets/avatar/iDollSun.webp';
import SoldierOWAvatar from '../assets/avatar/SoldierOW.webp';
import VestiAvatar from '../assets/avatar/Vesti.webp';

export const avatarMap: Record<string, string> = {
    LittleMermaid: LittleMermaidAvatar,
    Aria: AriaAvatar,
    Crow: CrowAvatar,
    iDollSun: iDollSunAvatar,
    SoldierOW: SoldierOWAvatar,
    Vesti: VestiAvatar,
};

export const characterOptions = [
    { value: 'little_mermaid', label: LittleMermaidData.characterName, data: LittleMermaidData },
    { value: 'aria', label: AriaData.characterName, data: AriaData },
    { value: 'crow', label: CrowData.characterName, data: CrowData },
    { value: 'idoll_sun', label: iDollSunData.characterName, data: iDollSunData },
    { value: 'soldier_ow', label: SoldierOWData.characterName, data: SoldierOWData },
    { value: 'vesti', label: VestiData.characterName, data: VestiData },
];

export const SLOT_COLORS = ['#1890ff', '#ff7a45', '#52c41a', '#b37feb', '#ff7ec8'];
