import * as ss from 'simple-statistics';
import type { 
  ColumnInfo, 
  ColumnType, 
  NumericStats, 
  Correlation, 
  Trend, 
  Outlier,
  Insight, 
  ChartConfig,
  AnalysisResult 
} from '@shared/schema';

interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
}

function detectColumnType(values: string[]): ColumnType {
  const nonEmpty = values.filter(v => v !== '' && v !== null && v !== undefined);
  if (nonEmpty.length === 0) return 'text';

  const sampleSize = Math.min(nonEmpty.length, 100);
  const sample = nonEmpty.slice(0, sampleSize);

  let numericCount = 0;
  let dateCount = 0;
  let booleanCount = 0;

  for (const value of sample) {
    const trimmed = value.trim().toLowerCase();
    
    if (trimmed === 'true' || trimmed === 'false' || trimmed === 'yes' || trimmed === 'no' || trimmed === '1' || trimmed === '0') {
      booleanCount++;
    }
    
    const num = parseFloat(value.replace(/,/g, ''));
    if (!isNaN(num) && isFinite(num)) {
      numericCount++;
    }
    
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/,
      /^\d{2}\/\d{2}\/\d{4}$/,
      /^\d{2}-\d{2}-\d{4}$/,
      /^\d{4}\/\d{2}\/\d{2}$/,
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
      /^\w{3}\s+\d{1,2},?\s+\d{4}$/,
    ];
    
    if (datePatterns.some(p => p.test(trimmed))) {
      dateCount++;
    }
  }

  const threshold = sampleSize * 0.7;

  if (dateCount >= threshold) return 'date';
  if (booleanCount >= threshold) return 'boolean';
  if (numericCount >= threshold) return 'numeric';
  
  const uniqueValues = new Set(sample);
  if (uniqueValues.size <= Math.min(20, sampleSize * 0.3)) {
    return 'categorical';
  }

  return 'text';
}

function getColumnValues(rows: Record<string, string>[], column: string): string[] {
  return rows.map(row => row[column] || '');
}

function getNumericValues(rows: Record<string, string>[], column: string): number[] {
  return rows
    .map(row => parseFloat((row[column] || '').replace(/,/g, '')))
    .filter(n => !isNaN(n) && isFinite(n));
}

function calculateNumericStats(column: string, values: number[]): NumericStats {
  if (values.length === 0) {
    return {
      column,
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      stdDev: 0,
      total: 0,
      count: 0
    };
  }

  return {
    column,
    mean: ss.mean(values),
    median: ss.median(values),
    min: ss.min(values),
    max: ss.max(values),
    stdDev: values.length > 1 ? ss.standardDeviation(values) : 0,
    total: ss.sum(values),
    count: values.length
  };
}

function calculateCorrelation(col1: string, values1: number[], col2: string, values2: number[]): Correlation | null {
  const minLength = Math.min(values1.length, values2.length);
  if (minLength < 3) return null;

  const pairs: [number, number][] = [];
  for (let i = 0; i < minLength; i++) {
    if (!isNaN(values1[i]) && !isNaN(values2[i])) {
      pairs.push([values1[i], values2[i]]);
    }
  }

  if (pairs.length < 3) return null;

  try {
    const r = ss.sampleCorrelation(pairs.map(p => p[0]), pairs.map(p => p[1]));
    
    if (isNaN(r)) return null;

    let strength: Correlation['strength'];
    let description: string;

    if (r >= 0.7) {
      strength = 'strong_positive';
      description = `Strong positive correlation between ${col1} and ${col2}. As ${col1} increases, ${col2} tends to increase significantly.`;
    } else if (r >= 0.4) {
      strength = 'moderate_positive';
      description = `Moderate positive correlation between ${col1} and ${col2}. There's a noticeable tendency for both to move together.`;
    } else if (r >= 0.1) {
      strength = 'weak_positive';
      description = `Weak positive correlation between ${col1} and ${col2} (${r.toFixed(2)}). The relationship is subtle.`;
    } else if (r > -0.1) {
      strength = 'none';
      description = `No significant correlation between ${col1} and ${col2}. They appear to be independent.`;
    } else if (r >= -0.4) {
      strength = 'weak_negative';
      description = `Weak negative correlation between ${col1} and ${col2} (${r.toFixed(2)}). The inverse relationship is subtle.`;
    } else if (r >= -0.7) {
      strength = 'moderate_negative';
      description = `Moderate negative correlation between ${col1} and ${col2}. As one increases, the other tends to decrease.`;
    } else {
      strength = 'strong_negative';
      description = `Strong negative correlation between ${col1} and ${col2}. They move in opposite directions.`;
    }

    return {
      column1: col1,
      column2: col2,
      coefficient: r,
      strength,
      description
    };
  } catch {
    return null;
  }
}

function detectOutliers(column: string, rows: Record<string, string>[]): Outlier[] {
  const valuesWithIndex: { value: number; originalIndex: number }[] = [];
  
  for (let i = 0; i < rows.length; i++) {
    const rawValue = (rows[i][column] || '').replace(/,/g, '');
    const num = parseFloat(rawValue);
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
      const description = type === 'high'
        ? `Value ${value.toFixed(2)} in ${column} at row ${originalIndex + 1} is unusually high (${zScore.toFixed(1)} standard deviations above average)`
        : `Value ${value.toFixed(2)} in ${column} at row ${originalIndex + 1} is unusually low (${Math.abs(zScore).toFixed(1)} standard deviations below average)`;

      outliers.push({
        column,
        value,
        index: originalIndex,
        type,
        zScore: Math.abs(zScore),
        description
      });
    }
  }

  return outliers.sort((a, b) => b.zScore - a.zScore).slice(0, 10);
}

function detectTrend(dateCol: string, valueCol: string, rows: Record<string, string>[]): Trend | null {
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
    description = `${valueCol} shows high variability over time with frequent ups and downs.`;
  } else if (percentChange > 10) {
    direction = 'increasing';
    description = `${valueCol} shows a clear upward trend over time, increasing by approximately ${percentChange.toFixed(1)}%.`;
  } else if (percentChange < -10) {
    direction = 'decreasing';
    description = `${valueCol} shows a downward trend over time, decreasing by approximately ${Math.abs(percentChange).toFixed(1)}%.`;
  } else {
    direction = 'stable';
    description = `${valueCol} remains relatively stable over time with minimal overall change.`;
  }

  return {
    dateColumn: dateCol,
    valueColumn: valueCol,
    direction,
    rateOfChange: percentChange,
    description
  };
}

function generateInsights(
  columns: ColumnInfo[],
  numericStats: NumericStats[],
  correlations: Correlation[],
  trends: Trend[],
  outliers: Outlier[]
): Insight[] {
  const insights: Insight[] = [];

  for (const trend of trends) {
    if (trend.direction === 'increasing') {
      insights.push({
        type: 'trend',
        icon: 'trending-up',
        title: `Upward Trend Detected`,
        description: trend.description,
        importance: 'high'
      });
    } else if (trend.direction === 'decreasing') {
      insights.push({
        type: 'trend',
        icon: 'trending-down',
        title: `Downward Trend Detected`,
        description: trend.description,
        importance: 'high'
      });
    } else if (trend.direction === 'volatile') {
      insights.push({
        type: 'pattern',
        icon: 'activity',
        title: `High Variability`,
        description: trend.description,
        importance: 'medium'
      });
    }
  }

  for (const corr of correlations) {
    if (corr.strength === 'strong_positive' || corr.strength === 'strong_negative') {
      insights.push({
        type: 'correlation',
        icon: 'target',
        title: `Strong Correlation Found`,
        description: corr.description,
        importance: 'high'
      });
    } else if (corr.strength === 'moderate_positive' || corr.strength === 'moderate_negative') {
      insights.push({
        type: 'correlation',
        icon: 'target',
        title: `Moderate Correlation`,
        description: corr.description,
        importance: 'medium'
      });
    }
  }

  const outliersByColumn = new Map<string, Outlier[]>();
  for (const outlier of outliers) {
    const existing = outliersByColumn.get(outlier.column) || [];
    existing.push(outlier);
    outliersByColumn.set(outlier.column, existing);
  }

  for (const [column, columnOutliers] of outliersByColumn) {
    const highCount = columnOutliers.filter(o => o.type === 'high').length;
    const lowCount = columnOutliers.filter(o => o.type === 'low').length;
    
    let description = `Found ${columnOutliers.length} outlier${columnOutliers.length !== 1 ? 's' : ''} in ${column}`;
    if (highCount > 0 && lowCount > 0) {
      description += ` (${highCount} unusually high, ${lowCount} unusually low)`;
    } else if (highCount > 0) {
      description += ` with unusually high values`;
    } else {
      description += ` with unusually low values`;
    }
    description += '. These data points may warrant further investigation.';

    insights.push({
      type: 'outlier',
      icon: 'zap',
      title: `Outliers Detected in ${column}`,
      description,
      importance: columnOutliers.some(o => o.zScore > 3) ? 'high' : 'medium'
    });
  }

  for (const stat of numericStats) {
    const cv = stat.stdDev / Math.abs(stat.mean || 1);

    if (cv > 1) {
      insights.push({
        type: 'statistic',
        icon: 'zap',
        title: `High Variability in ${stat.column}`,
        description: `${stat.column} has a high coefficient of variation (${(cv * 100).toFixed(0)}%), indicating significant spread in the data.`,
        importance: 'medium'
      });
    }
  }

  return insights.slice(0, 10);
}

function generateCharts(
  columns: ColumnInfo[],
  rows: Record<string, string>[]
): ChartConfig[] {
  const charts: ChartConfig[] = [];
  let chartId = 0;

  const dateColumns = columns.filter(c => c.type === 'date');
  const numericColumns = columns.filter(c => c.type === 'numeric');
  const categoricalColumns = columns.filter(c => c.type === 'categorical');

  for (const dateCol of dateColumns) {
    for (const numCol of numericColumns.slice(0, 2)) {
      const data = rows.map(row => ({
        [dateCol.name]: row[dateCol.name],
        [numCol.name]: parseFloat((row[numCol.name] || '0').replace(/,/g, ''))
      })).filter(d => !isNaN(d[numCol.name]));

      if (data.length > 2) {
        charts.push({
          id: `chart-${chartId++}`,
          type: 'line',
          title: `${numCol.name} Over Time`,
          xAxis: dateCol.name,
          yAxis: numCol.name,
          data
        });
      }
    }
  }

  for (const catCol of categoricalColumns.slice(0, 2)) {
    for (const numCol of numericColumns.slice(0, 1)) {
      const aggregated: Record<string, number[]> = {};
      
      for (const row of rows) {
        const category = row[catCol.name] || 'Unknown';
        const value = parseFloat((row[numCol.name] || '0').replace(/,/g, ''));
        
        if (!isNaN(value)) {
          if (!aggregated[category]) aggregated[category] = [];
          aggregated[category].push(value);
        }
      }

      const data = Object.entries(aggregated)
        .map(([category, values]) => ({
          [catCol.name]: category,
          [numCol.name]: ss.mean(values)
        }))
        .slice(0, 15);

      if (data.length > 1) {
        charts.push({
          id: `chart-${chartId++}`,
          type: 'bar',
          title: `${numCol.name} by ${catCol.name}`,
          xAxis: catCol.name,
          yAxis: numCol.name,
          data
        });
      }
    }
  }

  if (numericColumns.length >= 2) {
    const col1 = numericColumns[0];
    const col2 = numericColumns[1];

    const data = rows
      .map(row => ({
        [col1.name]: parseFloat((row[col1.name] || '0').replace(/,/g, '')),
        [col2.name]: parseFloat((row[col2.name] || '0').replace(/,/g, ''))
      }))
      .filter(d => !isNaN(d[col1.name]) && !isNaN(d[col2.name]))
      .slice(0, 200);

    if (data.length > 5) {
      charts.push({
        id: `chart-${chartId++}`,
        type: 'scatter',
        title: `${col1.name} vs ${col2.name}`,
        xAxis: col1.name,
        yAxis: col2.name,
        data
      });
    }
  }

  for (const numCol of numericColumns.slice(0, 2)) {
    const values = getNumericValues(rows, numCol.name);
    if (values.length < 5) continue;

    const min = ss.min(values);
    const max = ss.max(values);
    const binCount = Math.min(15, Math.ceil(Math.sqrt(values.length)));
    const binWidth = (max - min) / binCount;

    if (binWidth === 0) continue;

    const bins: Record<string, number> = {};
    for (let i = 0; i < binCount; i++) {
      const binStart = min + i * binWidth;
      const binEnd = binStart + binWidth;
      const label = `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`;
      bins[label] = 0;
    }

    for (const value of values) {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), binCount - 1);
      const binStart = min + binIndex * binWidth;
      const binEnd = binStart + binWidth;
      const label = `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`;
      bins[label] = (bins[label] || 0) + 1;
    }

    const data = Object.entries(bins).map(([range, count]) => ({
      range,
      count
    }));

    charts.push({
      id: `chart-${chartId++}`,
      type: 'histogram',
      title: `Distribution of ${numCol.name}`,
      xAxis: 'range',
      yAxis: 'count',
      data
    });
  }

  return charts.slice(0, 6);
}

export function analyzeData(parsedData: ParsedData, fileName: string): AnalysisResult {
  const { headers, rows } = parsedData;

  const columns: ColumnInfo[] = headers.map(header => {
    const values = getColumnValues(rows, header);
    const type = detectColumnType(values);
    return {
      name: header,
      type,
      sampleValues: values.slice(0, 5)
    };
  });

  const numericColumns = columns.filter(c => c.type === 'numeric');
  const dateColumns = columns.filter(c => c.type === 'date');

  const numericStats: NumericStats[] = numericColumns.map(col => {
    const values = getNumericValues(rows, col.name);
    return calculateNumericStats(col.name, values);
  });

  const correlations: Correlation[] = [];
  for (let i = 0; i < numericColumns.length; i++) {
    for (let j = i + 1; j < numericColumns.length; j++) {
      const values1 = getNumericValues(rows, numericColumns[i].name);
      const values2 = getNumericValues(rows, numericColumns[j].name);
      const corr = calculateCorrelation(
        numericColumns[i].name,
        values1,
        numericColumns[j].name,
        values2
      );
      if (corr && corr.strength !== 'none') {
        correlations.push(corr);
      }
    }
  }

  const trends: Trend[] = [];
  if (dateColumns.length > 0) {
    for (const numCol of numericColumns.slice(0, 3)) {
      const trend = detectTrend(dateColumns[0].name, numCol.name, rows);
      if (trend) {
        trends.push(trend);
      }
    }
  }

  const outliers: Outlier[] = [];
  for (const numCol of numericColumns) {
    const columnOutliers = detectOutliers(numCol.name, rows);
    outliers.push(...columnOutliers);
  }

  const insights = generateInsights(columns, numericStats, correlations, trends, outliers);
  const charts = generateCharts(columns, rows);

  return {
    fileName,
    rowCount: rows.length,
    columnCount: columns.length,
    columns,
    numericStats,
    correlations: correlations.slice(0, 5),
    trends,
    outliers,
    insights,
    charts
  };
}
