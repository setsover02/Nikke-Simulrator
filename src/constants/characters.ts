// 캐릭터 데이터 상수

import LittleMermaidData from '../character/ssr_p_little_mermaid.json';
import AriaData from '../character/ssr_t_aria.json';
import CrowData from '../character/ssr_m_crow.json';
import iDollSunData from '../character/r_t_idoll_sun.json';
import SoldierOWData from '../character/r_e_soldier_ow.json';
import VestiData from '../character/ssr_e_vesti.json';
import Product08Data from '../character/r_m_product_08.json';
import Product23Data from '../character/r_m_product_23.json';

import LittleMermaidAvatar from '../assets/avatar/ssr_p_little_mermaid.webp';
import AriaAvatar from '../assets/avatar/ssr_t_aria.webp';
import CrowAvatar from '../assets/avatar/ssr_m_crow.webp';
import iDollSunAvatar from '../assets/avatar/r_t_idoll_sun.webp';
import SoldierOWAvatar from '../assets/avatar/r_e_soldier_ow.webp';
import VestiAvatar from '../assets/avatar/ssr_e_vesti.webp';
import Product08Avatar from '../assets/avatar/r_m_product_08.webp';
import Product23Avatar from '../assets/avatar/r_m_product_23.webp';

export const avatarMap: Record<string, string> = {
    LittleMermaid: LittleMermaidAvatar,
    Aria: AriaAvatar,
    Crow: CrowAvatar,
    iDollSun: iDollSunAvatar,
    SoldierOW: SoldierOWAvatar,
    Vesti: VestiAvatar,
    Product08: Product08Avatar,
    Product23: Product23Avatar,
};

export const characterOptions = [
    { value: 'little_mermaid', label: LittleMermaidData.characterName, data: LittleMermaidData },
    { value: 'aria', label: AriaData.characterName, data: AriaData },
    { value: 'crow', label: CrowData.characterName, data: CrowData },
    { value: 'idoll_sun', label: iDollSunData.characterName, data: iDollSunData },
    { value: 'soldier_ow', label: SoldierOWData.characterName, data: SoldierOWData },
    { value: 'vesti', label: VestiData.characterName, data: VestiData },
    { value: 'product_08', label: Product08Data.characterName, data: Product08Data },
    { value: 'product_23', label: Product23Data.characterName, data: Product23Data },
];

export const SLOT_COLORS = ['#1890ff', '#ff7a45', '#52c41a', '#b37feb', '#ff7ec8'];
