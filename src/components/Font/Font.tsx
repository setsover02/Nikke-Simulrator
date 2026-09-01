import React from 'react';
import '../../assets/style/base/_typography.scss';

export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';
export type FontVariant = 'display-1' | 'display-2' | 'display-3' | 'heading-1' | 'heading-2' | 'heading-3' | 'subtitle' | 'body' | 'reading' | 'caption-1' | 'caption-2' | 'footnote' | 'font-button' | 'font-button-small';
export type FontColor = 'default' | 'muted' | 'inactive' | 'disabled';

export interface FontProps extends React.HTMLAttributes<HTMLSpanElement> {
    weight?: FontWeight;
    variant?: FontVariant;
    color?: FontColor;
    as?: React.ElementType;
    children?: React.ReactNode;
}

export const Font: React.FC<FontProps> = ({
    weight = 'regular',
    variant = 'body',
    color = 'default',
    as: Component = 'span',
    className = '',
    children,
    ...props
}) => {
    const weightClass = weight ? `font-${weight}` : '';
    const variantClass = variant ? variant : '';
    const colorClass = color ? `color-${color}` : '';

    const combinedClassName = [weightClass, variantClass, colorClass, className].filter(Boolean).join(' ');

    return (
        <Component className={combinedClassName} {...props}>
            {children}
        </Component>
    );
};

export default Font;
