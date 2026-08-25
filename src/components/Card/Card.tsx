// 카드 자체 패딩은 0으로 한다.
// 카드 내부의 컨텐츠, div 에 padding 옵션을 사용하여 패딩을 조절한다.


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
