import React from 'react';
import { Button } from '../components/Button/Button';

const Playground: React.FC = () => {
    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 className="heading-1 font-bold" style={{ marginBottom: '24px' }}>UI Playground</h1>

            <section style={{ marginBottom: '40px' }}>
                <h2 className="heading-2 font-semibold" style={{ marginBottom: '16px' }}>Button Variants</h2>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <Button variant="primary">Primary Button</Button>
                    <Button variant="assistive">Assistive Button</Button>
                </div>
            </section>

            <section style={{ marginBottom: '40px' }}>
                <h2 className="heading-2 font-semibold" style={{ marginBottom: '16px' }}>Button Sizes</h2>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Button rightIcon="arrow_forward" size="large">Large</Button>
                    <Button rightIcon="arrow_forward" size="default">Default</Button>
                    <Button rightIcon="arrow_forward" size="small">Small</Button>
                    <Button rightIcon="arrow_forward" size="xsmall">XSmall</Button>
                </div>
            </section>

            <section style={{ marginBottom: '40px' }}>
                <h2 className="heading-2 font-semibold" style={{ marginBottom: '16px' }}>Button Icons (Material Symbols)</h2>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <Button leftIcon="search">Search</Button>
                    <Button rightIcon="arrow_forward">Next</Button>
                    <Button leftIcon="settings" rightIcon="chevron_right">Settings</Button>
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <Button variant="assistive" leftIcon="edit">Edit</Button>
                    <Button variant="assistive" rightIcon="delete">Delete</Button>
                </div>
            </section>

            <section style={{ marginBottom: '40px' }}>
                <h2 className="heading-2 font-semibold" style={{ marginBottom: '16px' }}>Button States</h2>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <Button disabled>Primary Disabled</Button>
                    <Button variant="assistive" disabled>Assistive Disabled</Button>
                </div>
            </section>
        </div>
    );
};

export default Playground;
