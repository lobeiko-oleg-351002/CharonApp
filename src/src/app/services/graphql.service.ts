import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map } from 'rxjs';
import { Metric, MetricsAggregation, MetricFilter, DailyAverageMetric } from '../models/metric.model';

const GET_METRICS = gql`
  query GetMetrics($first: Int, $after: String, $where: MetricFilterInput, $order: [MetricSortInput!]) {
    metrics(first: $first, after: $after, where: $where, order: $order) {
      edges {
        node {
          id
          type
          name
          # payload removed to reduce GraphQL complexity
          # Use REST API or getMetricById if payload is needed
          createdAt
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
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
    }
  }
`;

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
      # averageValues removed to reduce GraphQL complexity
      # Will be calculated on frontend from individual metrics if needed
    }
  }
`;

@Injectable({
  providedIn: 'root'
})
export class GraphQLService {
  constructor(private apollo: Apollo) {}

  getMetrics(first: number = 10, after?: string, filter?: MetricFilter): Observable<{ metrics: Metric[]; totalCount: number; pageInfo: { hasNextPage: boolean; endCursor?: string } }> {
    // DISABLED: GraphQL getMetrics is disabled due to complexity issues
    // Even without dates and payload, GraphQL queries exceed complexity limits
    // Use RestService.getMetrics() or RestService.getAllMetrics() instead
    
    console.error('GraphQL getMetrics is disabled. Use RestService instead.');
    throw new Error('GraphQL getMetrics is disabled due to complexity issues. Use RestService.getMetrics() or RestService.getAllMetrics() instead.');
    
    // Old implementation kept for reference but will never execute
    /*
    if (filter?.fromDate || filter?.toDate) {
      console.error('GraphQL getMetrics called with date filters! Use REST API instead.');
      throw new Error('GraphQL does not support date filters. Use RestService.getMetrics() for date-filtered queries.');
    }
    
    const where: any = {};
    if (filter?.type) {
      where.type = { eq: filter.type };
    }
    if (filter?.name) {
      where.name = { contains: filter.name };
    }

    const whereVariable = Object.keys(where).length > 0 ? where : undefined;

    return this.apollo.query<{ metrics: { edges: Array<{ node: Metric }>; pageInfo: { hasNextPage: boolean; endCursor?: string }; totalCount?: number } }>({
      query: GET_METRICS,
      variables: { 
        first, 
        after: after || null, 
        where: whereVariable
      },
      fetchPolicy: 'network-only'
    }).pipe(
      map(result => ({
        metrics: result.data.metrics.edges.map(edge => ({
          ...edge.node,
          payload: {}
        })),
        totalCount: result.data.metrics.totalCount ?? result.data.metrics.edges.length,
        pageInfo: result.data.metrics.pageInfo
      }))
    );
    */
  }

  getLatestMetrics(limit: number = 5): Observable<Metric[]> {
    // DISABLED: GraphQL getLatestMetrics is disabled due to complexity issues
    // Use RestService.getMetrics() instead
    console.error('GraphQL getLatestMetrics is disabled. Use RestService instead.');
    throw new Error('GraphQL getLatestMetrics is disabled due to complexity issues. Use RestService.getMetrics() instead.');
  }

  getMetricById(id: number): Observable<Metric | null> {
    return this.apollo.query<{ metricById: Metric | null }>({
      query: GET_METRIC_BY_ID,
      variables: { id },
      fetchPolicy: 'network-only'
    }).pipe(
      map(result => result.data.metricById)
    );
  }

  getMetricsByType(type: string): Observable<Metric[]> {
    return this.apollo.query<{ metricsByType: Metric[] }>({
      query: GET_METRICS_BY_TYPE,
      variables: { type },
      fetchPolicy: 'network-only'
    }).pipe(
      map(result => result.data.metricsByType)
    );
  }

  getMetricsAggregation(filter?: MetricFilter): Observable<MetricsAggregation> {
    return this.apollo.query<{ metricsAggregation: MetricsAggregation }>({
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
    return this.apollo.query<{ dailyAverageMetrics: DailyAverageMetric[] }>({
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
}
