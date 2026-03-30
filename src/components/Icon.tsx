import React from 'react';

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
    name: string;
    size?: number;
    weight?: number;
    fill?: number;
}

const Icon: React.FC<IconProps> = ({ name, size = 24, weight = 500, fill = 0, style, className = '', ...props }) => {
    return (
        <span
            className={`icon ${className}`}
            style={{
                fontSize: `${size}px`,
                fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
                ...style
            }}
            translate="no"
            {...props}
        >
            {name}
        </span>
    );
};

export default Icon;
