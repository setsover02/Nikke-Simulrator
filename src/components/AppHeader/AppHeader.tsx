import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.webp';
import styles from './AppHeader.module.scss';

const AppHeader: React.FC = () => {
    return (
        <header className={styles['app-header']}>
            <Link to="/">
                <img
                    src={logo}
                    alt="Logo"
                    className={styles['app-logo']}
                />
            </Link>
            <nav style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <Link to="/Rules" className="body font-semibold" style={{ textDecoration: 'none', color: 'inherit' }}>
                    Rules
                </Link>
                <Link to="/playground" className="body font-semibold" style={{ textDecoration: 'none', color: 'inherit' }}>
                    Playground
                </Link>
            </nav>
        </header>
    );
};

export default AppHeader;
