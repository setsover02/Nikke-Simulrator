import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.webp';
import { Switch } from '../Switch/Switch';
import { Icon } from '../Icon/Icon';
import styles from './AppHeader.module.scss';

const AppHeader: React.FC = () => {
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved ? saved === 'dark' : true;
    });

    useEffect(() => {
        const theme = isDark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [isDark]);

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
                <Link to="/nikke" className="body font-semibold">
                    Nikke
                </Link>
                <Link to="/Rules" className="body font-semibold">
                    Rules
                </Link>
                <Link to="/playground" className="body font-semibold">
                    Playground
                </Link>

                {/* Dark / Light Theme Toggle */}
                <div className={styles['theme-toggle']}>
                    <Icon
                        name="light_mode"
                        size={18}
                        className={`${styles['theme-icon']} ${!isDark ? styles.active : ''}`}
                        title="라이트 테마"
                    />
                    <Switch
                        checked={isDark}
                        onChange={(e) => setIsDark(e.target.checked)}
                    />
                    <Icon
                        name="dark_mode"
                        size={18}
                        className={`${styles['theme-icon']} ${isDark ? styles.active : ''}`}
                        title="다크 테마"
                    />
                </div>
            </nav>
        </header>
    );
};

export default AppHeader;
