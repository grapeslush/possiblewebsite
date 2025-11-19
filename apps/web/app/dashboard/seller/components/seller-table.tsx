'use client';

import { Fragment, useMemo, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

export interface SellerTableColumn<T extends SellerTableRow> {
  key: keyof T;
  label: string;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
}

export interface SellerTableBulkAction<T extends SellerTableRow> {
  value: string;
  label: string;
  apply: (rows: T[], selectedIds: string[]) => { rows: T[]; message: string };
}

export interface SellerTableRow {
  id: string;
  [key: string]: unknown;
}

interface SellerTableProps<T extends SellerTableRow> {
  title: string;
  description: string;
  columns: SellerTableColumn<T>[];
  initialRows: T[];
  bulkActions: SellerTableBulkAction<T>[];
  csvTemplate?: string;
}

const parseCsv = (value: string) => {
  const [headerLine, ...lines] = value.trim().split(/\r?\n/);
  if (!headerLine) {
    return [];
  }

  const headers = headerLine.split(',').map((h) => h.trim());

  return lines
    .map((line) => line.split(',').map((item) => item.trim()))
    .filter((cells) => cells.length === headers.length)
    .map((cells) =>
      headers.reduce<Record<string, string>>((acc, header, index) => {
        acc[header] = cells[index] ?? '';
        return acc;
      }, {}),
    );
};

export function SellerTable<T extends SellerTableRow>({
  title,
  description,
  columns,
  initialRows,
  bulkActions,
  csvTemplate,
}: SellerTableProps<T>) {
  const [rows, setRows] = useState(initialRows);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedAction, setSelectedAction] = useState(bulkActions[0]?.value ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allSelected = useMemo(
    () => rows.length > 0 && selectedIds.length === rows.length,
    [rows.length, selectedIds.length],
  );

  const toggleSelection = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const toggleAll = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedIds(rows.map((row) => row.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleApply = () => {
    const action = bulkActions.find((item) => item.value === selectedAction);
    if (!action) {
      setError('Select a bulk action to continue.');
      return;
    }

    if (selectedIds.length === 0) {
      setError('Choose at least one row.');
      return;
    }

    const result = action.apply(rows, selectedIds);
    setRows(result.rows);
    setSelectedIds([]);
    setMessage(result.message);
    setError(null);
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    try {
      const parsed = parseCsv(text);
      const converted = parsed.map((row, index) => ({
        ...(row as unknown as T),
        id: row.id ?? `import-${Date.now()}-${index}`,
      }));
      setRows((current) => [...current, ...converted]);
      setMessage(`Imported ${converted.length} records.`);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Unable to import CSV file. Please confirm headers match the template.');
    }
    event.target.value = '';
  };

  const handleExport = () => {
    const headers = columns.map((column) => String(column.key));
    const csv = [headers.join(',')]
      .concat(rows.map((row) => headers.map((header) => String(row[header] ?? '')).join(',')))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-export.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Export generated successfully.');
  };

  return (
    <div className="space-y-6" data-testid="seller-table">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-600">{description}</p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <select
          className="h-10 rounded-md border border-slate-300 px-3 text-sm"
          value={selectedAction}
          onChange={(event) => setSelectedAction(event.target.value)}
          data-testid="bulk-action-select"
        >
          {bulkActions.map((action) => (
            <option key={action.value} value={action.value}>
              {action.label}
            </option>
          ))}
        </select>
        <Button onClick={handleApply} data-testid="bulk-apply">
          Apply to selected
        </Button>
        <label className="ml-auto flex items-center gap-2 text-sm font-medium text-brand-secondary">
          <input
            type="file"
            accept=".csv"
            onChange={handleImport}
            className="hidden"
            data-testid="csv-import"
          />
          <span className="cursor-pointer rounded border border-brand-secondary px-3 py-2 text-sm font-medium text-brand-secondary">
            Import CSV
          </span>
        </label>
        <Button variant="outline" onClick={handleExport} data-testid="csv-export">
          Export CSV
        </Button>
      </div>

      {message && (
        <div
          className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          data-testid="table-message"
        >
          {message}
        </div>
      )}
      {error && (
        <div
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          data-testid="table-error"
        >
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  data-testid="select-all"
                />
              </th>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-sm">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(row.id)}
                    onChange={() => toggleSelection(row.id)}
                    data-testid={`row-select-${row.id}`}
                  />
                </td>
                {columns.map((column) => (
                  <td
                    key={`${row.id}-${String(column.key)}`}
                    className={`px-4 py-2 ${
                      column.align === 'right'
                        ? 'text-right'
                        : column.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                    }`}
                  >
                    <Fragment>
                      {column.render ? column.render(row) : String(row[column.key] ?? '')}
                    </Fragment>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {csvTemplate && (
        <details className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <summary className="cursor-pointer font-medium text-slate-700">CSV template</summary>
          <pre className="mt-2 overflow-x-auto rounded bg-white p-3 text-xs text-slate-700">
            {csvTemplate}
          </pre>
        </details>
      )}
    </div>
  );
}
