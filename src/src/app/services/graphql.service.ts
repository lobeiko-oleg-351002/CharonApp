import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map } from 'rxjs';
import { Metric, MetricsAggregation, MetricFilter, DailyAverageMetric } from '../models/metric.model';
import { 
  GraphQLMetricResponse, 
  GraphQLMetricsByTypeResponse, 
  GraphQLMetricsAggregationResponse,
  GraphQLDailyAverageMetricsResponse,
  GraphQLLatestMetricsResponse
} from '../models/api-response.model';

const GET_METRIC_BY_ID = gql`
  query GetMetricById($id: Int!) {
    metricById(id: $id) {
      id
      type
      name
      payload
      createdAt
    }
  }
`;

const GET_METRICS_BY_TYPE = gql`
  query GetMetricsByType($type: String!) {
    metricsByType(type: $type) {
      id
      type
      name
      payload
      createdAt
    }
  }
`;

const GET_METRICS_AGGREGATION = gql`
  query GetMetricsAggregation($fromDate: DateTime, $toDate: DateTime, $type: String, $name: String) {
    metricsAggregation(fromDate: $fromDate, toDate: $toDate, type: $type, name: $name) {
      totalCount
      typeAggregations {
        type
        count
      }
    }
  }
`;

const GET_DAILY_AVERAGE_METRICS = gql`
  query GetDailyAverageMetrics($fromDate: DateTime!, $toDate: DateTime!, $type: String, $name: String) {
    dailyAverageMetrics(fromDate: $fromDate, toDate: $toDate, type: $type, name: $name) {
      date
      type
      name
      count
    }
  }
`;

const GET_LATEST_METRICS = gql`
  query GetLatestMetrics($first: Int, $order: [MetricSortInput!]) {
    metrics(first: $first, order: $order) {
      edges {
        node {
          id
          type
          name
          payload
          createdAt
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

@Injectable({
  providedIn: 'root'
})
export class GraphQLService {
  constructor(private apollo: Apollo) {}

  getMetricById(id: number): Observable<Metric | null> {
    return this.apollo.query<GraphQLMetricResponse>({
      query: GET_METRIC_BY_ID,
      variables: { id },
      fetchPolicy: 'network-only'
    }).pipe(
      map(result => result.data.metricById)
    );
  }

  getMetricsByType(type: string): Observable<Metric[]> {
    return this.apollo.query<GraphQLMetricsByTypeResponse>({
      query: GET_METRICS_BY_TYPE,
      variables: { type },
      fetchPolicy: 'network-only'
    }).pipe(
      map(result => result.data.metricsByType)
    );
  }

  getMetricsAggregation(filter?: MetricFilter): Observable<MetricsAggregation> {
    return this.apollo.query<GraphQLMetricsAggregationResponse>({
      query: GET_METRICS_AGGREGATION,
      variables: {
        fromDate: filter?.fromDate?.toISOString(),
        toDate: filter?.toDate?.toISOString(),
        type: filter?.type,
        name: filter?.name
      },
      fetchPolicy: 'network-only'
    }).pipe(
      map(result => result.data.metricsAggregation)
    );
  }

  getDailyAverageMetrics(fromDate: Date, toDate: Date, filter?: MetricFilter): Observable<DailyAverageMetric[]> {
    return this.apollo.query<GraphQLDailyAverageMetricsResponse>({
      query: GET_DAILY_AVERAGE_METRICS,
      variables: {
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
        type: filter?.type,
        name: filter?.name
      },
      fetchPolicy: 'network-only'
    }).pipe(
      map(result => result.data.dailyAverageMetrics)
    );
  }

  getLatestMetrics(count: number = 100, filter?: MetricFilter): Observable<Metric[]> {
    const order = [{ createdAt: 'DESC' }];
    const variables: any = {
      first: count,
      order: order
    };

    // Note: GraphQL GetMetrics supports filtering, but we'll apply filters in the query if needed
    // For now, we'll get latest metrics and filter client-side if needed
    
    return this.apollo.query<GraphQLLatestMetricsResponse>({
      query: GET_LATEST_METRICS,
      variables: variables,
      fetchPolicy: 'network-only'
    }).pipe(
      map(result => {
        // Extract nodes from edges
        let metrics = result.data.metrics.edges.map(edge => edge.node);
        
        // Apply client-side filtering if needed
        if (filter?.type) {
          metrics = metrics.filter(m => m.type === filter.type);
        }
        if (filter?.name) {
          metrics = metrics.filter(m => m.name.includes(filter.name!));
        }
        
        return metrics;
      })
    );
  }
}
