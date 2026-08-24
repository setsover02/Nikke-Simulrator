export const customIcons = import.meta.glob('../assets/icon/*.svg', { eager: true, import: 'default' }) as Record<string, string>;

export const getCustomIconUrl = (name: string): string | undefined => {
    return customIcons[`../assets/icon/${name}.svg`];
};
