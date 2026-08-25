import React, { HTMLAttributes } from 'react';
import styles from './Layout.module.scss';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg';
export type GridColumns = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | string;
export type ResponsiveColumns = GridColumns | Partial<Record<Breakpoint, GridColumns>>;

export type GridRows = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | string;
export type ResponsiveRows = GridRows | Partial<Record<Breakpoint, GridRows>>;

export type GridGap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type GridAlign = 'start' | 'center' | 'end' | 'stretch';
export type GridJustify = 'start' | 'center' | 'end' | 'between';

export interface GridProps extends HTMLAttributes<HTMLElement> {
    as?: React.ElementType;
    columns?: ResponsiveColumns;
    templateColumns?: string;
    rows?: ResponsiveRows;
    templateRows?: string;
    gap?: GridGap;
    rowGap?: GridGap;
    columnGap?: GridGap;
    alignItems?: GridAlign;
    justifyContent?: GridJustify;
}

/**
 * columns / templateColumns 값을 클래스 또는 인라인 스타일로 파싱합니다.
 */
function parseColumns(columns?: ResponsiveColumns, templateColumns?: string): { classNames: string[]; style: React.CSSProperties } {
    if (templateColumns) {
        return { classNames: [], style: { gridTemplateColumns: templateColumns } };
    }
    if (columns === undefined) return { classNames: [], style: {} };

    const classNames: string[] = [];
    const style: Record<string, string> = {};

    if (typeof columns === 'object' && columns !== null && !Array.isArray(columns)) {
        const bpKeys: Breakpoint[] = ['xs', 'sm', 'md', 'lg'];
        for (const bp of bpKeys) {
            const val = columns[bp];
            if (val === undefined) continue;
            if (typeof val === 'number' && val >= 1 && val <= 12 && Number.isInteger(val)) {
                classNames.push(styles[`cols-${bp}-${val}`] || styles[`cols-${val}`]);
            } else if (typeof val === 'string') {
                if (bp === 'xs') {
                    style.gridTemplateColumns = val;
                }
            }
        }
        return { classNames, style };
    }

    if (typeof columns === 'number' && columns >= 1 && columns <= 12 && Number.isInteger(columns)) {
        return { classNames: [styles[`cols-${columns}`]], style: {} };
    }

    // 문자열 커스텀 템플릿 (예: '1fr 1fr', '220px 1fr', '200px 1fr 240px')
    return { classNames: [], style: { gridTemplateColumns: String(columns) } };
}

/**
 * rows / templateRows 값을 클래스 또는 인라인 스타일로 파싱합니다.
 */
function parseRows(rows?: ResponsiveRows, templateRows?: string): { classNames: string[]; style: React.CSSProperties } {
    if (templateRows) {
        return { classNames: [], style: { gridTemplateRows: templateRows } };
    }
    if (rows === undefined) return { classNames: [], style: {} };

    const classNames: string[] = [];
    const style: Record<string, string> = {};

    if (typeof rows === 'object' && rows !== null && !Array.isArray(rows)) {
        const bpKeys: Breakpoint[] = ['xs', 'sm', 'md', 'lg'];
        for (const bp of bpKeys) {
            const val = rows[bp];
            if (val === undefined) continue;
            if (typeof val === 'number' && val >= 1 && val <= 12 && Number.isInteger(val)) {
                classNames.push(styles[`rows-${bp}-${val}`] || styles[`rows-${val}`]);
            } else if (typeof val === 'string') {
                if (bp === 'xs') {
                    style.gridTemplateRows = val;
                }
            }
        }
        return { classNames, style };
    }

    if (typeof rows === 'number' && rows >= 1 && rows <= 12 && Number.isInteger(rows)) {
        return { classNames: [styles[`rows-${rows}`]], style: {} };
    }

    // 문자열 커스텀 템플릿 (예: 'auto 1fr auto', 'repeat(3, 100px)')
    return { classNames: [], style: { gridTemplateRows: String(rows) } };
}

export const Grid: React.FC<GridProps> = ({
    as: Component = 'div',
    columns,
    templateColumns,
    rows,
    templateRows,
    gap,
    rowGap,
    columnGap,
    alignItems,
    justifyContent,
    className,
    style,
    children,
    ...props
}) => {
    const columnsInfo = parseColumns(columns, templateColumns);
    const rowsInfo = parseRows(rows, templateRows);

    const classList = [
        styles.grid,
        ...columnsInfo.classNames,
        ...rowsInfo.classNames,
        gap !== undefined ? styles[`gap-${gap}`] : '',
        rowGap !== undefined ? styles[`row-gap-${rowGap}`] : '',
        columnGap !== undefined ? styles[`col-gap-${columnGap}`] : '',
        alignItems !== undefined ? styles[`items-${alignItems}`] : '',
        justifyContent !== undefined ? styles[`justify-${justifyContent}`] : '',
        className || '',
    ].filter(Boolean).join(' ');

    const combinedStyle: React.CSSProperties = {
        ...columnsInfo.style,
        ...rowsInfo.style,
        ...style,
    };

    return (
        <Component className={classList} style={Object.keys(combinedStyle).length > 0 ? combinedStyle : undefined} {...props}>
            {children}
        </Component>
    );
};

export default Grid;
