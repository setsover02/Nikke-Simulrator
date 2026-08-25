import React, { HTMLAttributes } from 'react';
import styles from './Layout.module.scss';

export type ContainerMaxWidth = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full' | false | number | string;

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
    as?: React.ElementType;
    maxWidth?: ContainerMaxWidth;
    fluid?: boolean; // maxWidth="full"과 동일한 100% 전체 너비 모드
    disableGutters?: boolean; // 좌우 여백(padding) 제거
}

export const Container: React.FC<ContainerProps> = ({
    as: Component = 'div',
    maxWidth = 'lg',
    fluid = false,
    disableGutters = false,
    className,
    style,
    children,
    ...props
}) => {
    const effectiveMaxWidth = fluid ? 'full' : maxWidth;
    const isNamedWidth = typeof effectiveMaxWidth === 'string' && ['xs', 'sm', 'md', 'lg', 'xl', 'full'].includes(effectiveMaxWidth);
    const isCustomWidth = typeof effectiveMaxWidth === 'number' || (typeof effectiveMaxWidth === 'string' && !isNamedWidth);

    const classList = [
        styles.container,
        isNamedWidth ? styles[`max-width-${effectiveMaxWidth}`] : '',
        disableGutters ? styles['container-disable-gutters'] : '',
        className || '',
    ].filter(Boolean).join(' ');

    const customStyle: React.CSSProperties = {
        ...(isCustomWidth ? { maxWidth: typeof effectiveMaxWidth === 'number' ? `${effectiveMaxWidth}px` : effectiveMaxWidth } : {}),
        ...style,
    };

    return (
        <Component
            className={classList}
            style={Object.keys(customStyle).length > 0 ? customStyle : undefined}
            {...props}
        >
            {children}
        </Component>
    );
};

export default Container;
