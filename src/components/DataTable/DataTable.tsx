import React from 'react';
import styles from './DataTable.module.scss';

export interface ColumnDef<T> {
    id: string;
    header: React.ReactNode;
    width?: string | number;
    cell: (row: T, index: number) => React.ReactNode;
    headerClassName?: string;
    cellClassName?: string;
    narrow?: boolean;
}

export interface DataTableProps<T> {
    data: T[];
    columns: ColumnDef<T>[];
    keyExtractor: (row: T, index: number) => string;
    maxHeight?: string | number;
    className?: string;
}

export function DataTable<T>({ data, columns, keyExtractor, maxHeight, className }: DataTableProps<T>) {
    return (
        <div
            className={`${styles['datatable-container']} ${className || ''}`}
            style={{ maxHeight }}
        >
            <table className={styles.datatable}>
                <thead className={styles.thead}>
                    <tr>
                        {columns.map(col => (
                            <th
                                key={col.id}
                                className={`${styles.th} ${col.narrow ? styles.narrow : ''} ${col.headerClassName || ''}`}
                                style={{ width: col.width }}
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIndex) => (
                        <tr key={keyExtractor(row, rowIndex)} className={styles.tr}>
                            {columns.map(col => (
                                <td
                                    key={col.id}
                                    className={`${styles.td} ${col.narrow ? styles.narrow : ''} ${col.cellClassName || ''}`}
                                >
                                    {col.cell(row, rowIndex)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
