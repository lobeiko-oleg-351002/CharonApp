export interface Metric {
  id: number;
  type: string;
  name: string;
  payload: Record<string, any>;
  createdAt: string;
}

export interface MetricsAggregation {
  totalCount: number;
  typeAggregations: TypeAggregation[];
}

export interface TypeAggregation {
  type: string;
  count: number;
}

export interface MetricFilter {
  type?: string;
  fromDate?: Date;
  toDate?: Date;
  search?: string;
}

