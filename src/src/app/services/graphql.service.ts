import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map } from 'rxjs';
import { Metric, MetricsAggregation, MetricFilter } from '../models/metric.model';

const GET_METRICS = gql`
  query GetMetrics($first: Int, $after: String, $where: MetricFilterInput, $order: [MetricSortInput!]) {
    metrics(first: $first, after: $after, where: $where, order: $order) {
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
        startCursor
        endCursor
      }
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
  query GetMetricsAggregation($fromDate: DateTime, $toDate: DateTime, $type: String) {
    metricsAggregation(fromDate: $fromDate, toDate: $toDate, type: $type) {
      totalCount
      typeAggregations {
        type
        count
      }
    }
  }
`;

@Injectable({
  providedIn: 'root'
})
export class GraphQLService {
  constructor(private apollo: Apollo) {}

  getMetrics(first: number = 10, after?: string, filter?: MetricFilter): Observable<{ metrics: Metric[]; totalCount: number }> {
    const where: any = {};
    if (filter?.type) {
      where.type = { eq: filter.type };
    }
    if (filter?.fromDate) {
      where.createdAt = { ...where.createdAt, gte: filter.fromDate.toISOString() };
    }
    if (filter?.toDate) {
      where.createdAt = { ...where.createdAt, lte: filter.toDate.toISOString() };
    }

    return this.apollo.query<{ metrics: { edges: Array<{ node: Metric }> } }>({
      query: GET_METRICS,
      variables: { first, after: after || null, where: Object.keys(where).length > 0 ? where : undefined },
      fetchPolicy: 'network-only'
    }).pipe(
      map(result => ({
        metrics: result.data.metrics.edges.map(edge => edge.node),
        totalCount: result.data.metrics.edges.length // Use edges length as approximation
      }))
    );
  }

  getLatestMetrics(limit: number = 5): Observable<Metric[]> {
    return this.apollo.query<{ metrics: { edges: Array<{ node: Metric }> } }>({
      query: GET_LATEST_METRICS,
      variables: {
        first: limit,
        order: [{ createdAt: 'DESC' }]
      },
      fetchPolicy: 'network-only'
    }).pipe(
      map(result => result.data.metrics.edges.map(edge => edge.node))
    );
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
        type: filter?.type
      },
      fetchPolicy: 'network-only'
    }).pipe(
      map(result => result.data.metricsAggregation)
    );
  }
}
