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

const Playground: React.FC = () => {
    return (
        <div className="pa-3 mx-auto" style={{ maxWidth: '1200px', display: 'flex', gap: '48px', alignItems: 'flex-start' }}>
            {/* 왼쪽 Sticky 메뉴 */}
            <div style={{ position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '8px', width: '200px', flexShrink: 0 }}>
                <Font as="h1" variant="subtitle" weight="bold" className="mb-2" style={{ display: 'block' }}>UI Playground</Font>

                {['Button (Block)', 'Button (Text)', 'Icon Buttons', 'Toggle Button (Icon)', 'Toggle Button', 'Ripple', 'Avatar', 'Textfield', 'Switch'].map((name, i) => {
                    const id = ['button-block', 'button-text', 'button-icon', 'button-icon-toggle', 'button-toggle', 'ripple', 'avatar', 'textfield', 'switch'][i];
                    return (
                        <div key={name} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })} style={{ cursor: 'pointer' }}>
                            <Font
                                variant="caption-1"
                                color="muted"
                                weight="medium"
                                className="py-1 px-2" style={{ borderRadius: '8px', display: 'block', transition: 'background-color 0.2s' }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--Interact-Hover)')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                                {name}
                            </Font>
                        </div>
                    );
                })}
            </div>

            {/* 우측 컴포넌트 리스트 */}
            <div style={{ flex: 1, minWidth: 0 }}>

                <Card as="section" id="button-block" className="mb-3 pa-3">
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

                <Card as="section" id="button-text" className="mb-3 pa-3">
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

                <Card as="section" id="button-icon" className="mb-3 pa-3">
                    <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Icon Buttons (ButtonIcon)</Font>
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

                <Card as="section" id="button-icon-toggle" className="mb-3 pa-3">
                    <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Toggle Button (Icon)</Font>
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

                <Card as="section" id="button-toggle" className="mb-3 pa-3">
                    <Font as="h2" variant="body" weight="semibold" className="mb-2" style={{ display: 'block' }}>Toggle Button</Font>
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

                <Card as="section" id="ripple" className="mb-3 pa-3">
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

                <Card as="section" id="avatar" className="mb-3 pa-3">
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

                <Card as="section" id="textfield" className="mb-3 pa-3">
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
                                {/* In a real scenario you would manage state, here we just show visual props */}
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

                <Card as="section" id="switch" className="mb-3 pa-3">
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

            </div>
        </div>
    );
};

export default Playground;
