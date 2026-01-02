import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError } from 'rxjs';
import { Metric, MetricFilter } from '../models/metric.model';

// Backend returns PagedResult with Items (capital I) - match C# naming
export interface PagedResult<T> {
  items: T[]; // Frontend uses lowercase for consistency
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Backend response format (C# naming)
interface BackendPagedResult<T> {
  items: T[]; // C# serializer converts Items to items in JSON
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

  constructor(private http: HttpClient) {}

  /**
   * Get metrics with filters via REST API
   * Use this for date-filtered queries to avoid GraphQL complexity issues
   */
  getMetrics(filter?: MetricFilter, page: number = 1, pageSize: number = 20): Observable<PagedResult<Metric>> {
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

    console.log(`REST API: GET ${this.apiUrl}`, params.toString());

    return this.http.get<any>(this.apiUrl, { params })
      .pipe(
        map(result => {
          console.log('REST API Response (raw):', result);
          console.log('REST API Response type:', typeof result);
          console.log('REST API Response keys:', result ? Object.keys(result) : 'null/undefined');
          
          if (!result) {
            console.error('REST API: Null or undefined response');
            throw new Error('Empty response from server');
          }
          
          // Handle response - ASP.NET Core should serialize Items as items with camelCase
          // But check both cases to be safe
          const items = result.items || result.Items || [];
          const response: PagedResult<Metric> = {
            items: Array.isArray(items) ? items : [],
            totalCount: result.totalCount || 0,
            page: result.page || page,
            pageSize: result.pageSize || pageSize,
            totalPages: result.totalPages || 0
          };
          console.log('REST API Response (parsed):', response);
          return response;
        }),
        // Handle HTTP errors
        catchError(error => {
          console.error('REST API Error:', error);
          console.error('REST API Error status:', error.status);
          console.error('REST API Error statusText:', error.statusText);
          console.error('REST API Error message:', error.message);
          console.error('REST API Error url:', error.url);
          
          // Check if response is HTML instead of JSON
          if (error.error && typeof error.error === 'string' && error.error.trim().startsWith('<!')) {
            console.error('REST API returned HTML instead of JSON! Response:', error.error.substring(0, 200));
            throw new Error('Server returned HTML instead of JSON. Check API endpoint URL and server configuration.');
          }
          
          if (error.error) {
            console.error('REST API Error body:', error.error);
          }
          throw error;
        })
      );
  }

  /**
   * Get all metrics matching filter (with pagination)
   * Fetches all pages automatically
   */
  getAllMetrics(filter?: MetricFilter, maxItems: number = 100): Observable<Metric[]> {
    return new Observable(observer => {
      const allMetrics: Metric[] = [];
      let currentPage = 1;
      const pageSize = 20;

      const fetchPage = () => {
        this.getMetrics(filter, currentPage, pageSize).subscribe({
          next: (result) => {
            console.log(`REST API: Fetched page ${currentPage}, got ${result.items.length} items, total: ${result.totalCount}`);
            allMetrics.push(...result.items);

            // Continue fetching if there are more pages and we haven't reached maxItems
            if (result.page < result.totalPages && allMetrics.length < maxItems) {
              currentPage++;
              fetchPage();
            } else {
              // Limit to maxItems
              const limitedMetrics = allMetrics.slice(0, maxItems);
              console.log(`REST API: Finished fetching, total: ${limitedMetrics.length} metrics`);
              observer.next(limitedMetrics);
              observer.complete();
            }
          },
          error: (err) => {
            console.error('REST API Error:', err);
            observer.error(err);
          }
        });
      };

      fetchPage();
    });
  }
}

