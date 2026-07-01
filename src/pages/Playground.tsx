import React from 'react';
import { Button } from '../components/Button/Button';
import { ButtonIcon } from '../components/ButtonIcon/ButtonIcon';
import { Font } from '../components/Font';
import { Ripple } from '../components/Ripple/Ripple';
import burst1 from '../assets/icon/burst-1.svg';
import weaponAR from '../assets/icon/weapon-AR.svg';
import classAtk from '../assets/icon/class-atk.svg';

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
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--Divider-Normal)', paddingBottom: '16px' }}>
        <div style={{ width: '140px', flexShrink: 0 }}>
            <Font as="h3" variant="caption-1" weight="semibold" style={{ textTransform: 'capitalize', color: 'var(--Font-Default)' }}>{title}</Font>
        </div>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', flex: 1 }}>
            {children}
        </div>
    </div>
);

const getSvgIcon = (size: string) => {
    if (size === 'large') return burst1;
    if (size === 'default') return weaponAR;
    return classAtk;
};

const Playground: React.FC = () => {
    return (
        <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
            <Font as="h1" variant="subtitle" weight="bold" style={{ display: 'block', marginBottom: '24px' }}>UI Playground</Font>

            <section style={{ marginBottom: '48px' }}>
                <Font as="h2" variant="body" weight="semibold" style={{ display: 'block', marginBottom: '16px' }}>Button (Block)</Font>
                <div style={{ borderTop: '1px solid var(--Divider-Normal)', paddingTop: '16px' }}>
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
            </section>

            <section style={{ marginBottom: '48px' }}>
                <Font as="h2" variant="body" weight="semibold" style={{ display: 'block', marginBottom: '16px' }}>Button (Text)</Font>
                <div style={{ borderTop: '1px solid var(--Divider-Normal)', paddingTop: '16px' }}>
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
            </section>

            <section style={{ marginBottom: '48px' }}>
                <Font as="h2" variant="body" weight="semibold" style={{ display: 'block', marginBottom: '16px' }}>Icon Buttons (ButtonIcon)</Font>
                <div style={{ borderTop: '1px solid var(--Divider-Normal)', paddingTop: '16px' }}>
                    {variants.map(variant => (
                        <React.Fragment key={`icon-${variant}`}>
                            <TableRow title={`${variant}`}>
                                {sizes.map(size => (
                                    <DemoBox key={size} label={size}>
                                        <ButtonIcon icon="settings" variant={variant} size={size} />
                                    </DemoBox>
                                ))}
                            </TableRow>
                            <TableRow title={`${variant} (Disabled)`}>
                                {sizes.map(size => (
                                    <DemoBox key={`disabled-${size}`} label={size}>
                                        <ButtonIcon icon="settings" variant={variant} size={size} disabled />
                                    </DemoBox>
                                ))}
                            </TableRow>
                            <TableRow title={`${variant} (SVG)`}>
                                {sizes.map(size => (
                                    <DemoBox key={`svg-${size}`} label={size}>
                                        <ButtonIcon svgIcon={getSvgIcon(size)} variant={variant} size={size} />
                                    </DemoBox>
                                ))}
                            </TableRow>
                        </React.Fragment>
                    ))}
                </div>
            </section>

            <section style={{ marginBottom: '48px' }}>
                <Font as="h2" variant="body" weight="semibold" style={{ display: 'block', marginBottom: '16px' }}>Ripple Effect on any Element</Font>
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
            </section>
        </div>
    );
};

export default Playground;
