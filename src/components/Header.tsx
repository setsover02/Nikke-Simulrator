import React from 'react';
import logo from '../assets/logo.webp';

const Header: React.FC = () => {
    return (
        <header className="app-header">
            <img
                src={logo}
                alt="Logo"
                className="app-logo"
            />
        </header>
    );
};

export default Header;
