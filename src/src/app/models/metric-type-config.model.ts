export type VisualizationType = 'line' | 'bar' | 'gauge' | 'binary' | 'multi-series' | 'heatmap';

export interface MetricTypeConfig {
  type: string;
  visualization: VisualizationType;
  unit?: string;
  scale?: 'linear' | 'log' | 'auto';
  aggregation?: 'avg' | 'sum' | 'max' | 'min' | 'count';
  thresholds?: {
    min?: number;
    max?: number;
    critical?: number;
    warning?: number;
  };
  payloadKeys?: string[]; // для multi-series
  yAxisMin?: number;
  yAxisMax?: number;
}

export const METRIC_TYPE_CONFIGS: Record<string, MetricTypeConfig> = {
  motion: {
    type: 'motion',
    visualization: 'binary',
    unit: '',
    scale: 'linear',
    aggregation: 'count',
    payloadKeys: ['motionDetected']
  },
  energy: {
    type: 'energy',
    visualization: 'line',
    unit: 'W',
    scale: 'linear',
    aggregation: 'avg',
    payloadKeys: ['energy']
  },
  air_quality: {
    type: 'air_quality',
    visualization: 'multi-series',
    unit: '',
    scale: 'linear',
    aggregation: 'avg',
    payloadKeys: ['co2', 'pm25', 'humidity']
  }
};

export function getMetricTypeConfig(type: string): MetricTypeConfig {
  return METRIC_TYPE_CONFIGS[type.toLowerCase()] || {
    type: type,
    visualization: 'line',
    scale: 'linear',
    aggregation: 'avg'
  };
}

