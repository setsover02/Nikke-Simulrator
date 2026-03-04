import React from 'react';
import logo from '../assets/logo.webp';

const Header: React.FC = () => {
    return (
        <header style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            padding: '24px',
            backgroundColor: '#171717', // Assuming dark app theme
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start'
        }}>
            <img
                src={logo}
                alt="Logo"
                style={{
                    height: '44px',
                    width: 'auto',
                    display: 'block'
                }}
            />
        </header>
    );
};

export default Header;
