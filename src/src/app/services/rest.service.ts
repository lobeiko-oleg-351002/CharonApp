import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, expand, EMPTY, reduce, throwError } from 'rxjs';
import { Metric, MetricFilter, DailyAverageMetric } from '../models/metric.model';
import { BackendPagedResult } from '../models/api-response.model';
import { APP_CONSTANTS } from '../constants/app.constants';
import { ErrorHandlerService } from './error-handler.service';

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class RestService {
  private readonly apiUrl = '/api/metrics';

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService
  ) {}

  getMetrics(
    filter?: MetricFilter, 
    page: number = APP_CONSTANTS.PAGINATION.DEFAULT_PAGE, 
    pageSize: number = APP_CONSTANTS.PAGINATION.DEFAULT_PAGE_SIZE
  ): Observable<PagedResult<Metric>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (filter?.type) {
      params = params.set('type', filter.type);
    }
    if (filter?.name) {
      params = params.set('name', filter.name);
    }
    if (filter?.fromDate) {
      params = params.set('fromDate', filter.fromDate.toISOString());
    }
    if (filter?.toDate) {
      params = params.set('toDate', filter.toDate.toISOString());
    }

    return this.http.get<BackendPagedResult<Metric>>(this.apiUrl, { params })
      .pipe(
        map(result => {
          if (!result) {
            throw new Error('Empty response from server');
          }
          
          return {
            items: Array.isArray(result.items) ? result.items : [],
            totalCount: result.totalCount ?? 0,
            page: result.page ?? page,
            pageSize: result.pageSize ?? pageSize,
            totalPages: result.totalPages ?? 0
          };
        }),
        catchError((error: unknown) => {
          const appError = this.errorHandler.handleError(error);
          return throwError(() => appError);
        })
      );
  }

  getAllMetrics(
    filter?: MetricFilter, 
    maxItems: number = APP_CONSTANTS.PAGINATION.CHART_METRICS_LIMIT
  ): Observable<Metric[]> {
    const pageSize = APP_CONSTANTS.PAGINATION.DEFAULT_PAGE_SIZE;
    
    return this.getMetrics(filter, APP_CONSTANTS.PAGINATION.DEFAULT_PAGE, pageSize).pipe(
      expand(result => {
        const hasMorePages = result.page < result.totalPages;
        const hasReachedLimit = result.items.length >= maxItems;
        
        if (!hasMorePages || hasReachedLimit) {
          return EMPTY;
        }
        
        return this.getMetrics(filter, result.page + 1, pageSize);
      }),
      reduce((acc: Metric[], result) => {
        acc.push(...result.items);
        return acc;
      }, []),
      map(allMetrics => allMetrics.slice(0, maxItems))
    );
  }

  getDailyAverages(
    fromDate: Date,
    toDate: Date,
    filter?: MetricFilter
  ): Observable<DailyAverageMetric[]> {
    let params = new HttpParams()
      .set('fromDate', fromDate.toISOString())
      .set('toDate', toDate.toISOString());

    if (filter?.type) {
      params = params.set('type', filter.type);
    }
    if (filter?.name) {
      params = params.set('name', filter.name);
    }

    return this.http.get<DailyAverageMetric[]>(`${this.apiUrl}/daily-averages`, { params })
      .pipe(
        map(result => {
          if (!result) {
            throw new Error('Empty response from server');
          }
          
          return Array.isArray(result) ? result : [];
        }),
        catchError((error: unknown) => {
          const appError = this.errorHandler.handleError(error);
          return throwError(() => appError);
        })
      );
  }
}

