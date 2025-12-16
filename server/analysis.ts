import * as ss from 'simple-statistics';
import type { 
  ColumnInfo, 
  BaseType,
  SemanticType,
  NumericStats, 
  Correlation, 
  Trend, 
  Outlier,
  Insight, 
  ChartConfig,
  AnalysisResult,
  DataQuality,
  StatisticalTest
} from '@shared/schema';

interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
}

const CURRENCY_REGEX = /^[\$\€\£\¥]?\s*-?[\d,]+\.?\d*$|^-?[\d,]+\.?\d*\s*[\$\€\£\¥]?$/;
const PERCENTAGE_REGEX = /^-?\d+\.?\d*\s*%$/;
const TIMESTAMP_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
  /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/,
  /^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/,
  /^\d{10,13}$/,
];
const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{2}\/\d{2}\/\d{4}$/,
  /^\d{2}-\d{2}-\d{4}$/,
  /^\d{4}\/\d{2}\/\d{2}$/,
  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
  /^\w{3,9}\s+\d{1,2},?\s+\d{4}$/i,
  /^\d{1,2}\s+\w{3,9}\s+\d{4}$/i,
  /^\d{4}$/,
];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/|^www\./i;
const PHONE_REGEX = /^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
const ZIP_REGEX = /^\d{5}(-\d{4})?$|^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i;
const LAT_LNG_REGEX = /^-?\d{1,3}\.\d{4,}$/;
const UNIX_TIMESTAMP_REGEX = /^1[0-9]{9,12}$/;

const MEASUREMENT_UNITS: Record<string, string> = {
  '_m': 'm', '_km': 'km', '_ft': 'ft', '_mi': 'mi', '_in': 'in', '_cm': 'cm', '_mm': 'mm',
  '_kg': 'kg', '_lb': 'lb', '_g': 'g', '_oz': 'oz',
  '_sec': 's', '_min': 'min', '_hr': 'h', '_ms': 'ms',
  '_px': 'px', '_pt': 'pt', '_em': 'em',
  '_mb': 'MB', '_gb': 'GB', '_kb': 'KB', '_tb': 'TB'
};

const ID_COLUMN_HINTS = ['id', 'uuid', 'guid', 'key', 'code', 'sku', 'ref', 'number', 'no', '#'];
const DATE_COLUMN_HINTS = ['date', 'time', 'timestamp', 'created', 'updated', 'modified', 'year', 'month', 'day', 'when', 'period'];
const CURRENCY_COLUMN_HINTS = ['price', 'cost', 'amount', 'total', 'revenue', 'sales', 'income', 'expense', 'fee', 'payment', 'salary', 'wage', 'budget', 'profit', 'loss', 'balance', 'value', 'worth'];
const COUNT_COLUMN_HINTS = ['count', 'qty', 'quantity', 'num', 'number', 'total', 'sum', 'units', 'items', 'orders', 'customers', 'users', 'visits', 'views', 'clicks', 'downloads'];
const RATE_COLUMN_HINTS = ['rate', 'ratio', 'percent', 'percentage', 'growth', 'change', 'conversion', 'churn', 'retention'];
const GEO_COLUMN_HINTS = ['country', 'state', 'city', 'region', 'location', 'address', 'zip', 'postal', 'lat', 'lng', 'latitude', 'longitude'];
const NAME_COLUMN_HINTS = ['name', 'title', 'label', 'description', 'first', 'last', 'full'];
const STATUS_COLUMN_HINTS = ['status', 'state', 'type', 'category', 'level', 'tier', 'grade', 'class', 'group', 'segment'];

function columnNameContains(name: string, hints: string[]): boolean {
  const lower = name.toLowerCase();
  return hints.some(hint => lower.includes(hint) || lower === hint);
}

function cleanNumericValue(value: string): number {
  let cleaned = value.trim();
  
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
  
  return parseFloat(cleaned);
}

function detectSemanticType(values: string[], columnName: string): { baseType: BaseType; semanticType: SemanticType; format?: string; unit?: string } {
  const nonEmpty = values.filter(v => v !== '' && v !== null && v !== undefined);
  if (nonEmpty.length === 0) return { baseType: 'text', semanticType: 'generic_text' };

  const sampleSize = Math.min(nonEmpty.length, 100);
  const sample = nonEmpty.slice(0, sampleSize);
  const lowerName = columnName.toLowerCase();

  let currencyCount = 0;
  let percentCount = 0;
  let timestampCount = 0;
  let dateCount = 0;
  let numericCount = 0;
  let booleanCount = 0;
  let emailCount = 0;
  let urlCount = 0;
  let phoneCount = 0;
  let zipCount = 0;
  let latLngCount = 0;
  let unixTimestampCount = 0;

  for (const value of sample) {
    const trimmed = value.trim();
    const lower = trimmed.toLowerCase();

    if (lower === 'true' || lower === 'false' || lower === 'yes' || lower === 'no' || trimmed === '1' || trimmed === '0') {
      booleanCount++;
    }
    if (CURRENCY_REGEX.test(trimmed) && /[\$\€\£\¥]/.test(trimmed)) {
      currencyCount++;
    }
    if (PERCENTAGE_REGEX.test(trimmed)) {
      percentCount++;
    }
    if (UNIX_TIMESTAMP_REGEX.test(trimmed)) {
      unixTimestampCount++;
    }
    if (TIMESTAMP_PATTERNS.some(p => p.test(trimmed))) {
      timestampCount++;
    }
    if (DATE_PATTERNS.some(p => p.test(trimmed))) {
      dateCount++;
    }
    const num = cleanNumericValue(trimmed);
    if (!isNaN(num) && isFinite(num)) {
      numericCount++;
    }
    if (EMAIL_REGEX.test(trimmed)) {
      emailCount++;
    }
    if (URL_REGEX.test(trimmed)) {
      urlCount++;
    }
    if (PHONE_REGEX.test(trimmed) && !UNIX_TIMESTAMP_REGEX.test(trimmed)) {
      phoneCount++;
    }
    if (ZIP_REGEX.test(trimmed)) {
      zipCount++;
    }
    if (LAT_LNG_REGEX.test(trimmed)) {
      latLngCount++;
    }
  }

  const threshold = sampleSize * 0.7;
  const strictThreshold = sampleSize * 0.85;

  if (emailCount >= threshold) return { baseType: 'text', semanticType: 'email' };
  if (urlCount >= threshold) return { baseType: 'text', semanticType: 'url' };
  if (phoneCount >= threshold) return { baseType: 'text', semanticType: 'phone' };
  if (zipCount >= threshold) return { baseType: 'text', semanticType: 'zip_code' };

  if (booleanCount >= strictThreshold) return { baseType: 'boolean', semanticType: 'boolean' };

  if (unixTimestampCount >= threshold) return { baseType: 'temporal', semanticType: 'timestamp', format: 'unix' };
  if (timestampCount >= threshold) return { baseType: 'temporal', semanticType: 'timestamp' };
  if (dateCount >= threshold || columnNameContains(lowerName, DATE_COLUMN_HINTS)) {
    if (sample.every(s => /^\d{4}$/.test(s.trim()))) {
      return { baseType: 'temporal', semanticType: 'year' };
    }
    return { baseType: 'temporal', semanticType: 'date' };
  }

  if (currencyCount >= threshold) {
    const currencySymbol = sample.find(s => /[\$\€\£\¥]/.test(s))?.match(/[\$\€\£\¥]/)?.[0] || '$';
    return { baseType: 'numeric', semanticType: 'currency', unit: currencySymbol };
  }

  if (percentCount >= threshold) {
    return { baseType: 'numeric', semanticType: 'percentage', unit: '%' };
  }

  if (numericCount >= threshold && columnNameContains(lowerName, CURRENCY_COLUMN_HINTS)) {
    return { baseType: 'numeric', semanticType: 'currency', unit: '$' };
  }

  if (numericCount >= threshold && columnNameContains(lowerName, RATE_COLUMN_HINTS) && !columnNameContains(lowerName, COUNT_COLUMN_HINTS)) {
    return { baseType: 'numeric', semanticType: 'rate' };
  }

  if (latLngCount >= threshold) {
    if (lowerName.includes('lat')) return { baseType: 'numeric', semanticType: 'latitude' };
    if (lowerName.includes('lng') || lowerName.includes('lon')) return { baseType: 'numeric', semanticType: 'longitude' };
  }

  if (numericCount >= threshold) {
    if (columnNameContains(lowerName, ID_COLUMN_HINTS)) {
      return { baseType: 'text', semanticType: 'id' };
    }
    if (columnNameContains(lowerName, COUNT_COLUMN_HINTS)) {
      return { baseType: 'numeric', semanticType: 'count' };
    }
    for (const [suffix, unit] of Object.entries(MEASUREMENT_UNITS)) {
      if (lowerName.endsWith(suffix)) {
        return { baseType: 'numeric', semanticType: 'measurement', unit };
      }
    }
    return { baseType: 'numeric', semanticType: 'generic_numeric' };
  }

  const uniqueValues = new Set(sample);
  const uniqueRatio = uniqueValues.size / sampleSize;

  if (uniqueRatio > 0.9 && sampleSize > 10) {
    if (columnNameContains(lowerName, ID_COLUMN_HINTS)) {
      return { baseType: 'text', semanticType: 'id' };
    }
    if (columnNameContains(lowerName, NAME_COLUMN_HINTS)) {
      return { baseType: 'text', semanticType: 'name' };
    }
    return { baseType: 'text', semanticType: 'generic_text' };
  }

  if (uniqueValues.size <= Math.min(30, sampleSize * 0.4)) {
    if (columnNameContains(lowerName, STATUS_COLUMN_HINTS)) {
      return { baseType: 'categorical', semanticType: 'status' };
    }
    if (columnNameContains(lowerName, GEO_COLUMN_HINTS)) {
      if (lowerName.includes('country')) return { baseType: 'categorical', semanticType: 'country' };
      if (lowerName.includes('state') || lowerName.includes('province')) return { baseType: 'categorical', semanticType: 'state' };
      if (lowerName.includes('city')) return { baseType: 'categorical', semanticType: 'city' };
    }
    return { baseType: 'categorical', semanticType: 'category' };
  }

  return { baseType: 'text', semanticType: 'generic_text' };
}

function getColumnValues(rows: Record<string, string>[], column: string): string[] {
  return rows.map(row => row[column] || '');
}

function getNumericValues(rows: Record<string, string>[], column: string): number[] {
  return rows
    .map(row => cleanNumericValue(row[column] || ''))
    .filter(n => !isNaN(n) && isFinite(n));
}

function getPairedNumericValues(rows: Record<string, string>[], col1: string, col2: string): { values1: number[]; values2: number[] } {
  const values1: number[] = [];
  const values2: number[] = [];
  
  for (const row of rows) {
    const v1 = cleanNumericValue(row[col1] || '');
    const v2 = cleanNumericValue(row[col2] || '');
    
    if (!isNaN(v1) && isFinite(v1) && !isNaN(v2) && isFinite(v2)) {
      values1.push(v1);
      values2.push(v2);
    }
  }
  
  return { values1, values2 };
}

function calculateNumericStats(column: string, values: number[], semanticType: string, unit?: string): NumericStats {
  if (values.length === 0) {
    return { column, semanticType, mean: 0, median: 0, min: 0, max: 0, stdDev: 0, total: 0, count: 0, unit };
  }
  return {
    column,
    semanticType,
    mean: ss.mean(values),
    median: ss.median(values),
    min: ss.min(values),
    max: ss.max(values),
    stdDev: values.length > 1 ? ss.standardDeviation(values) : 0,
    total: ss.sum(values),
    count: values.length,
    unit
  };
}

function calculateCorrelation(col1: string, values1: number[], col2: string, values2: number[]): Correlation | null {
  if (values1.length !== values2.length || values1.length < 5) return null;

  try {
    const r = ss.sampleCorrelation(values1, values2);
    if (isNaN(r)) return null;

    let strength: Correlation['strength'];
    let description: string;

    if (r >= 0.7) {
      strength = 'strong_positive';
      description = `When ${col1} goes up, ${col2} tends to go up significantly too.`;
    } else if (r >= 0.4) {
      strength = 'moderate_positive';
      description = `${col1} and ${col2} tend to move together.`;
    } else if (r >= 0.1) {
      strength = 'weak_positive';
      description = `Slight positive relationship between ${col1} and ${col2}.`;
    } else if (r > -0.1) {
      strength = 'none';
      description = `No clear relationship between ${col1} and ${col2}.`;
    } else if (r >= -0.4) {
      strength = 'weak_negative';
      description = `Slight inverse relationship between ${col1} and ${col2}.`;
    } else if (r >= -0.7) {
      strength = 'moderate_negative';
      description = `When ${col1} goes up, ${col2} tends to go down.`;
    } else {
      strength = 'strong_negative';
      description = `Strong inverse relationship: as ${col1} increases, ${col2} decreases.`;
    }

    return { column1: col1, column2: col2, coefficient: r, strength, description };
  } catch {
    return null;
  }
}

function performTTest(
  groupColumn: string,
  valueColumn: string,
  rows: Record<string, string>[],
  columns: ColumnInfo[]
): StatisticalTest | null {
  const groupCol = columns.find(c => c.name === groupColumn);
  if (!groupCol || groupCol.cardinality !== 2) return null;

  const groups: Record<string, number[]> = {};
  
  for (const row of rows) {
    const groupValue = row[groupColumn] || '';
    const numValue = cleanNumericValue(row[valueColumn] || '');
    
    if (groupValue && !isNaN(numValue) && isFinite(numValue)) {
      if (!groups[groupValue]) groups[groupValue] = [];
      groups[groupValue].push(numValue);
    }
  }

  const groupNames = Object.keys(groups);
  if (groupNames.length !== 2) return null;
  
  const group1 = groups[groupNames[0]];
  const group2 = groups[groupNames[1]];
  
  if (group1.length < 3 || group2.length < 3) return null;

  const mean1 = ss.mean(group1);
  const mean2 = ss.mean(group2);
  const var1 = ss.variance(group1);
  const var2 = ss.variance(group2);
  const n1 = group1.length;
  const n2 = group2.length;
  
  const pooledSE = Math.sqrt((var1 / n1) + (var2 / n2));
  if (pooledSE === 0) return null;
  
  const tStatistic = (mean1 - mean2) / pooledSE;
  
  const v1n1 = var1 / n1;
  const v2n2 = var2 / n2;
  const dfNumerator = (v1n1 + v2n2) ** 2;
  const dfDenominator = (v1n1 ** 2) / (n1 - 1) + (v2n2 ** 2) / (n2 - 1);
  const df = dfDenominator > 0 ? dfNumerator / dfDenominator : Math.min(n1 - 1, n2 - 1);
  
  const pValue = tDistributionPValue(Math.abs(tStatistic), df);
  const significant = pValue < 0.05;
  
  const comparison = mean1 > mean2 ? 'higher' : 'lower';
  const diffPercent = Math.abs((mean1 - mean2) / ((mean1 + mean2) / 2) * 100);
  
  return {
    type: 't_test',
    title: `T-Test: ${valueColumn} by ${groupColumn}`,
    description: significant 
      ? `Significant difference found! ${groupNames[0]} has ${diffPercent.toFixed(1)}% ${comparison} ${valueColumn} than ${groupNames[1]} (p=${pValue.toFixed(4)}).`
      : `No significant difference in ${valueColumn} between ${groupNames[0]} and ${groupNames[1]} (p=${pValue.toFixed(4)}).`,
    pValue,
    statistic: tStatistic,
    significant,
    details: {
      group1Name: groupNames[0],
      group2Name: groupNames[1],
      group1Mean: mean1,
      group2Mean: mean2,
      group1Count: n1,
      group2Count: n2
    }
  };
}

function tDistributionPValue(t: number, df: number): number {
  const x = df / (df + t * t);
  const beta = regularizedIncompleteBeta(df / 2, 0.5, x);
  return beta;
}

function regularizedIncompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  
  const lnBeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;
  
  let f = 1, c = 1, d = 0;
  
  for (let m = 0; m <= 200; m++) {
    let num: number;
    if (m === 0) {
      num = 1;
    } else if (m % 2 === 0) {
      const k = m / 2;
      num = (k * (b - k) * x) / ((a + m - 1) * (a + m));
    } else {
      const k = (m - 1) / 2;
      num = -((a + k) * (a + b + k) * x) / ((a + m - 1) * (a + m));
    }
    
    d = 1 + num * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    
    c = 1 + num / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    
    const delta = c * d;
    f *= delta;
    
    if (Math.abs(delta - 1) < 1e-10) break;
  }
  
  return Math.min(1, Math.max(0, front * f));
}

function logGamma(z: number): number {
  const g = 7;
  const coef = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];
  
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  
  z -= 1;
  let x = coef[0];
  for (let i = 1; i < g + 2; i++) {
    x += coef[i] / (z + i);
  }
  
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function performFTest(
  groupColumn: string,
  valueColumn: string,
  rows: Record<string, string>[],
  columns: ColumnInfo[]
): StatisticalTest | null {
  const groupCol = columns.find(c => c.name === groupColumn);
  if (!groupCol || groupCol.cardinality < 3 || groupCol.cardinality > 10) return null;

  const groups: Record<string, number[]> = {};
  
  for (const row of rows) {
    const groupValue = row[groupColumn] || '';
    const numValue = cleanNumericValue(row[valueColumn] || '');
    
    if (groupValue && !isNaN(numValue) && isFinite(numValue)) {
      if (!groups[groupValue]) groups[groupValue] = [];
      groups[groupValue].push(numValue);
    }
  }

  const groupNames = Object.keys(groups);
  if (groupNames.length < 3) return null;
  
  const validGroups = groupNames.filter(g => groups[g].length >= 2);
  if (validGroups.length < 3) return null;

  const allValues: number[] = [];
  const groupMeans: Record<string, number> = {};
  
  for (const name of validGroups) {
    const values = groups[name];
    allValues.push(...values);
    groupMeans[name] = ss.mean(values);
  }
  
  const grandMean = ss.mean(allValues);
  const k = validGroups.length;
  const N = allValues.length;
  
  let ssBetween = 0;
  let ssWithin = 0;
  
  for (const name of validGroups) {
    const values = groups[name];
    const groupMean = groupMeans[name];
    ssBetween += values.length * Math.pow(groupMean - grandMean, 2);
    
    for (const value of values) {
      ssWithin += Math.pow(value - groupMean, 2);
    }
  }
  
  const dfBetween = k - 1;
  const dfWithin = N - k;
  
  if (dfWithin <= 0 || ssWithin === 0) return null;
  
  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;
  const fStatistic = msBetween / msWithin;
  
  const pValue = fDistributionPValue(fStatistic, dfBetween, dfWithin);
  const significant = pValue < 0.05;
  
  const sortedGroups = validGroups.sort((a, b) => groupMeans[b] - groupMeans[a]);
  const highest = sortedGroups[0];
  const lowest = sortedGroups[sortedGroups.length - 1];
  
  return {
    type: 'f_test',
    title: `ANOVA: ${valueColumn} across ${groupColumn}`,
    description: significant 
      ? `Significant differences found across ${k} groups (p=${pValue.toFixed(4)}). ${highest} has the highest mean, ${lowest} has the lowest.`
      : `No significant differences in ${valueColumn} across ${k} ${groupColumn} groups (p=${pValue.toFixed(4)}).`,
    pValue,
    statistic: fStatistic,
    significant,
    details: {
      groupCount: k,
      highestGroup: highest,
      lowestGroup: lowest,
      groupMeans: groupMeans
    }
  };
}

function fDistributionPValue(f: number, d1: number, d2: number): number {
  if (f <= 0) return 1;
  const x = (d1 * f) / (d1 * f + d2);
  return 1 - regularizedIncompleteBeta(d1 / 2, d2 / 2, x);
}

function performPCA(
  numericColumns: ColumnInfo[],
  rows: Record<string, string>[]
): StatisticalTest | null {
  if (numericColumns.length < 4) return null;
  
  const validCols = numericColumns.filter(c => 
    c.semanticType !== 'id' && 
    c.semanticType !== 'latitude' && 
    c.semanticType !== 'longitude' &&
    c.cardinality > 5
  ).slice(0, 8);
  
  if (validCols.length < 4) return null;

  const data: number[][] = [];
  
  for (const row of rows.slice(0, 500)) {
    const values: number[] = [];
    let valid = true;
    
    for (const col of validCols) {
      const num = cleanNumericValue(row[col.name] || '');
      if (isNaN(num) || !isFinite(num)) {
        valid = false;
        break;
      }
      values.push(num);
    }
    
    if (valid) data.push(values);
  }
  
  if (data.length < 10) return null;

  const means: number[] = [];
  const stds: number[] = [];
  
  for (let j = 0; j < validCols.length; j++) {
    const colValues = data.map(row => row[j]);
    means.push(ss.mean(colValues));
    stds.push(ss.standardDeviation(colValues) || 1);
  }

  const normalized = data.map(row => 
    row.map((val, j) => (val - means[j]) / stds[j])
  );

  const n = normalized.length;
  const p = validCols.length;
  const covMatrix: number[][] = [];
  
  for (let i = 0; i < p; i++) {
    covMatrix[i] = [];
    for (let j = 0; j < p; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += normalized[k][i] * normalized[k][j];
      }
      covMatrix[i][j] = sum / (n - 1);
    }
  }

  const totalVariance = covMatrix.reduce((sum, row, i) => sum + row[i], 0);
  
  const variances = covMatrix.map((row, i) => ({
    column: validCols[i].name,
    variance: row[i]
  })).sort((a, b) => b.variance - a.variance);
  
  const topContributors = variances.slice(0, 3);
  const topVariancePercent = (topContributors.reduce((s, v) => s + v.variance, 0) / totalVariance * 100);

  return {
    type: 'pca',
    title: `Variance Analysis`,
    description: `Analyzed ${validCols.length} numeric columns. The top 3 highest-variance variables are ${topContributors.map(c => c.column).join(', ')}, accounting for ${topVariancePercent.toFixed(0)}% of total standardized variance.`,
    details: {
      columnsAnalyzed: validCols.length,
      rowsAnalyzed: data.length,
      topContributors: topContributors.map(c => c.column),
      varianceExplained: topVariancePercent
    }
  };
}

function runStatisticalTests(
  columns: ColumnInfo[],
  rows: Record<string, string>[]
): StatisticalTest[] {
  const tests: StatisticalTest[] = [];
  
  const numericCols = columns.filter(c => 
    c.baseType === 'numeric' && 
    c.semanticType !== 'id'
  );
  
  const categoricalCols = columns.filter(c => 
    c.baseType === 'categorical' &&
    c.cardinality >= 2 &&
    c.cardinality <= 10
  );

  const tTestCols = categoricalCols.filter(c => c.cardinality === 2);
  for (const catCol of tTestCols.slice(0, 1)) {
    for (const numCol of numericCols.slice(0, 2)) {
      const result = performTTest(catCol.name, numCol.name, rows, columns);
      if (result) tests.push(result);
    }
  }

  const fTestCols = categoricalCols.filter(c => c.cardinality >= 3 && c.cardinality <= 10);
  for (const catCol of fTestCols.slice(0, 1)) {
    for (const numCol of numericCols.slice(0, 1)) {
      const result = performFTest(catCol.name, numCol.name, rows, columns);
      if (result) tests.push(result);
    }
  }

  if (numericCols.length >= 4) {
    const pcaResult = performPCA(numericCols, rows);
    if (pcaResult) tests.push(pcaResult);
  }
  
  return tests;
}

function detectOutliers(column: string, rows: Record<string, string>[]): Outlier[] {
  const valuesWithIndex: { value: number; originalIndex: number }[] = [];
  
  for (let i = 0; i < rows.length; i++) {
    const num = cleanNumericValue(rows[i][column] || '');
    if (!isNaN(num) && isFinite(num)) {
      valuesWithIndex.push({ value: num, originalIndex: i });
    }
  }

  if (valuesWithIndex.length < 5) return [];

  const values = valuesWithIndex.map(v => v.value);
  const mean = ss.mean(values);
  const stdDev = ss.standardDeviation(values);
  if (stdDev === 0) return [];

  const outliers: Outlier[] = [];
  const threshold = 2.5;

  for (const { value, originalIndex } of valuesWithIndex) {
    const zScore = (value - mean) / stdDev;
    if (Math.abs(zScore) >= threshold) {
      const type = zScore > 0 ? 'high' : 'low';
      outliers.push({
        column,
        value,
        index: originalIndex,
        type,
        zScore: Math.abs(zScore),
        description: `Row ${originalIndex + 1}: ${value.toLocaleString()} is ${Math.abs(zScore).toFixed(1)} std devs ${type === 'high' ? 'above' : 'below'} average`
      });
    }
  }

  return outliers.sort((a, b) => b.zScore - a.zScore).slice(0, 10);
}

function detectTrend(timeCol: string, valueCol: string, rows: Record<string, string>[]): Trend | null {
  const sortedData: { time: number; value: number }[] = [];
  
  for (const row of rows) {
    const timeVal = parseDateValue(row[timeCol] || '');
    const numVal = cleanNumericValue(row[valueCol] || '');
    
    if (timeVal > 0 && !isNaN(numVal) && isFinite(numVal)) {
      sortedData.push({ time: timeVal, value: numVal });
    }
  }
  
  if (sortedData.length < 5) return null;
  
  sortedData.sort((a, b) => a.time - b.time);
  
  const values = sortedData.map(d => d.value);
  const n = values.length;
  const xIndices = Array.from({ length: n }, (_, i) => i);
  
  const xMean = (n - 1) / 2;
  const yMean = ss.mean(values);
  
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (xIndices[i] - xMean) * (values[i] - yMean);
    denominator += (xIndices[i] - xMean) ** 2;
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  
  const overallStdDev = ss.standardDeviation(values);
  const volatility = overallStdDev / Math.abs(yMean || 1);
  
  const firstValue = values[0];
  const lastValue = values[n - 1];
  const percentChange = ((lastValue - firstValue) / Math.abs(firstValue || 1)) * 100;
  
  let direction: Trend['direction'];
  let description: string;

  if (volatility > 0.5) {
    direction = 'volatile';
    description = `${valueCol} fluctuates significantly over time.`;
  } else if (slope > 0 && percentChange > 5) {
    direction = 'increasing';
    description = `${valueCol} grew by ${percentChange.toFixed(0)}% over the period.`;
  } else if (slope < 0 && percentChange < -5) {
    direction = 'decreasing';
    description = `${valueCol} declined by ${Math.abs(percentChange).toFixed(0)}% over the period.`;
  } else {
    direction = 'stable';
    description = `${valueCol} remained relatively stable.`;
  }

  return { dateColumn: timeCol, valueColumn: valueCol, direction, rateOfChange: percentChange, description };
}

function assessDataQuality(rows: Record<string, string>[], columns: ColumnInfo[]): DataQuality {
  const rowStrings = rows.map(r => JSON.stringify(r));
  const uniqueRows = new Set(rowStrings);
  const duplicateRows = rows.length - uniqueRows.size;

  const columnsWithMissing = columns
    .filter(c => c.missingPercent > 5)
    .map(c => ({ column: c.name, missingCount: c.missingCount, missingPercent: c.missingPercent }))
    .sort((a, b) => b.missingPercent - a.missingPercent);

  return { totalRows: rows.length, duplicateRows, columnsWithMissing };
}

interface ChartCandidate {
  type: ChartConfig['type'];
  title: string;
  xAxis: string;
  yAxis?: string;
  data: Record<string, string | number>[];
  priority: number;
  reason: string;
  yAxisSemanticType?: string;
  yAxisUnit?: string;
}

function parseDateValue(value: string): number {
  if (!value) return 0;
  const trimmed = value.trim();
  
  const monthNames: Record<string, number> = {
    'jan': 0, 'january': 0, 'feb': 1, 'february': 1, 'mar': 2, 'march': 2,
    'apr': 3, 'april': 3, 'may': 4, 'jun': 5, 'june': 5,
    'jul': 6, 'july': 6, 'aug': 7, 'august': 7, 'sep': 8, 'september': 8,
    'oct': 9, 'october': 9, 'nov': 10, 'november': 10, 'dec': 11, 'december': 11
  };
  
  const monthYearMatch = trimmed.match(/^(\w+)\s+(\d{4})$/i);
  if (monthYearMatch) {
    const month = monthNames[monthYearMatch[1].toLowerCase()];
    if (month !== undefined) {
      return new Date(parseInt(monthYearMatch[2]), month, 1).getTime();
    }
  }
  
  if (/^\d{4}$/.test(trimmed)) {
    return new Date(parseInt(trimmed), 0, 1).getTime();
  }
  
  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    return parsed;
  }
  
  return 0;
}

function generateSmartCharts(columns: ColumnInfo[], rows: Record<string, string>[]): ChartConfig[] {
  const candidates: ChartCandidate[] = [];
  let chartId = 0;

  const temporalCols = columns.filter(c => c.baseType === 'temporal');
  const numericCols = columns.filter(c => c.baseType === 'numeric' && c.semanticType !== 'id');
  const categoricalCols = columns.filter(c => c.baseType === 'categorical' && c.cardinality <= 20);
  const currencyCols = numericCols.filter(c => c.semanticType === 'currency');
  const countCols = numericCols.filter(c => c.semanticType === 'count');
  const percentCols = numericCols.filter(c => c.semanticType === 'percentage');
  
  // Detect Period column (from pivot operations) and treat it as a pseudo-temporal column
  const periodCol = columns.find(c => c.name === 'Period');
  const valueCol = columns.find(c => c.name === 'Value' && c.baseType === 'numeric');

  for (const timeCol of temporalCols) {
    const priorityNumerics = [...currencyCols, ...countCols, ...percentCols];
    const otherNumerics = numericCols.filter(c => !priorityNumerics.includes(c));
    const orderedNumerics = [...priorityNumerics, ...otherNumerics];

    for (const numCol of orderedNumerics.slice(0, 3)) {
      const data = rows.map(row => ({
        [timeCol.name]: row[timeCol.name],
        [numCol.name]: cleanNumericValue(row[numCol.name] || '0')
      })).filter(d => !isNaN(d[numCol.name] as number));

      data.sort((a, b) => {
        const dateA = parseDateValue(String(a[timeCol.name]));
        const dateB = parseDateValue(String(b[timeCol.name]));
        return dateA - dateB;
      });

      if (data.length > 2) {
        const priority = currencyCols.includes(numCol) ? 100 : countCols.includes(numCol) ? 90 : 70;
        candidates.push({
          type: 'line',
          title: `${numCol.name} Over Time`,
          xAxis: timeCol.name,
          yAxis: numCol.name,
          data,
          priority,
          reason: 'time_series',
          yAxisSemanticType: numCol.semanticType,
          yAxisUnit: numCol.unit
        });
      }
    }
  }

  // Handle pivoted data with Period and Value columns (time series from reshape)
  if (periodCol && valueCol) {
    // Find categorical columns that can be used for grouping (e.g., Company, Contact)
    const groupCols = columns.filter(c => 
      c.baseType === 'categorical' && 
      c.name !== 'Period' && 
      c.cardinality > 1 &&
      c.cardinality <= 50
    );

    // Create a time series line chart showing Value over Period
    const periodData: Record<string, number[]> = {};
    for (const row of rows) {
      const period = row['Period'] || '';
      const value = cleanNumericValue(row['Value'] || '0');
      if (!isNaN(value) && period) {
        if (!periodData[period]) periodData[period] = [];
        periodData[period].push(value);
      }
    }

    // Aggregate by period (sum values for each period)
    const aggregatedPeriodData = Object.entries(periodData)
      .map(([period, values]) => ({
        Period: period,
        Value: ss.sum(values)
      }));

    if (aggregatedPeriodData.length > 2) {
      candidates.push({
        type: 'line',
        title: 'Value Over Periods',
        xAxis: 'Period',
        yAxis: 'Value',
        data: aggregatedPeriodData,
        priority: 95,
        reason: 'time_series',
        yAxisSemanticType: valueCol?.semanticType,
        yAxisUnit: valueCol?.unit
      });
    }

    // If we have a grouping column, create a grouped bar chart
    if (groupCols.length > 0) {
      const groupCol = groupCols[0];
      const groupedData: Record<string, number[]> = {};
      
      for (const row of rows) {
        const group = row[groupCol.name] || 'Unknown';
        const value = cleanNumericValue(row['Value'] || '0');
        if (!isNaN(value)) {
          if (!groupedData[group]) groupedData[group] = [];
          groupedData[group].push(value);
        }
      }

      const barData = Object.entries(groupedData)
        .map(([group, values]) => ({
          [groupCol.name]: group,
          Value: ss.sum(values)
        }))
        .sort((a, b) => b.Value - a.Value)
        .slice(0, 15);

      if (barData.length > 1) {
        candidates.push({
          type: 'bar',
          title: `Total Value by ${groupCol.name}`,
          xAxis: groupCol.name,
          yAxis: 'Value',
          data: barData,
          priority: 90,
          reason: 'category_breakdown',
          yAxisSemanticType: valueCol?.semanticType,
          yAxisUnit: valueCol?.unit
        });
      }
    }
  }

  for (const catCol of categoricalCols.slice(0, 2)) {
    const priorityNumerics = [...currencyCols, ...countCols];
    const numericToAggregate = priorityNumerics.length > 0 ? priorityNumerics[0] : numericCols[0];
    
    if (!numericToAggregate) continue;

    const aggregated: Record<string, number[]> = {};
    for (const row of rows) {
      const category = row[catCol.name] || 'Unknown';
      const value = cleanNumericValue(row[numericToAggregate.name] || '0');
      if (!isNaN(value)) {
        if (!aggregated[category]) aggregated[category] = [];
        aggregated[category].push(value);
      }
    }

    const isCurrency = numericToAggregate.semanticType === 'currency';
    const isCount = numericToAggregate.semanticType === 'count';
    
    const data = Object.entries(aggregated)
      .map(([category, values]) => ({
        [catCol.name]: category,
        [numericToAggregate.name]: isCount ? ss.sum(values) : ss.mean(values)
      }))
      .sort((a, b) => (b[numericToAggregate.name] as number) - (a[numericToAggregate.name] as number))
      .slice(0, 15);

    if (data.length > 1) {
      const action = isCount ? 'Total' : 'Average';
      candidates.push({
        type: 'bar',
        title: `${action} ${numericToAggregate.name} by ${catCol.name}`,
        xAxis: catCol.name,
        yAxis: numericToAggregate.name,
        data,
        priority: isCurrency || isCount ? 85 : 60,
        reason: 'category_breakdown',
        yAxisSemanticType: numericToAggregate.semanticType,
        yAxisUnit: numericToAggregate.unit
      });
    }
  }

  // For small datasets, be more lenient with cardinality requirement
  const minCardinality = rows.length < 20 ? 2 : 5;
  const meaningfulNumerics = numericCols.filter(c => 
    c.semanticType !== 'latitude' && 
    c.semanticType !== 'longitude' &&
    c.cardinality >= minCardinality
  );

  for (let i = 0; i < meaningfulNumerics.length && i < 2; i++) {
    for (let j = i + 1; j < meaningfulNumerics.length && j < 3; j++) {
      const col1 = meaningfulNumerics[i];
      const col2 = meaningfulNumerics[j];

      const data = rows
        .map(row => ({
          [col1.name]: cleanNumericValue(row[col1.name] || '0'),
          [col2.name]: cleanNumericValue(row[col2.name] || '0')
        }))
        .filter(d => !isNaN(d[col1.name] as number) && !isNaN(d[col2.name] as number))
        .slice(0, 200);

      if (data.length > 5) {
        candidates.push({
          type: 'scatter',
          title: `${col1.name} vs ${col2.name}`,
          xAxis: col1.name,
          yAxis: col2.name,
          data,
          priority: 50,
          reason: 'correlation'
        });
      }
    }
  }

  for (const numCol of meaningfulNumerics.slice(0, 2)) {
    const values = getNumericValues(rows, numCol.name);
    // Lower threshold for small datasets - need at least 3 values for a histogram
    if (values.length < 3) continue;

    const min = ss.min(values);
    const max = ss.max(values);
    const binCount = Math.min(12, Math.ceil(Math.sqrt(values.length)));
    const binWidth = (max - min) / binCount;
    if (binWidth === 0) continue;

    const bins: Record<string, number> = {};
    for (let i = 0; i < binCount; i++) {
      const binStart = min + i * binWidth;
      const binEnd = binStart + binWidth;
      bins[`${binStart.toFixed(0)}-${binEnd.toFixed(0)}`] = 0;
    }

    for (const value of values) {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), binCount - 1);
      const binStart = min + binIndex * binWidth;
      const binEnd = binStart + binWidth;
      const label = `${binStart.toFixed(0)}-${binEnd.toFixed(0)}`;
      bins[label] = (bins[label] || 0) + 1;
    }

    const data = Object.entries(bins).map(([range, count]) => ({ range, count }));

    candidates.push({
      type: 'histogram',
      title: `Distribution of ${numCol.name}`,
      xAxis: 'range',
      yAxis: 'count',
      data,
      priority: 40,
      reason: 'distribution'
    });
  }

  candidates.sort((a, b) => b.priority - a.priority);

  const uniqueCharts: ChartConfig[] = [];
  const seenTypes = new Set<string>();

  for (const candidate of candidates) {
    if (uniqueCharts.length >= 6) break;
    
    const isTimeSeries = candidate.reason === 'time_series';
    const key = isTimeSeries 
      ? `${candidate.type}-timeseries-${candidate.yAxis || ''}` 
      : `${candidate.type}-${candidate.xAxis}-${candidate.yAxis || ''}`;
    if (seenTypes.has(key)) continue;
    seenTypes.add(key);

    // Calculate domain bounds with padding for better visibility
    let domainMin: number | undefined;
    let domainMax: number | undefined;
    
    if (candidate.yAxis && candidate.data.length > 0) {
      const yValues = candidate.data
        .map(d => typeof d[candidate.yAxis!] === 'number' ? d[candidate.yAxis!] as number : NaN)
        .filter(v => !isNaN(v));
      
      if (yValues.length > 0) {
        const min = Math.min(...yValues);
        const max = Math.max(...yValues);
        const range = max - min;
        
        // Add 10% padding to ensure bars/lines are visible
        const padding = range > 0 ? range * 0.1 : Math.abs(max) * 0.1 || 1;
        
        // For bar charts with non-negative data, start from 0 for proper proportions
        if ((candidate.type === 'bar' || candidate.type === 'histogram') && min >= 0) {
          domainMin = 0;
          domainMax = max + padding;
        } else {
          // For other charts or data with negative values, add padding on both ends
          domainMin = min >= 0 ? Math.max(0, min - padding) : min - padding;
          domainMax = max + padding;
        }
      }
    }

    uniqueCharts.push({
      id: `chart-${chartId++}`,
      type: candidate.type,
      title: candidate.title,
      xAxis: candidate.xAxis,
      yAxis: candidate.yAxis,
      data: candidate.data,
      priority: candidate.priority,
      yAxisSemanticType: candidate.yAxisSemanticType,
      yAxisUnit: candidate.yAxisUnit,
      domainMin,
      domainMax
    });
  }

  return uniqueCharts;
}

function generateSemanticInsights(
  columns: ColumnInfo[],
  numericStats: NumericStats[],
  correlations: Correlation[],
  trends: Trend[],
  outliers: Outlier[],
  dataQuality: DataQuality
): Insight[] {
  const insights: Insight[] = [];

  const currencyStats = numericStats.filter(s => s.semanticType === 'currency');
  for (const stat of currencyStats) {
    insights.push({
      type: 'summary',
      icon: 'dollar-sign',
      title: `${stat.column} Summary`,
      description: `Total: ${stat.unit}${stat.total.toLocaleString()}, Average: ${stat.unit}${stat.mean.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      importance: 'high'
    });
  }

  for (const trend of trends) {
    if (trend.direction === 'increasing' || trend.direction === 'decreasing') {
      insights.push({
        type: 'trend',
        icon: trend.direction === 'increasing' ? 'trending-up' : 'trending-down',
        title: `${trend.valueColumn} is ${trend.direction}`,
        description: trend.description,
        importance: 'high'
      });
    }
  }

  for (const corr of correlations) {
    if (corr.strength === 'strong_positive' || corr.strength === 'strong_negative') {
      insights.push({
        type: 'correlation',
        icon: 'link',
        title: `${corr.column1} & ${corr.column2} are linked`,
        description: corr.description,
        importance: 'medium'
      });
    }
  }

  const outliersByColumn: Record<string, Outlier[]> = {};
  for (const o of outliers) {
    if (!outliersByColumn[o.column]) outliersByColumn[o.column] = [];
    outliersByColumn[o.column].push(o);
  }

  for (const column of Object.keys(outliersByColumn)) {
    const colOutliers = outliersByColumn[column];
    insights.push({
      type: 'outlier',
      icon: 'alert-triangle',
      title: `${colOutliers.length} outlier${colOutliers.length > 1 ? 's' : ''} in ${column}`,
      description: `Values significantly outside the normal range detected.`,
      importance: colOutliers.some((o: Outlier) => o.zScore > 3) ? 'high' : 'medium'
    });
  }

  if (dataQuality.duplicateRows > 0) {
    insights.push({
      type: 'quality',
      icon: 'copy',
      title: `${dataQuality.duplicateRows} duplicate rows`,
      description: `Your data contains duplicate entries that may affect analysis accuracy.`,
      importance: dataQuality.duplicateRows > dataQuality.totalRows * 0.1 ? 'high' : 'low'
    });
  }

  if (dataQuality.columnsWithMissing.length > 0) {
    const worstCol = dataQuality.columnsWithMissing[0];
    insights.push({
      type: 'quality',
      icon: 'alert-circle',
      title: `Missing data detected`,
      description: `${worstCol.column} has ${worstCol.missingPercent.toFixed(0)}% missing values.`,
      importance: worstCol.missingPercent > 20 ? 'high' : 'low'
    });
  }

  return insights.slice(0, 8);
}

export function analyzeData(parsedData: ParsedData, fileName: string, uniqueColumns: string[] = []): AnalysisResult {
  const { headers, rows } = parsedData;

  const columns: ColumnInfo[] = headers.map(header => {
    const values = getColumnValues(rows, header);
    const nonEmpty = values.filter(v => v !== '');
    const uniqueValues = new Set(nonEmpty);
    const { baseType, semanticType, format, unit } = detectSemanticType(values, header);
    
    // Override semanticType to 'id' if column is marked as unique/identifier
    const finalSemanticType = uniqueColumns.includes(header) ? 'id' : semanticType;
    
    return {
      name: header,
      baseType,
      semanticType: finalSemanticType,
      format,
      unit,
      cardinality: uniqueValues.size,
      missingCount: values.length - nonEmpty.length,
      missingPercent: ((values.length - nonEmpty.length) / values.length) * 100,
      uniquePercent: (uniqueValues.size / Math.max(nonEmpty.length, 1)) * 100,
      sampleValues: nonEmpty.slice(0, 5)
    };
  });

  const numericColumns = columns.filter(c => c.baseType === 'numeric');
  const temporalColumns = columns.filter(c => c.baseType === 'temporal');
  
  // Filter out ID columns from numeric calculations (correlations, trends, outliers, stats)
  const meaningfulNumerics = numericColumns.filter(c => c.semanticType !== 'id' && c.cardinality > 5);
  const nonIdNumericColumns = numericColumns.filter(c => c.semanticType !== 'id');

  const numericStats: NumericStats[] = nonIdNumericColumns.map(col => {
    const values = getNumericValues(rows, col.name);
    return calculateNumericStats(col.name, values, col.semanticType, col.unit);
  });

  const correlations: Correlation[] = [];
  for (let i = 0; i < meaningfulNumerics.length; i++) {
    for (let j = i + 1; j < meaningfulNumerics.length; j++) {
      const { values1, values2 } = getPairedNumericValues(rows, meaningfulNumerics[i].name, meaningfulNumerics[j].name);
      const corr = calculateCorrelation(meaningfulNumerics[i].name, values1, meaningfulNumerics[j].name, values2);
      if (corr && corr.strength !== 'none') {
        correlations.push(corr);
      }
    }
  }

  const trends: Trend[] = [];
  if (temporalColumns.length > 0) {
    const timeCol = temporalColumns[0];
    for (const numCol of nonIdNumericColumns.slice(0, 4)) {
      const trend = detectTrend(timeCol.name, numCol.name, rows);
      if (trend && trend.direction !== 'stable') {
        trends.push(trend);
      }
    }
  }

  const outliers: Outlier[] = [];
  for (const numCol of meaningfulNumerics) {
    const columnOutliers = detectOutliers(numCol.name, rows);
    outliers.push(...columnOutliers);
  }

  const dataQuality = assessDataQuality(rows, columns);
  // generateSmartCharts already filters ID columns internally
  const charts = generateSmartCharts(columns, rows);
  const insights = generateSemanticInsights(columns, numericStats, correlations, trends, outliers, dataQuality);
  // runStatisticalTests uses categorical columns, pass full list but it already filters internally
  const statisticalTests = runStatisticalTests(columns, rows);

  const rawData = rows.map(row => {
    const cleanedRow: Record<string, string> = {};
    for (const col of columns) {
      const value = row[col.name] || '';
      cleanedRow[col.name] = value.trim();
    }
    return cleanedRow;
  });

  return {
    fileName,
    rowCount: rows.length,
    columnCount: columns.length,
    columns,
    numericStats,
    correlations: correlations.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient)).slice(0, 5),
    trends,
    outliers,
    insights,
    charts,
    dataQuality,
    rawData,
    statisticalTests
  };
}
