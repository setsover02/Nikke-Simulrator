import React, { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.scss';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  children, 
  className, 
  ...props 
}) => {
  const buttonClass = variant === 'primary' ? styles.buttonPrimary : styles.buttonSecondary;
  
  return (
    <button 
      className={`${buttonClass} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  );
};
