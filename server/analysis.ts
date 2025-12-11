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
  DataQuality
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
  const cleaned = value.replace(/[\$\€\£\¥,%\s]/g, '');
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
    if (PHONE_REGEX.test(trimmed)) {
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
  const minLength = Math.min(values1.length, values2.length);
  if (minLength < 5) return null;

  const pairs: [number, number][] = [];
  for (let i = 0; i < minLength; i++) {
    if (!isNaN(values1[i]) && !isNaN(values2[i])) {
      pairs.push([values1[i], values2[i]]);
    }
  }
  if (pairs.length < 5) return null;

  try {
    const r = ss.sampleCorrelation(pairs.map(p => p[0]), pairs.map(p => p[1]));
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
  const values = getNumericValues(rows, valueCol);
  if (values.length < 5) return null;

  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  const firstAvg = ss.mean(firstHalf);
  const secondAvg = ss.mean(secondHalf);
  const overallStdDev = ss.standardDeviation(values);
  const overallMean = ss.mean(values);

  const percentChange = ((secondAvg - firstAvg) / Math.abs(firstAvg || 1)) * 100;
  const volatility = overallStdDev / Math.abs(overallMean || 1);

  let direction: Trend['direction'];
  let description: string;

  if (volatility > 0.5) {
    direction = 'volatile';
    description = `${valueCol} fluctuates significantly over time.`;
  } else if (percentChange > 10) {
    direction = 'increasing';
    description = `${valueCol} grew by ${percentChange.toFixed(0)}% over the period.`;
  } else if (percentChange < -10) {
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

  for (const timeCol of temporalCols) {
    const priorityNumerics = [...currencyCols, ...countCols, ...percentCols];
    const otherNumerics = numericCols.filter(c => !priorityNumerics.includes(c));
    const orderedNumerics = [...priorityNumerics, ...otherNumerics];

    for (const numCol of orderedNumerics.slice(0, 3)) {
      const data = rows.map(row => ({
        [timeCol.name]: row[timeCol.name],
        [numCol.name]: cleanNumericValue(row[numCol.name] || '0')
      })).filter(d => !isNaN(d[numCol.name] as number));

      if (data.length > 2) {
        const priority = currencyCols.includes(numCol) ? 100 : countCols.includes(numCol) ? 90 : 70;
        candidates.push({
          type: 'line',
          title: `${numCol.name} Over Time`,
          xAxis: timeCol.name,
          yAxis: numCol.name,
          data,
          priority,
          reason: 'time_series'
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
        reason: 'category_breakdown'
      });
    }
  }

  const meaningfulNumerics = numericCols.filter(c => 
    c.semanticType !== 'latitude' && 
    c.semanticType !== 'longitude' &&
    c.cardinality > 5
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
    if (values.length < 10) continue;

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
    
    const key = `${candidate.type}-${candidate.xAxis}-${candidate.yAxis || ''}`;
    if (seenTypes.has(key)) continue;
    seenTypes.add(key);

    uniqueCharts.push({
      id: `chart-${chartId++}`,
      type: candidate.type,
      title: candidate.title,
      xAxis: candidate.xAxis,
      yAxis: candidate.yAxis,
      data: candidate.data,
      priority: candidate.priority
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

export function analyzeData(parsedData: ParsedData, fileName: string): AnalysisResult {
  const { headers, rows } = parsedData;

  const columns: ColumnInfo[] = headers.map(header => {
    const values = getColumnValues(rows, header);
    const nonEmpty = values.filter(v => v !== '');
    const uniqueValues = new Set(nonEmpty);
    const { baseType, semanticType, format, unit } = detectSemanticType(values, header);
    
    return {
      name: header,
      baseType,
      semanticType,
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

  const numericStats: NumericStats[] = numericColumns.map(col => {
    const values = getNumericValues(rows, col.name);
    return calculateNumericStats(col.name, values, col.semanticType, col.unit);
  });

  const correlations: Correlation[] = [];
  const meaningfulNumerics = numericColumns.filter(c => c.semanticType !== 'id' && c.cardinality > 5);
  for (let i = 0; i < meaningfulNumerics.length; i++) {
    for (let j = i + 1; j < meaningfulNumerics.length; j++) {
      const values1 = getNumericValues(rows, meaningfulNumerics[i].name);
      const values2 = getNumericValues(rows, meaningfulNumerics[j].name);
      const corr = calculateCorrelation(meaningfulNumerics[i].name, values1, meaningfulNumerics[j].name, values2);
      if (corr && corr.strength !== 'none') {
        correlations.push(corr);
      }
    }
  }

  const trends: Trend[] = [];
  if (temporalColumns.length > 0) {
    const timeCol = temporalColumns[0];
    for (const numCol of numericColumns.slice(0, 4)) {
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
  const charts = generateSmartCharts(columns, rows);
  const insights = generateSemanticInsights(columns, numericStats, correlations, trends, outliers, dataQuality);

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
    dataQuality
  };
}
