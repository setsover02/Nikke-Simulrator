import React, { HTMLAttributes } from 'react';
import styles from './Card.module.scss';

export interface CardProps extends HTMLAttributes<HTMLElement> {
    as?: React.ElementType;
}

export const Card: React.FC<CardProps> = ({
    as: Component = 'div',
    className,
    children,
    ...props
}) => {
    return (
        <Component className={`${styles.card} ${className || ''}`.trim()} {...props}>
            {children}
        </Component>
    );
};
