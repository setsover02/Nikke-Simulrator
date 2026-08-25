import React, { useState } from 'react';
import { Button } from '../components/Button/Button';
import { ButtonIcon } from '../components/Button/ButtonIcon';
import { ButtonIconToggle } from '../components/Button/ButtonIconToggle';
import { ButtonToggle } from '../components/Button/ButtonToggle';
import { Textfield } from '../components/Textfield/Textfield';
import { Font } from '../components/Font';
import { Ripple } from '../components/Ripple/Ripple';
import { Avatar } from '../components/Avatar/Avatar';
import { Switch } from '../components/Switch/Switch';
import { Card } from '../components/Card/Card';
import { Container } from '../components/Layout/Container';
import { Grid } from '../components/Layout/Grid';
import { Modal } from '../components/Modal';
import { avatarMap } from '../constants/characters';

const sizes: ('large' | 'default' | 'small' | 'xsmall')[] = ['large', 'default', 'small', 'xsmall'];
const variants: ('primary' | 'assistive')[] = ['primary', 'assistive'];

const DemoBox: React.FC<{ children: React.ReactNode; label: string }> = ({ children, label }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        {children}
        <Font variant="caption-2" color="inactive" style={{ textAlign: 'center', whiteSpace: 'pre-wrap', lineHeight: '1.2' }}>
            {label}
        </Font>
    </div>
);

const TableRow: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-2 pb-2" style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--Divider-Normal)' }}>
        <div style={{ width: '140px', flexShrink: 0 }}>
            <Font as="h3" variant="caption-1" weight="semibold" style={{ textTransform: 'capitalize', color: 'var(--Font-Default)' }}>{title}</Font>
        </div>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', flex: 1 }}>
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

// A-Z 순서로 관리되는 섹션 네비게이션 목록 (새 컴포넌트 추가 시에도 알파벳 순으로 정렬하여 추가)
const SECTIONS = [
    { id: 'avatar', name: 'Avatar' },
    { id: 'button-block', name: 'Button (Block)' },
    { id: 'button-icon', name: 'Button (Icon)' },
    { id: 'button-text', name: 'Button (Text)' },
    { id: 'button-toggle', name: 'Button Toggle' },
    { id: 'button-icon-toggle', name: 'Button Toggle (Icon)' },
    { id: 'container', name: 'Container' },
    { id: 'grid', name: 'Grid' },
    { id: 'modal', name: 'Modal' },
    { id: 'ripple', name: 'Ripple' },
    { id: 'switch', name: 'Switch' },
    { id: 'textfield', name: 'Textfield' },
];

const Playground: React.FC = () => {
    const [isBasicModalOpen, setIsBasicModalOpen] = useState(false);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [selectedAvatarName, setSelectedAvatarName] = useState<string>('');
    const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>('');

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

                {/* 우측: 컴포넌트들 카드 리스트 Grid (중첩 Grid) */}
                <Grid columns={1}>

                    {/* 1. Avatar */}
                    <Card as="section" id="avatar" className="pa-3">
                        <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Avatar</Font>
                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', borderTop: '1px solid var(--Divider-Normal)', paddingTop: '16px' }}>
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
                        </div>
                    </Card>

                    {/* 2. Button (Block) */}
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

                    {/* 3. Button (Icon) */}
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

                    {/* 4. Button (Text) */}
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

                    {/* 5. Button Toggle */}
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

                    {/* 6. Button Toggle (Icon) */}
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
                            <TableRow title="Large Size (Custom SVG)">
                                <DemoBox label="Default">
                                    <StatefulButtonIconToggle svgIcon="burst-1" size="large" />
                                </DemoBox>
                                <DemoBox label="Selected">
                                    <StatefulButtonIconToggle svgIcon="burst-1" size="large" selected />
                                </DemoBox>
                            </TableRow>
                            <TableRow title="Elements (Superior Codes)">
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

                    {/* 7. Container */}
                    <Card as="section" id="container" className="pa-3">
                        <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Container</Font>
                        <div className="pt-2" style={{ borderTop: '1px solid var(--Divider-Normal)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <Font variant="caption-1" color="muted">
                                페이지의 총 너비(max-width)와 반응형 좌우 여백(gutters)을 결정하며 Grid와 Card를 감싸는 뼈대 역할을 합니다.
                            </Font>

                            {/* maxWidth="lg" (1280px) with Grid */}
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

                            {/* maxWidth="md" (960px) */}
                            <div style={{ backgroundColor: 'var(--Background-Body)', padding: '16px', borderRadius: '12px', border: '1px dashed var(--Divider-Normal)' }}>
                                <Font variant="caption-2" weight="bold" color="muted" className="mb-2" style={{ display: 'block' }}>
                                    Container (maxWidth="md" - 960px)
                                </Font>
                                <Container maxWidth="md" disableGutters>
                                    <Card className="pa-3" style={{ textAlign: 'center', backgroundColor: 'var(--Interactive-Assistive)' }}>
                                        <Font variant="caption-1" weight="bold">Medium Container (Centered)</Font>
                                    </Card>
                                </Container>
                            </div>

                            {/* maxWidth="sm" (600px) */}
                            <div style={{ backgroundColor: 'var(--Background-Body)', padding: '16px', borderRadius: '12px', border: '1px dashed var(--Divider-Normal)' }}>
                                <Font variant="caption-2" weight="bold" color="muted" className="mb-2" style={{ display: 'block' }}>
                                    Container (maxWidth="sm" - 600px)
                                </Font>
                                <Container maxWidth="sm" disableGutters>
                                    <Card className="pa-3" style={{ textAlign: 'center', backgroundColor: 'var(--Interactive-Assistive)' }}>
                                        <Font variant="caption-1" weight="bold">Small Container (Centered)</Font>
                                    </Card>
                                </Container>
                            </div>
                        </div>
                    </Card>

                    {/* 8. Grid */}
                    <Card as="section" id="grid" className="pa-3">
                        <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Grid</Font>
                        <div className="pt-2" style={{ borderTop: '1px solid var(--Divider-Normal)', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                            {/* 12 columns equal split */}
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

                            {/* Common column layouts */}
                            <div>
                                <Font variant="caption-1" weight="semibold" color="muted" className="mb-2" style={{ display: 'block' }}>
                                    Common Layouts (columns={2}, columns={3}, templateColumns="8fr 4fr")
                                </Font>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <Grid columns={2}>
                                        <Card className="pa-2" style={{ textAlign: 'center', backgroundColor: 'var(--Interactive-Assistive)' }}>
                                            <Font variant="caption-1" weight="bold">columns={2} (1/2)</Font>
                                        </Card>
                                        <Card className="pa-2" style={{ textAlign: 'center', backgroundColor: 'var(--Interactive-Assistive)' }}>
                                            <Font variant="caption-1" weight="bold">columns={2} (2/2)</Font>
                                        </Card>
                                    </Grid>

                                    <Grid columns={3}>
                                        <Card className="pa-2" style={{ textAlign: 'center', backgroundColor: 'var(--Interactive-Assistive)' }}>
                                            <Font variant="caption-1" weight="bold">columns={3} (1/3)</Font>
                                        </Card>
                                        <Card className="pa-2" style={{ textAlign: 'center', backgroundColor: 'var(--Interactive-Assistive)' }}>
                                            <Font variant="caption-1" weight="bold">columns={3} (2/3)</Font>
                                        </Card>
                                        <Card className="pa-2" style={{ textAlign: 'center', backgroundColor: 'var(--Interactive-Assistive)' }}>
                                            <Font variant="caption-1" weight="bold">columns={3} (3/3)</Font>
                                        </Card>
                                    </Grid>

                                    <Grid templateColumns="8fr 4fr">
                                        <Card className="pa-2" style={{ textAlign: 'center', backgroundColor: 'var(--Interactive-Assistive)' }}>
                                            <Font variant="caption-1" weight="bold">templateColumns="8fr 4fr" (Main)</Font>
                                        </Card>
                                        <Card className="pa-2" style={{ textAlign: 'center', backgroundColor: 'var(--Interactive-Assistive)' }}>
                                            <Font variant="caption-1" weight="bold">templateColumns="8fr 4fr" (Sidebar)</Font>
                                        </Card>
                                    </Grid>
                                </div>
                            </div>

                            {/* Fixed Pixel Columns & Mixed Layouts */}
                            <div>
                                <Font variant="caption-1" weight="semibold" color="muted" className="mb-2" style={{ display: 'block' }}>
                                    Fixed Pixel Columns (e.g. columns="200px 1fr" or "180px 1fr 240px")
                                </Font>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <Grid columns="200px 1fr">
                                        <Card className="pa-2" style={{ textAlign: 'center', backgroundColor: 'var(--Interactive-Assistive)' }}>
                                            <Font variant="caption-1" weight="bold">200px Fixed</Font>
                                        </Card>
                                        <Card className="pa-2" style={{ textAlign: 'center', backgroundColor: 'var(--Interactive-Assistive)' }}>
                                            <Font variant="caption-1" weight="bold">1fr Fluid (Remaining)</Font>
                                        </Card>
                                    </Grid>

                                    <Grid columns="180px 1fr 240px">
                                        <Card className="pa-2" style={{ textAlign: 'center', backgroundColor: 'var(--Interactive-Assistive)' }}>
                                            <Font variant="caption-1" weight="bold">180px Fixed</Font>
                                        </Card>
                                        <Card className="pa-2" style={{ textAlign: 'center', backgroundColor: 'var(--Interactive-Assistive)' }}>
                                            <Font variant="caption-1" weight="bold">1fr Main</Font>
                                        </Card>
                                        <Card className="pa-2" style={{ textAlign: 'center', backgroundColor: 'var(--Interactive-Assistive)' }}>
                                            <Font variant="caption-1" weight="bold">240px Fixed</Font>
                                        </Card>
                                    </Grid>
                                </div>
                            </div>

                            {/* templateColumns & templateRows Custom Templates */}
                            <div>
                                <Font variant="caption-1" weight="semibold" color="muted" className="mb-2" style={{ display: 'block' }}>
                                    Custom CSS Grid Templates (templateColumns="1fr 1fr", templateRows="auto 1fr auto")
                                </Font>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <Grid templateColumns="1fr 1fr">
                                        <Card className="pa-2" style={{ textAlign: 'center', backgroundColor: 'var(--Interactive-Assistive)' }}>
                                            <Font variant="caption-1" weight="bold">templateColumns="1fr 1fr" (Left)</Font>
                                        </Card>
                                        <Card className="pa-2" style={{ textAlign: 'center', backgroundColor: 'var(--Interactive-Assistive)' }}>
                                            <Font variant="caption-1" weight="bold">templateColumns="1fr 1fr" (Right)</Font>
                                        </Card>
                                    </Grid>

                                    <Grid templateRows="auto 1fr auto" style={{ height: '180px' }}>
                                        <Card className="pa-2" style={{ textAlign: 'center', backgroundColor: 'var(--Interactive-Assistive)' }}>
                                            <Font variant="caption-1" weight="bold">Header (auto)</Font>
                                        </Card>
                                        <Card className="pa-2" style={{ textAlign: 'center', backgroundColor: 'var(--Interactive-Assistive)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Font variant="caption-1" weight="bold">Content Body (1fr)</Font>
                                        </Card>
                                        <Card className="pa-2" style={{ textAlign: 'center', backgroundColor: 'var(--Interactive-Assistive)' }}>
                                            <Font variant="caption-1" weight="bold">Footer (auto)</Font>
                                        </Card>
                                    </Grid>
                                </div>
                            </div>

                        </div>
                    </Card>

                    {/* 9. Modal */}
                    <Card as="section" id="modal" className="pa-3">
                        <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Modal (Responsive Pop-up & Bottom Sheet)</Font>
                        <Font variant="caption-1" color="muted" className="mb-3" style={{ display: 'block' }}>
                            데스크톱 및 태블릿 화면에서는 중앙 정렬 팝업 모달로, 모바일 화면(&lt;600px)에서는 하단 팝업(Bottom Sheet)으로 자동 전환되는 반응형 모달 컴포넌트입니다.
                        </Font>

                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', borderTop: '1px solid var(--Divider-Normal)', paddingTop: '16px' }}>
                            <DemoBox label="Basic Trigger">
                                <Button onClick={() => setIsBasicModalOpen(true)}>
                                    모달 열기 (기본)
                                </Button>
                            </DemoBox>

                            <DemoBox label="Avatar Trigger (Select Nikke)">
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {Object.entries(avatarMap).slice(0, 4).map(([id, url]) => (
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
                                            <Avatar src={url} alt={id} size="large" />
                                        </div>
                                    ))}
                                </div>
                            </DemoBox>
                        </div>

                        {/* Basic Modal */}
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
                            <Font variant="caption-1" color="muted">
                                모바일 화면에서는 하단 슬라이드 업 Bottom Sheet로 변환됩니다. 브라우저 창 크기를 줄여 테스트해보세요!
                            </Font>
                        </Modal>

                        {/* Avatar Modal */}
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
                                <Font variant="caption-1" color="muted">
                                    아바타를 클릭하여 선택한 캐릭터의 상세 정보를 모달 팝업으로 확인할 수 있습니다.
                                </Font>
                            </div>
                        </Modal>
                    </Card>

                    {/* 10. Ripple */}
                    <Card as="section" id="ripple" className="pa-3">
                        <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Ripple Effect on any Element</Font>
                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                            <div style={{
                                width: '200px',
                                height: '100px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'var(--Background-Card)',
                                border: '1px solid var(--Divider-Normal)',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                color: 'var(--Primary-100)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <Font variant="body" weight="bold">Click Me (div)</Font>
                                <Ripple />
                            </div>

                            <div style={{
                                width: '100px',
                                height: '100px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'var(--Accent-Pink)',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                color: 'var(--Static-White)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <Font variant="body" weight="bold">Circle</Font>
                                <Ripple />
                            </div>
                        </div>
                    </Card>

                    {/* 10. Switch */}
                    <Card as="section" id="switch" className="pa-3">
                        <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Switch</Font>
                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', borderTop: '1px solid var(--Divider-Normal)', paddingTop: '16px' }}>
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
                        </div>
                    </Card>

                    {/* 11. Textfield */}
                    <Card as="section" id="textfield" className="pa-3">
                        <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Textfield</Font>
                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', borderTop: '1px solid var(--Divider-Normal)', paddingTop: '16px' }}>

                            <div style={{ width: '320px' }}>
                                <DemoBox label="Basic">
                                    <Textfield placeholder="Enter text..." />
                                </DemoBox>
                            </div>

                            <div style={{ width: '320px' }}>
                                <DemoBox label="Small Size">
                                    <Textfield size="small" suffix="%" leftIcon="search" placeholder="Search..." defaultValue="Small input" onClear={() => console.log('Clear')} />
                                </DemoBox>
                            </div>

                            <div style={{ width: '320px' }}>
                                <DemoBox label="With Left Icon & Label">
                                    <Textfield leftIcon="favorite" label="라벨 이름" placeholder="Value" />
                                </DemoBox>
                            </div>

                            <div style={{ width: '320px' }}>
                                <DemoBox label="With Suffix">
                                    <Textfield suffix="초" placeholder="Value" />
                                </DemoBox>
                            </div>

                            <div style={{ width: '400px' }}>
                                <DemoBox label="Full Example (with state)">
                                    <Textfield
                                        leftIcon="favorite"
                                        label="Label"
                                        placeholder="Value"
                                        suffix="초"
                                        defaultValue="Example Text"
                                        onClear={() => console.log('Clear')}
                                        rightElement={<Button size="small">Button</Button>}
                                        hintText="Hint text is here."
                                        maxLength={10}
                                        showCount
                                    />
                                </DemoBox>
                            </div>

                            <div style={{ width: '400px' }}>
                                <DemoBox label="Error State">
                                    <Textfield
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
                            </div>
                        </div>
                    </Card>

                </Grid>
            </Grid>
    );
};

export default Playground;
