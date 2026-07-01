import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.webp';

const Header: React.FC = () => {
    return (
        <header className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
            <Link to="/">
                <img
                    src={logo}
                    alt="Logo"
                    className="app-logo"
                    style={{ height: '40px' }}
                />
            </Link>
            <nav>
                <Link to="/playground" className="body font-semibold" style={{ textDecoration: 'none', color: 'inherit' }}>
                    Playground
                </Link>
            </nav>
        </header>
    );
};

export default Header;
