import React, { useState } from 'react';
import styles from './OutpostCard.module.scss';
import { Icon } from '../Icon/Icon';
import { Card } from '../Card/Card';

interface OutpostCardProps {
    children: React.ReactNode;
}

export const OutpostCard: React.FC<OutpostCardProps> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={`${styles['outpost-card']} ${isOpen ? styles.open : ''}`}>
            <button 
                className={styles['toggle-button']} 
                onClick={() => setIsOpen(!isOpen)}
                title={isOpen ? "Close Outpost Settings" : "Open Outpost Settings"}
            >
                <Icon name={isOpen ? "chevron_left" : "chevron_right"} size={24} />
            </button>
            <Card className={styles['panel-content']}>
                {children}
            </Card>
        </div>
    );
};
