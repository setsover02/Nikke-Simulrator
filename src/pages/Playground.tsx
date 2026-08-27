import React, { useState, useRef } from 'react';
import { Button } from '../components/Button/Button';
import { ButtonIcon } from '../components/Button/ButtonIcon';
import { ButtonIconToggle } from '../components/Button/ButtonIconToggle';
import { ButtonToggle } from '../components/Button/ButtonToggle';
import { TextField } from '../components/TextField';
import { Dropdown } from '../components/Dropdown';
import { Autocomplete } from '../components/Autocomplete';
import { Field } from '../components/Field';
import { Menu, MenuItem, MenuDivider } from '../components/Menu';
import { Font } from '../components/Font';
import { Ripple } from '../components/Ripple/Ripple';
import { Avatar } from '../components/Avatar/Avatar';
import { Switch } from '../components/Switch/Switch';
import { Chip } from '../components/Chip/Chip';
import { Card } from '../components/Card/Card';
import { Container } from '../components/Layout/Container';
import { Grid } from '../components/Layout/Grid';
import { Modal } from '../components/Modal';
import { avatarMap } from '../constants/characters';

const sizes: ('large' | 'default' | 'small' | 'xsmall')[] = ['large', 'default', 'small', 'xsmall'];
const variants: ('primary' | 'assistive')[] = ['primary', 'assistive'];

const DemoBox: React.FC<{ children: React.ReactNode; label: string; width?: string | number }> = ({ children, label, width }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: width || 'auto', minWidth: width || 'auto', flexShrink: 0 }}>
        {children}
        <Font variant="caption-2" color="inactive" style={{ textAlign: 'center', whiteSpace: 'pre-wrap', lineHeight: '1.2' }}>
            {label}
        </Font>
    </div>
);

const TableRow: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-2 pb-2" style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--Divider-Normal)', minWidth: 0 }}>
        <div style={{ width: '140px', flexShrink: 0 }}>
            <Font as="h3" variant="caption-1" weight="semibold" style={{ textTransform: 'capitalize', color: 'var(--Font-Default)' }}>{title}</Font>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
            {children}
        </div>
    </div>
);

const getSvgIcon = (size: string) => {
    if (size === 'large') return 'burst-1';
    if (size === 'default') return 'weapon-AR';
    return 'class-atk';
};

const StatefulButtonIconToggle: React.FC<any> = ({ selected: initialSelected = false, disabled, ...props }) => {
    const [selected, setSelected] = useState(initialSelected);
    return <ButtonIconToggle {...props} selected={selected} disabled={disabled} onClick={disabled ? undefined : () => setSelected(!selected)} />;
};

const StatefulButtonToggle: React.FC<any> = ({ selected: initialSelected = false, disabled, ...props }) => {
    const [selected, setSelected] = useState(initialSelected);
    return <ButtonToggle {...props} selected={selected} disabled={disabled} onClick={disabled ? undefined : () => setSelected(!selected)} />;
};

const StatefulChipDemo: React.FC = () => {
    const [stage, setStage] = useState(0);
    const maxStage = 10;

    const getLabel = (s: number) => {
        if (s === 0) return '명함';
        if (s <= 3) return `★${s}`;
        return `★+${s - 3}`;
    };

    const getVariant = (s: number): 'default' | 'limit-break' | 'core' => {
        if (s === 0) return 'default';
        if (s <= 3) return 'limit-break';
        return 'core';
    };

    return (
        <Chip
            variant={getVariant(stage)}
            onClick={() => setStage(prev => (prev >= maxStage ? 0 : prev + 1))}
            onContextMenu={(e) => {
                e.preventDefault();
                setStage(prev => (prev <= 0 ? maxStage : prev - 1));
            }}
            title="좌클릭: 단계 증가 / 우클릭: 단계 감소"
        >
            {getLabel(stage)}
        </Chip>
    );
};

// Sample Options for Dropdown & Autocomplete
const DROPDOWN_SAMPLE_OPTIONS = [
    { value: 'elysion', label: '엘리시온', icon: 'shield', description: 'Elysion Industry' },
    { value: 'missilis', label: '미실리스', icon: 'bolt', description: 'Missilis Industry' },
    { value: 'tetra', label: '테트라', icon: 'star', description: 'Tetra Line' },
    { value: 'pilgrim', label: '필그림', icon: 'workspace_premium', description: 'Pilgrim Goddess' },
    { value: 'abnormal', label: '어브노말', icon: 'military_tech', description: 'Abnormal Collaboration' },
];

const AUTOCOMPLETE_SAMPLE_OPTIONS = [
    { value: 'alice', label: '앨리스', subLabel: '테트라 · RL · 화력형', icon: 'star' },
    { value: 'red_hood', label: '레드 후드', subLabel: '필그림 · SR · 화력형', icon: 'favorite' },
    { value: 'crown', label: '크라운', subLabel: '필그림 · AR · 방어형', icon: 'shield' },
    { value: 'liter', label: '리타', subLabel: '미실리스 · SMG · 지원형', icon: 'build' },
    { value: 'naga', label: '나가', subLabel: '미실리스 · SG · 지원형', icon: 'bolt' },
    { value: 'tia', label: '티아', subLabel: '미실리스 · RL · 방어형', icon: 'security' },
    { value: 'cinderella', label: '신데렐라', subLabel: '필그림 · RL · 화력형', icon: 'diamond' },
];

// A-Z 순서로 관리되는 섹션 네비게이션 목록
const SECTIONS = [
    { id: 'autocomplete', name: 'Autocomplete' },
    { id: 'avatar', name: 'Avatar' },
    { id: 'button-block', name: 'Button (Block)' },
    { id: 'button-icon', name: 'Button (Icon)' },
    { id: 'button-text', name: 'Button (Text)' },
    { id: 'button-toggle', name: 'Button Toggle' },
    { id: 'button-icon-toggle', name: 'Button Toggle (Icon)' },
    { id: 'chip', name: 'Chip' },
    { id: 'container', name: 'Container' },
    { id: 'dropdown', name: 'Dropdown' },
    { id: 'field', name: 'Field' },
    { id: 'grid', name: 'Grid' },
    { id: 'menu', name: 'Menu' },
    { id: 'modal', name: 'Modal' },
    { id: 'ripple', name: 'Ripple' },
    { id: 'switch', name: 'Switch' },
    { id: 'textfield', name: 'TextField' },
];

const Playground: React.FC = () => {
    const [isBasicModalOpen, setIsBasicModalOpen] = useState(false);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [selectedAvatarName, setSelectedAvatarName] = useState<string>('');
    const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>('');

    // State for interactive Dropdown & Autocomplete demos
    const [dropdownVal, setDropdownVal] = useState<string | number>('tetra');
    const [autocompleteVal, setAutocompleteVal] = useState<string | number | null>('alice');

    // State for Menu demos
    const [isBtnMenuOpen, setIsBtnMenuOpen] = useState(false);
    const btnAnchorRef = useRef<HTMLButtonElement>(null);

    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const actionAnchorRef = useRef<HTMLButtonElement>(null);

    const [isTopMenuOpen, setIsTopMenuOpen] = useState(false);
    const topAnchorRef = useRef<HTMLButtonElement>(null);

    return (
        <Grid columns="220px 1fr" alignItems="start">
            {/* 좌측: 컴포넌트 리스트 사이드 Sticky 메뉴 Grid */}
            <Grid columns={1} style={{ position: 'sticky', top: '24px' }}>
                <Card className="pa-3">
                    <Font as="h1" variant="subtitle" weight="bold" className="mb-3" style={{ display: 'block' }}>
                        UI Playground
                    </Font>

                    <Grid columns={1} gap={0}>
                        {SECTIONS.map(({ id, name }) => (
                            <div key={id} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })} style={{ cursor: 'pointer' }}>
                                <Font
                                    variant="caption-1"
                                    color="muted"
                                    weight="medium"
                                    className="py-1 px-2"
                                    style={{ borderRadius: '8px', display: 'block', transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'var(--Interact-Hover)';
                                        e.currentTarget.style.color = 'var(--Font-Default)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = 'var(--Font-Muted)';
                                    }}
                                >
                                    {name}
                                </Font>
                            </div>
                        ))}
                    </Grid>
                </Card>
            </Grid>

            {/* 우측: 컴포넌트들 카드 리스트 Grid */}
            <Grid columns={1}>

                {/* 1. Autocomplete */}
                <Card as="section" id="autocomplete" className="pa-3">
                    <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Autocomplete</Font>
                    <div className="pt-2" style={{ borderTop: '1px solid var(--Divider-Normal)' }}>
                        <TableRow title="Types & Sizes">
                            <DemoBox label="Basic Search" width={220}>
                                <Autocomplete
                                    options={AUTOCOMPLETE_SAMPLE_OPTIONS}
                                    value={autocompleteVal ?? undefined}
                                    onChange={(v) => setAutocompleteVal(v)}
                                    placeholder="니케 검색..."
                                />
                            </DemoBox>
                            <DemoBox label="Small Size" width={200}>
                                <Autocomplete
                                    size="small"
                                    label="니케"
                                    options={AUTOCOMPLETE_SAMPLE_OPTIONS}
                                    placeholder="검색..."
                                    defaultValue="red_hood"
                                />
                            </DemoBox>
                            <DemoBox label="FreeSolo" width={220}>
                                <Autocomplete
                                    freeSolo
                                    options={AUTOCOMPLETE_SAMPLE_OPTIONS}
                                    placeholder="직접 입력/선택"
                                />
                            </DemoBox>
                        </TableRow>
                        <TableRow title="States">
                            <DemoBox label="Disabled" width={220}>
                                <Autocomplete
                                    disabled
                                    options={AUTOCOMPLETE_SAMPLE_OPTIONS}
                                    defaultValue="crown"
                                />
                            </DemoBox>
                            <DemoBox label="Error State" width={220}>
                                <Autocomplete
                                    error
                                    options={AUTOCOMPLETE_SAMPLE_OPTIONS}
                                    defaultValue="cinderella"
                                    hintText="유효하지 않은 값입니다."
                                />
                            </DemoBox>
                        </TableRow>
                    </div>
                </Card>

                {/* 2. Avatar */}
                <Card as="section" id="avatar" className="pa-3">
                    <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Avatar</Font>
                    <div className="pt-2" style={{ borderTop: '1px solid var(--Divider-Normal)' }}>
                        <TableRow title="Sizes & Fallback">
                            <DemoBox label="Default (40px)">
                                <Avatar src={Object.values(avatarMap)[0] || ''} />
                            </DemoBox>
                            <DemoBox label="Custom Size (64px)">
                                <Avatar src={Object.values(avatarMap)[0] || ''} size={64} />
                            </DemoBox>
                            <DemoBox label="Custom Size (24px)">
                                <Avatar src={Object.values(avatarMap)[0] || ''} size={24} />
                            </DemoBox>
                            <DemoBox label="Fallback (No Image)">
                                <Avatar src="" size={40} />
                            </DemoBox>
                        </TableRow>
                    </div>
                </Card>

                {/* 3. Button (Block) */}
                <Card as="section" id="button-block" className="pa-3">
                    <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Button (Block)</Font>
                    <div className="pt-2" style={{ borderTop: '1px solid var(--Divider-Normal)' }}>
                        {variants.map(variant => (
                            <React.Fragment key={`block-${variant}`}>
                                <TableRow title={`${variant}`}>
                                    {sizes.map(size => (
                                        <DemoBox key={size} label={size}>
                                            <Button type="block" variant={variant} size={size}>Button</Button>
                                        </DemoBox>
                                    ))}
                                </TableRow>
                                <TableRow title={`${variant} (Disabled)`}>
                                    {sizes.map(size => (
                                        <DemoBox key={`disabled-${size}`} label={size}>
                                            <Button type="block" variant={variant} size={size} disabled>Button</Button>
                                        </DemoBox>
                                    ))}
                                </TableRow>
                                <TableRow title={`${variant} (Icons)`}>
                                    <DemoBox label="left icon">
                                        <Button type="block" leftIcon="search" variant={variant} size="default">Button</Button>
                                    </DemoBox>
                                    <DemoBox label="right icon">
                                        <Button type="block" rightIcon="arrow_forward" variant={variant} size="default">Button</Button>
                                    </DemoBox>
                                    <DemoBox label="both icons">
                                        <Button type="block" leftIcon="settings" rightIcon="chevron_right" variant={variant} size="default">Button</Button>
                                    </DemoBox>
                                </TableRow>
                            </React.Fragment>
                        ))}
                    </div>
                </Card>

                {/* 4. Button (Icon) */}
                <Card as="section" id="button-icon" className="pa-3">
                    <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Button (Icon)</Font>
                    <div className="pt-2" style={{ borderTop: '1px solid var(--Divider-Normal)' }}>
                        {variants.map(variant => (
                            <React.Fragment key={`icon-${variant}`}>
                                <TableRow title={`${variant}`}>
                                    {sizes.map(size => (
                                        <DemoBox key={size} label={size}>
                                            <ButtonIcon icon="settings" variant={variant} size={size} onClick={() => { }} />
                                        </DemoBox>
                                    ))}
                                </TableRow>
                                <TableRow title={`${variant} (Disabled)`}>
                                    {sizes.map(size => (
                                        <DemoBox key={`disabled-${size}`} label={size}>
                                            <ButtonIcon icon="settings" variant={variant} size={size} disabled onClick={() => { }} />
                                        </DemoBox>
                                    ))}
                                </TableRow>
                                <TableRow title={`${variant} (SVG)`}>
                                    {sizes.map(size => (
                                        <DemoBox key={`svg-${size}`} label={size}>
                                            <ButtonIcon svgIcon={getSvgIcon(size)} variant={variant} size={size} onClick={() => { }} />
                                        </DemoBox>
                                    ))}
                                </TableRow>
                            </React.Fragment>
                        ))}
                    </div>
                </Card>

                {/* 5. Button (Text) */}
                <Card as="section" id="button-text" className="pa-3">
                    <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Button (Text)</Font>
                    <div className="pt-2" style={{ borderTop: '1px solid var(--Divider-Normal)' }}>
                        {variants.map(variant => (
                            <React.Fragment key={`text-${variant}`}>
                                <TableRow title={`${variant}`}>
                                    {sizes.map(size => (
                                        <DemoBox key={size} label={size}>
                                            <Button type="text" variant={variant} size={size}>Button</Button>
                                        </DemoBox>
                                    ))}
                                </TableRow>
                                <TableRow title={`${variant} (Disabled)`}>
                                    {sizes.map(size => (
                                        <DemoBox key={`disabled-${size}`} label={size}>
                                            <Button type="text" variant={variant} size={size} disabled>Button</Button>
                                        </DemoBox>
                                    ))}
                                </TableRow>
                                <TableRow title={`${variant} (Icons)`}>
                                    <DemoBox label="left icon">
                                        <Button type="text" leftIcon="search" variant={variant} size="default">Button</Button>
                                    </DemoBox>
                                    <DemoBox label="right icon">
                                        <Button type="text" rightIcon="arrow_forward" variant={variant} size="default">Button</Button>
                                    </DemoBox>
                                    <DemoBox label="both icons">
                                        <Button type="text" leftIcon="settings" rightIcon="chevron_right" variant={variant} size="default">Button</Button>
                                    </DemoBox>
                                </TableRow>
                            </React.Fragment>
                        ))}
                    </div>
                </Card>

                {/* 6. Button Toggle */}
                <Card as="section" id="button-toggle" className="pa-3">
                    <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Button Toggle</Font>
                    <div className="pt-2" style={{ borderTop: '1px solid var(--Divider-Normal)' }}>
                        <TableRow title="Default Size">
                            <DemoBox label="Default">
                                <StatefulButtonToggle>Toggle</StatefulButtonToggle>
                            </DemoBox>
                            <DemoBox label="Selected">
                                <StatefulButtonToggle selected>Toggle</StatefulButtonToggle>
                            </DemoBox>
                            <DemoBox label="Disabled">
                                <StatefulButtonToggle disabled>Toggle</StatefulButtonToggle>
                            </DemoBox>
                            <DemoBox label="Disabled Selected">
                                <StatefulButtonToggle selected disabled>Toggle</StatefulButtonToggle>
                            </DemoBox>
                        </TableRow>
                        <TableRow title="Icons & Sizes">
                            <DemoBox label="Large">
                                <StatefulButtonToggle size="large" leftIcon="settings">Toggle</StatefulButtonToggle>
                            </DemoBox>
                            <DemoBox label="Small">
                                <StatefulButtonToggle size="small" rightIcon="arrow_forward">Toggle</StatefulButtonToggle>
                            </DemoBox>
                        </TableRow>
                    </div>
                </Card>

                {/* 7. Button Toggle (Icon) */}
                <Card as="section" id="button-icon-toggle" className="pa-3">
                    <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Button Toggle (Icon)</Font>
                    <div className="pt-2" style={{ borderTop: '1px solid var(--Divider-Normal)' }}>
                        <TableRow title="Default Size">
                            <DemoBox label="Default">
                                <StatefulButtonIconToggle icon="settings" />
                            </DemoBox>
                            <DemoBox label="Selected">
                                <StatefulButtonIconToggle icon="settings" selected />
                            </DemoBox>
                            <DemoBox label="Disabled">
                                <StatefulButtonIconToggle icon="settings" disabled />
                            </DemoBox>
                            <DemoBox label="Disabled Selected">
                                <StatefulButtonIconToggle icon="settings" selected disabled />
                            </DemoBox>
                        </TableRow>
                        <TableRow title="Large Size (SVG)">
                            <DemoBox label="Default">
                                <StatefulButtonIconToggle svgIcon="burst-1" size="large" />
                            </DemoBox>
                            <DemoBox label="Selected">
                                <StatefulButtonIconToggle svgIcon="burst-1" size="large" selected />
                            </DemoBox>
                        </TableRow>
                        <TableRow title="Superior Codes">
                            <DemoBox label="Electric">
                                <StatefulButtonIconToggle svgIcon="code-zeus" element="electric" />
                            </DemoBox>
                            <DemoBox label="Water">
                                <StatefulButtonIconToggle svgIcon="code-psid" element="water" />
                            </DemoBox>
                            <DemoBox label="Iron">
                                <StatefulButtonIconToggle svgIcon="code-dmtr" element="iron" />
                            </DemoBox>
                            <DemoBox label="Wind">
                                <StatefulButtonIconToggle svgIcon="code-anmi" element="wind" />
                            </DemoBox>
                            <DemoBox label="Fire">
                                <StatefulButtonIconToggle svgIcon="code-hsta" element="fire" />
                            </DemoBox>
                        </TableRow>
                    </div>
                </Card>

                {/* 8. Chip */}
                <Card as="section" id="chip" className="pa-3">
                    <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Chip</Font>
                    <div className="pt-2" style={{ borderTop: '1px solid var(--Divider-Normal)' }}>
                        <TableRow title="Variants">
                            <DemoBox label="Default (명함/기본)">
                                <Chip variant="default">명함</Chip>
                            </DemoBox>
                            <DemoBox label="Limit Break (돌파)">
                                <Chip variant="limit-break">★3</Chip>
                            </DemoBox>
                            <DemoBox label="Core (코어 강화)">
                                <Chip variant="core">★+7</Chip>
                            </DemoBox>
                        </TableRow>

                        <TableRow title="Collection">
                            <DemoBox label="None">
                                <Chip variant="default">없음</Chip>
                            </DemoBox>
                            <DemoBox label="R">
                                <Chip variant="limit-break">R</Chip>
                            </DemoBox>
                            <DemoBox label="SR">
                                <Chip variant="limit-break">SR</Chip>
                            </DemoBox>
                            <DemoBox label="SSR (애장품)">
                                <Chip variant="core">애장품</Chip>
                            </DemoBox>
                        </TableRow>

                        <TableRow title="Badge / Count">
                            <DemoBox label="Count Badge">
                                <Chip variant="limit-break" disabled>197</Chip>
                            </DemoBox>
                            <DemoBox label="Core Badge">
                                <Chip variant="core" disabled>MAX</Chip>
                            </DemoBox>
                        </TableRow>

                        <TableRow title="Interactive Demo">
                            <DemoBox label="좌클릭(+) / 우클릭(-)">
                                <StatefulChipDemo />
                            </DemoBox>
                        </TableRow>

                        <TableRow title="Disabled States">
                            <DemoBox label="Default Disabled">
                                <Chip variant="default" disabled>명함</Chip>
                            </DemoBox>
                            <DemoBox label="Limit Break Disabled">
                                <Chip variant="limit-break" disabled>★3</Chip>
                            </DemoBox>
                            <DemoBox label="Core Disabled">
                                <Chip variant="core" disabled>★+7</Chip>
                            </DemoBox>
                        </TableRow>
                    </div>
                </Card>

                {/* 9. Container */}
                <Card as="section" id="container" className="pa-3">
                    <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Container</Font>
                    <div className="pt-2" style={{ borderTop: '1px solid var(--Divider-Normal)' }}>
                        <Font variant="caption-1" color="muted" className="mb-3" style={{ display: 'block' }}>
                            페이지의 총 너비(max-width)와 반응형 좌우 여백(gutters)을 결정하며 Grid와 Card를 감싸는 뼈대 역할을 합니다.
                        </Font>

                        <div style={{ backgroundColor: 'var(--Background-Body)', padding: '16px', borderRadius: '12px', border: '1px dashed var(--Divider-Normal)' }}>
                            <Font variant="caption-2" weight="bold" color="muted" className="mb-2" style={{ display: 'block' }}>
                                Container (maxWidth="lg" - 1280px, with Grid & Card)
                            </Font>
                            <Container maxWidth="lg" disableGutters>
                                <Grid templateColumns="8fr 4fr">
                                    <Card className="pa-3" style={{ textAlign: 'center', backgroundColor: 'var(--Interactive-Assistive)' }}>
                                        <Font variant="caption-1" weight="bold">Main Content (8fr)</Font>
                                    </Card>
                                    <Card className="pa-3" style={{ textAlign: 'center', backgroundColor: 'var(--Interactive-Assistive)' }}>
                                        <Font variant="caption-1" weight="bold">Sidebar (4fr)</Font>
                                    </Card>
                                </Grid>
                            </Container>
                        </div>
                    </div>
                </Card>

                {/* 10. Dropdown */}
                <Card as="section" id="dropdown" className="pa-3">
                    <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Dropdown</Font>
                    <div className="pt-2" style={{ borderTop: '1px solid var(--Divider-Normal)' }}>
                        <TableRow title="Types & Sizes">
                            <DemoBox label="Basic (with Icons)" width={220}>
                                <Dropdown
                                    options={DROPDOWN_SAMPLE_OPTIONS}
                                    value={dropdownVal}
                                    onChange={(v) => setDropdownVal(v)}
                                />
                            </DemoBox>
                            <DemoBox label="Small Size" width={200}>
                                <Dropdown
                                    size="small"
                                    label="제조사"
                                    options={DROPDOWN_SAMPLE_OPTIONS}
                                    defaultValue="elysion"
                                />
                            </DemoBox>
                            <DemoBox label="Clearable" width={220}>
                                <Dropdown
                                    clearable
                                    options={DROPDOWN_SAMPLE_OPTIONS}
                                    placeholder="제조사 선택"
                                    onClear={() => console.log('Dropdown cleared')}
                                />
                            </DemoBox>
                        </TableRow>
                        <TableRow title="States">
                            <DemoBox label="Disabled" width={220}>
                                <Dropdown
                                    disabled
                                    options={DROPDOWN_SAMPLE_OPTIONS}
                                    defaultValue="pilgrim"
                                />
                            </DemoBox>
                            <DemoBox label="Error State" width={220}>
                                <Dropdown
                                    error
                                    options={DROPDOWN_SAMPLE_OPTIONS}
                                    defaultValue="abnormal"
                                    hintText="선택이 필요합니다."
                                />
                            </DemoBox>
                        </TableRow>
                    </div>
                </Card>

                {/* 11. Field */}
                <Card as="section" id="field" className="pa-3">
                    <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Field (Base Container)</Font>
                    <div className="pt-2" style={{ borderTop: '1px solid var(--Divider-Normal)' }}>
                        <TableRow title="Custom Content">
                            <DemoBox label="With Chip Inside" width={220}>
                                <Field label="소장품" leftIcon="grade">
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'flex-end' }}>
                                        <Chip variant="core">애장품 ★+7</Chip>
                                    </div>
                                </Field>
                            </DemoBox>
                            <DemoBox label="Small with Button" width={240}>
                                <Field
                                    size="small"
                                    label="스쿼드"
                                    rightElement={<Button size="xsmall" variant="primary">적용</Button>}
                                >
                                    <Font variant="caption-1" color="muted" style={{ width: '100%', textAlign: 'right' }}>
                                        5/5 슬롯
                                    </Font>
                                </Field>
                            </DemoBox>
                        </TableRow>
                        <TableRow title="States">
                            <DemoBox label="Readonly State" width={220}>
                                <Field label="체력" readOnly>
                                    <Font variant="body" style={{ width: '100%', textAlign: 'right' }}>1,234,567</Font>
                                </Field>
                            </DemoBox>
                            <DemoBox label="Disabled State" width={220}>
                                <Field label="공격력" disabled>
                                    <Font variant="body" style={{ width: '100%', textAlign: 'right' }}>98,765</Font>
                                </Field>
                            </DemoBox>
                        </TableRow>
                    </div>
                </Card>

                {/* 12. Grid */}
                <Card as="section" id="grid" className="pa-3">
                    <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Grid</Font>
                    <div className="pt-2" style={{ borderTop: '1px solid var(--Divider-Normal)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <Font variant="caption-1" weight="semibold" color="muted" className="mb-2" style={{ display: 'block' }}>
                                12 Column Equal Grid (columns={12})
                            </Font>
                            <Grid columns={12}>
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} style={{
                                        backgroundColor: 'var(--Primary-20)',
                                        color: 'var(--Primary-100)',
                                        border: '1px solid var(--Primary-40)',
                                        borderRadius: '6px',
                                        padding: '8px 0',
                                        textAlign: 'center',
                                        fontSize: '12px',
                                        fontWeight: 600
                                    }}>
                                        {i + 1}
                                    </div>
                                ))}
                            </Grid>
                        </div>
                    </div>
                </Card>

                {/* 13. Menu */}
                <Card as="section" id="menu" className="pa-3">
                    <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Menu (Popover / Floating)</Font>
                    <div className="pt-2" style={{ borderTop: '1px solid var(--Divider-Normal)' }}>
                        <TableRow title="Button Triggers">
                            <DemoBox label="Match Button Width (Auto)" width={220}>
                                <Button
                                    ref={btnAnchorRef}
                                    variant="primary"
                                    rightIcon="keyboard_arrow_down"
                                    onClick={() => setIsBtnMenuOpen(prev => !prev)}
                                >
                                    메뉴 선택
                                </Button>
                                <Menu
                                    isOpen={isBtnMenuOpen}
                                    onClose={() => setIsBtnMenuOpen(false)}
                                    anchorRef={btnAnchorRef}
                                >
                                    <MenuItem
                                        icon="edit"
                                        label="수정하기"
                                        onClick={() => setIsBtnMenuOpen(false)}
                                    />
                                    <MenuItem
                                        icon="content_copy"
                                        label="복사하기"
                                        onClick={() => setIsBtnMenuOpen(false)}
                                    />
                                    <MenuDivider />
                                    <MenuItem
                                        icon="delete"
                                        label="삭제하기"
                                        disabled
                                        description="권한이 없습니다."
                                    />
                                </Menu>
                            </DemoBox>

                            <DemoBox label="Icon Button Action Menu">
                                <ButtonIcon
                                    ref={actionAnchorRef}
                                    icon="more_vert"
                                    variant="assistive"
                                    onClick={() => setIsActionMenuOpen(prev => !prev)}
                                />
                                <Menu
                                    isOpen={isActionMenuOpen}
                                    onClose={() => setIsActionMenuOpen(false)}
                                    anchorRef={actionAnchorRef}
                                    matchAnchorWidth={false}
                                    width={180}
                                >
                                    <MenuItem
                                        icon="share"
                                        label="공유"
                                        onClick={() => setIsActionMenuOpen(false)}
                                    />
                                    <MenuItem
                                        icon="download"
                                        label="다운로드"
                                        onClick={() => setIsActionMenuOpen(false)}
                                    />
                                    <MenuDivider />
                                    <MenuItem
                                        icon="settings"
                                        label="환경설정"
                                        onClick={() => setIsActionMenuOpen(false)}
                                    />
                                </Menu>
                            </DemoBox>
                        </TableRow>

                        <TableRow title="Smart Detection">
                            <DemoBox label="Auto Viewport Detection">
                                <Button
                                    ref={topAnchorRef}
                                    variant="assistive"
                                    size="small"
                                    onClick={() => setIsTopMenuOpen(prev => !prev)}
                                >
                                    스마트 위치 감지 팝업
                                </Button>
                                <Menu
                                    isOpen={isTopMenuOpen}
                                    onClose={() => setIsTopMenuOpen(false)}
                                    anchorRef={topAnchorRef}
                                    matchAnchorWidth={false}
                                    width={220}
                                >
                                    <MenuItem icon="arrow_upward" label="상단 공간 감지" description="하단 공간 부족 시 자동 상단 팝업" />
                                    <MenuItem icon="arrow_downward" label="하단 공간 감지" description="기본적으로 하단 팝업" />
                                    <MenuItem icon="fullscreen" label="최상위 Portal 렌더링" description="컨테이너에 잘리지 않음" />
                                </Menu>
                            </DemoBox>
                        </TableRow>
                    </div>
                </Card>

                {/* 14. Modal */}
                <Card as="section" id="modal" className="pa-3">
                    <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Modal</Font>
                    <div className="pt-2" style={{ borderTop: '1px solid var(--Divider-Normal)' }}>
                        <TableRow title="Triggers">
                            <DemoBox label="Basic Trigger">
                                <Button onClick={() => setIsBasicModalOpen(true)}>
                                    모달 열기 (기본)
                                </Button>
                            </DemoBox>

                            <DemoBox label="Avatar Trigger">
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {Object.entries(avatarMap).slice(0, 3).map(([id, url]) => (
                                        <div
                                            key={id}
                                            onClick={() => {
                                                setSelectedAvatarName(id);
                                                setSelectedAvatarUrl(url);
                                                setIsAvatarModalOpen(true);
                                            }}
                                            style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <Avatar src={url} alt={id} size="default" />
                                        </div>
                                    ))}
                                </div>
                            </DemoBox>
                        </TableRow>
                    </div>

                    <Modal
                        isOpen={isBasicModalOpen}
                        onClose={() => setIsBasicModalOpen(false)}
                        title="기본 모달 제목"
                        footer={
                            <>
                                <Button variant="assistive" size="small" onClick={() => setIsBasicModalOpen(false)}>
                                    취소
                                </Button>
                                <Button size="small" onClick={() => setIsBasicModalOpen(false)}>
                                    확인
                                </Button>
                            </>
                        }
                    >
                        <Font variant="body" className="mb-2" style={{ display: 'block' }}>
                            모달 본문 내용입니다. Card 컴포넌트를 기반으로 구성되어 있으며, 오버레이 배경색은 var(--Background-Overlay) 토큰이 적용됩니다.
                        </Font>
                    </Modal>

                    <Modal
                        isOpen={isAvatarModalOpen}
                        onClose={() => setIsAvatarModalOpen(false)}
                        title={`${selectedAvatarName} 캐릭터 정보`}
                        footer={
                            <Button size="small" onClick={() => setIsAvatarModalOpen(false)}>
                                닫기
                            </Button>
                        }
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
                            {selectedAvatarUrl && (
                                <Avatar src={selectedAvatarUrl} alt={selectedAvatarName} size="large" style={{ width: '96px', height: '96px' }} />
                            )}
                            <Font variant="subtitle" weight="bold">
                                {selectedAvatarName}
                            </Font>
                        </div>
                    </Modal>
                </Card>

                {/* 15. Ripple */}
                <Card as="section" id="ripple" className="pa-3">
                    <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Ripple Effect</Font>
                    <div className="pt-2" style={{ borderTop: '1px solid var(--Divider-Normal)' }}>
                        <TableRow title="Interactive Elements">
                            <div style={{
                                width: '180px',
                                height: '70px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'var(--Background-Card)',
                                border: '1px solid var(--Divider-Normal)',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                color: 'var(--Primary-100)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <Font variant="body" weight="bold">Click Me (Box)</Font>
                                <Ripple />
                            </div>

                            <div style={{
                                width: '70px',
                                height: '70px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'var(--Accent-Pink)',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                color: 'var(--Static-White)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <Font variant="caption-1" weight="bold">Circle</Font>
                                <Ripple />
                            </div>
                        </TableRow>
                    </div>
                </Card>

                {/* 16. Switch */}
                <Card as="section" id="switch" className="pa-3">
                    <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Switch</Font>
                    <div className="pt-2" style={{ borderTop: '1px solid var(--Divider-Normal)' }}>
                        <TableRow title="States">
                            <DemoBox label="Default">
                                <Switch />
                            </DemoBox>
                            <DemoBox label="Checked">
                                <Switch checked readOnly />
                            </DemoBox>
                            <DemoBox label="Disabled">
                                <Switch disabled />
                            </DemoBox>
                            <DemoBox label="Disabled Checked">
                                <Switch disabled checked readOnly />
                            </DemoBox>
                        </TableRow>
                    </div>
                </Card>

                {/* 17. TextField */}
                <Card as="section" id="textfield" className="pa-3">
                    <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>TextField</Font>
                    <div className="pt-2" style={{ borderTop: '1px solid var(--Divider-Normal)' }}>
                        <TableRow title="Types & Sizes">
                            <DemoBox label="Basic" width={200}>
                                <TextField placeholder="Enter text..." />
                            </DemoBox>
                            <DemoBox label="Small Size" width={180}>
                                <TextField size="small" suffix="%" leftIcon="search" placeholder="Search..." defaultValue="Small input" onClear={() => console.log('Clear')} />
                            </DemoBox>
                            <DemoBox label="With Suffix" width={180}>
                                <TextField suffix="초" placeholder="Value" defaultValue="15" />
                            </DemoBox>
                            <DemoBox label="With Icon & Label" width={200}>
                                <TextField leftIcon="favorite" label="라벨" placeholder="Value" />
                            </DemoBox>
                        </TableRow>

                        <TableRow title="States & Features">
                            <DemoBox label="Full (Clear & Button)" width={260}>
                                <TextField
                                    leftIcon="favorite"
                                    label="Label"
                                    placeholder="Value"
                                    defaultValue="Example Text"
                                    onClear={() => console.log('Clear')}
                                    rightElement={<Button size="xsmall">Button</Button>}
                                    hintText="Hint text is here."
                                    maxLength={10}
                                    showCount
                                />
                            </DemoBox>
                            <DemoBox label="Error State" width={240}>
                                <TextField
                                    error
                                    leftIcon="favorite"
                                    label="Label"
                                    placeholder="Value"
                                    defaultValue="Error Text"
                                    onClear={() => console.log('Clear')}
                                    hintText="Error message goes here."
                                    maxLength={10}
                                    showCount
                                />
                            </DemoBox>
                            <DemoBox label="Disabled" width={180}>
                                <TextField disabled defaultValue="Disabled text" />
                            </DemoBox>
                            <DemoBox label="Readonly" width={180}>
                                <TextField readOnly defaultValue="Readonly text" />
                            </DemoBox>
                        </TableRow>
                    </div>
                </Card>

            </Grid>
        </Grid>
    );
};

export default Playground;
