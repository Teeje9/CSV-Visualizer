export type ValueFormatType = 'currency' | 'percentage' | 'count' | 'generic_numeric' | 'text';

export interface FormatOptions {
  semanticType?: string;
  unit?: string;
  compact?: boolean;
  decimals?: number;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export function isCurrencyType(semanticType?: string): boolean {
  return semanticType === 'currency';
}

export function isPercentageType(semanticType?: string): boolean {
  return semanticType === 'percentage';
}

export function formatValue(value: number | string | undefined | null, options: FormatOptions = {}): string {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return String(value);
  }

  const { semanticType, compact = false } = options;

  if (isCurrencyType(semanticType)) {
    return compact ? compactCurrencyFormatter.format(numValue) : currencyFormatter.format(numValue);
  }

  if (isPercentageType(semanticType)) {
    return percentFormatter.format(numValue / 100);
  }

  return compact ? compactNumberFormatter.format(numValue) : numberFormatter.format(numValue);
}

export function formatAxisValue(value: number | string | undefined | null, semanticType?: string): string {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (typeof numValue !== 'number' || isNaN(numValue)) {
    if (typeof value === 'string' && value.length > 12) {
      return value.slice(0, 12) + '...';
    }
    return String(value);
  }

  if (isCurrencyType(semanticType)) {
    if (Math.abs(numValue) >= 1000000) {
      return '$' + (numValue / 1000000).toFixed(1) + 'M';
    }
    if (Math.abs(numValue) >= 1000) {
      return '$' + (numValue / 1000).toFixed(1) + 'K';
    }
    return '$' + numValue.toFixed(numValue % 1 === 0 ? 0 : 2);
  }

  if (isPercentageType(semanticType)) {
    return numValue.toFixed(1) + '%';
  }

  if (Math.abs(numValue) >= 1000000) {
    return (numValue / 1000000).toFixed(1) + 'M';
  }
  if (Math.abs(numValue) >= 1000) {
    return (numValue / 1000).toFixed(1) + 'K';
  }
  return numValue.toFixed(numValue % 1 === 0 ? 0 : 1);
}

export function formatTooltipValue(value: number | string | undefined | null, semanticType?: string): string {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (typeof numValue !== 'number' || isNaN(numValue)) {
    return String(value);
  }

  if (isCurrencyType(semanticType)) {
    return currencyFormatter.format(numValue);
  }

  if (isPercentageType(semanticType)) {
    return numValue.toFixed(2) + '%';
  }

  return numberFormatter.format(numValue);
}

export function ensureNumericValue(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') {
    return 0;
  }
  
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  
  let cleaned = String(value).trim();
  cleaned = cleaned.replace(/[\$\€\£\¥\s]/g, '');
  
  if (cleaned.endsWith('%')) {
    cleaned = cleaned.slice(0, -1);
  }
  
  const isEuropeanFormat = /^\-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned) || 
                           /^\-?\d+,\d+$/.test(cleaned);
  
  if (isEuropeanFormat) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    cleaned = cleaned.replace(/,/g, '');
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
