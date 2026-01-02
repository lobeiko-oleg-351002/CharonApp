import { Metric } from './metric.model';

/**
 * Backend API response types
 */
export interface BackendPagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GraphQLMetricResponse {
  metricById: Metric | null;
}

export interface GraphQLMetricsByTypeResponse {
  metricsByType: Metric[];
}

export interface GraphQLMetricsAggregationResponse {
  metricsAggregation: {
    totalCount: number;
    typeAggregations: Array<{
      type: string;
      count: number;
    }>;
  };
}

import { DailyAverageMetric } from './metric.model';

export interface GraphQLDailyAverageMetricsResponse {
  dailyAverageMetrics: DailyAverageMetric[];
}

export interface GraphQLLatestMetricsResponse {
  metrics: {
    edges: Array<{
      node: Metric;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
}

