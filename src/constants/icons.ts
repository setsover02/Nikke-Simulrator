import iconAnmi from '../assets/icon/code-anmi.svg';
import iconDmtr from '../assets/icon/code-dmtr.svg';
import iconHsta from '../assets/icon/code-hsta.svg';
import iconPsid from '../assets/icon/code-psid.svg';
import iconZeus from '../assets/icon/code-zeus.svg';

import iconBurst1 from '../assets/icon/burst-1.svg';
import iconBurst2 from '../assets/icon/burst-2.svg';
import iconBurst3 from '../assets/icon/burst-3.svg';

import iconClassAtk from '../assets/icon/class-atk.svg';
import iconClassDef from '../assets/icon/class-def.svg';
import iconClassSup from '../assets/icon/class-sup.svg';

import iconCompanyAbnormal from '../assets/icon/company-abnormal.svg';
import iconCompanyElysion from '../assets/icon/company-elysion.svg';
import iconCompanyMissilis from '../assets/icon/company-missilis.svg';
import iconCompanyPilgrim from '../assets/icon/company-pilgrim.svg';
import iconCompanyTetra from '../assets/icon/company-tetra.svg';

import iconWeaponAR from '../assets/icon/weapon-AR.svg';
import iconWeaponMG from '../assets/icon/weapon-MG.svg';
import iconWeaponRL from '../assets/icon/weapon-RL.svg';
import iconWeaponSG from '../assets/icon/weapon-SG.svg';
import iconWeaponSMG from '../assets/icon/weapon-SMG.svg';
import iconWeaponSR from '../assets/icon/weapon-SR.svg';

export const ELEMENT_ICONS: Record<string, string> = {
    '풍압': iconAnmi,
    '철갑': iconDmtr,
    '작열': iconHsta,
    '수냉': iconPsid,
    '전격': iconZeus,
};

export const BURST_ICONS: Record<string | number, string> = {
    1: iconBurst1,
    2: iconBurst2,
    3: iconBurst3,
};

export const CLASS_ICONS: Record<string, string> = {
    '화력형': iconClassAtk,
    '방어형': iconClassDef,
    '지원형': iconClassSup,
};

export const COMPANY_ICONS: Record<string, string> = {
    'Abnormal': iconCompanyAbnormal,
    'Elysion': iconCompanyElysion,
    'Missilis': iconCompanyMissilis,
    'Pilgrim': iconCompanyPilgrim,
    'Tetra': iconCompanyTetra,
};

export const WEAPON_ICONS: Record<string, string> = {
    'AR': iconWeaponAR,
    'MG': iconWeaponMG,
    'RL': iconWeaponRL,
    'SG': iconWeaponSG,
    'SMG': iconWeaponSMG,
    'SR': iconWeaponSR,
};
