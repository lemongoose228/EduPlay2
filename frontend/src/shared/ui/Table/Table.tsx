import React from 'react';
import './Table.css';

interface Column<T = any> {
  key: string;
  title: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  className?: string;
  onRowClick?: (record: T, index: number) => void;
  loading?: boolean;
  emptyText?: string;
}

export const Table = <T extends Record<string, any>>({
  columns,
  data,
  className = '',
  onRowClick,
  loading = false,
  emptyText = 'Нет данных'
}: TableProps<T>) => {
  if (loading) {
    return (
      <div className="table-loading">
        <div className="spinner" />
        <span>Загрузка...</span>
      </div>
    );
  }

  return (
    <div className={`table-container ${className}`}>
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th 
                key={column.key} 
                style={{ 
                  width: column.width,
                  textAlign: column.align || 'left'
                }}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((record, index) => (
              <tr 
                key={index}
                onClick={() => onRowClick?.(record, index)}
                className={onRowClick ? 'clickable-row' : ''}
              >
                {columns.map((column) => (
                  <td 
                    key={column.key}
                    style={{ textAlign: column.align || 'left' }}
                  >
                    {column.render
                      ? column.render(record[column.key], record, index)
                      : record[column.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="table-empty">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};