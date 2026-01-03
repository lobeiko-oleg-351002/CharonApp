import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GraphQLService } from '../../services/graphql.service';
import { RestService } from '../../services/rest.service';
import { SignalRService } from '../../services/signalr.service';
import { ErrorHandlerService } from '../../services/error-handler.service';
import { Metric, MetricsAggregation, MetricFilter, DailyAverageMetric } from '../../models/metric.model';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { LatestValuesComponent } from '../latest-values/latest-values.component';
import { MetricsChartComponent } from '../metrics-chart/metrics-chart.component';
import { AggregationsComponent } from '../aggregations/aggregations.component';
import { FilterPanelComponent } from '../filter-panel/filter-panel.component';
import { DailyAveragesTableComponent } from '../daily-averages-table/daily-averages-table.component';
import { LocationSelectorComponent } from '../location-selector/location-selector.component';
import { AdaptiveChartComponent } from '../adaptive-chart/adaptive-chart.component';
import { getMetricTypeConfig } from '../../models/metric-type-config.model';
import { APP_CONSTANTS } from '../../constants/app.constants';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LatestValuesComponent,
    MetricsChartComponent,
    AggregationsComponent,
    FilterPanelComponent,
    DailyAveragesTableComponent,
    LocationSelectorComponent,
    AdaptiveChartComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  latestMetrics: Metric[] = [];
  chartMetrics: Metric[] = []; // Metrics for chart (from GraphQL at startup + SignalR updates, or daily averages when date filtered)
  dailyAverages: DailyAverageMetric[] = []; // Daily average metrics for chart (when date filtered)
  realTimeMetrics: Metric[] = []; // Real-time metrics received via SignalR (added to chartMetrics in real-time mode)
  aggregation: MetricsAggregation | null = null;
  loading = false;
  error: string | null = null;
  filter: MetricFilter = {};
  chartDateRange: { fromDate?: Date; toDate?: Date } = {}; // Separate date range for chart
  selectedLocation: string | null = null; // Selected location for filtering charts
  
  // Grouped metrics by type for adaptive charts
  metricsByType: Record<string, Metric[]> = {};

  private destroy$ = new Subject<void>();

  constructor(
    private graphQLService: GraphQLService,
    private restService: RestService,
    private signalRService: SignalRService,
    private errorHandler: ErrorHandlerService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.loadChartData();
    this.setupSignalRUpdates();
    this.signalRService.startConnection().catch(err => {
      const appError = this.errorHandler.handleError(err);
      console.error('Failed to start SignalR connection:', appError);
    });
    // Initialize metrics grouping (will be updated when data loads)
    this.groupMetricsByType();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.signalRService.stopConnection().catch(err => {
      console.error('Error stopping SignalR connection:', err);
    });
  }

  private loadData(): void {
    this.loading = true;
    this.error = null;

    // Use GraphQL to get latest 50 metrics at startup (max allowed by server)
    // These metrics are used for both Latest Values section and Chart (when no date filter)
    const filterToUse = this.buildFilter(this.filter.type, this.filter.name);
    this.graphQLService.getLatestMetrics(50, filterToUse)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (metrics) => {
          // Take only the latest 5 for display in Latest Values section
          this.latestMetrics = metrics.slice(0, APP_CONSTANTS.PAGINATION.LATEST_METRICS_LIMIT);
          
          // If no date filter, use these metrics for chart (real-time mode)
          if (!this.chartDateRange.fromDate || !this.chartDateRange.toDate) {
            // Normalize dates to ISO string format for consistent sorting
            this.chartMetrics = metrics
              .map(m => ({
                ...m,
                createdAt: new Date(m.createdAt).toISOString()
              }))
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            // Merge with any existing real-time metrics from SignalR
            this.updateChartFromRealTimeMetrics();
            // Group metrics by type for adaptive charts
            this.groupMetricsByType();
          }
          
          this.loading = false;
        },
        error: (err) => {
          const appError = this.errorHandler.handleError(err);
          this.error = this.errorHandler.getUserFriendlyMessage(appError);
          this.loading = false;
        }
      });

    this.loadAggregation();
  }

  private loadChartData(): void {
    if (this.chartDateRange.fromDate && this.chartDateRange.toDate) {
      // Use REST API for daily average metrics for date-filtered queries
      const chartFilter: MetricFilter = {
        type: this.filter.type,
        name: this.filter.name
      };

      // Ensure dates are at start/end of day in UTC to avoid timezone issues
      // Use UTC methods to preserve the selected date regardless of local timezone
      const fromDate = new Date(Date.UTC(
        this.chartDateRange.fromDate.getFullYear(),
        this.chartDateRange.fromDate.getMonth(),
        this.chartDateRange.fromDate.getDate(),
        0, 0, 0, 0
      ));
      const toDate = new Date(Date.UTC(
        this.chartDateRange.toDate.getFullYear(),
        this.chartDateRange.toDate.getMonth(),
        this.chartDateRange.toDate.getDate(),
        23, 59, 59, 999
      ));

      this.restService.getDailyAverages(
        fromDate,
        toDate,
        chartFilter
      )
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (dailyAverages) => {
            this.dailyAverages = dailyAverages;
            // Convert daily averages to metrics format for chart display
            // For date-filtered queries, show ONLY daily averages, no real-time metrics
            this.chartMetrics = this.convertDailyAveragesToMetrics(dailyAverages);
            // Group metrics by type for adaptive charts
            this.groupMetricsByType();
          },
          error: (err) => {
            const appError = this.errorHandler.handleError(err);
            console.error('Error loading daily average metrics:', appError);
            this.dailyAverages = [];
            this.chartMetrics = [];
          }
        });
    } else {
      // No date filter - chart data comes from GraphQL (loadData) + SignalR updates
      // No need for separate REST call - we already have data from GraphQL
      this.dailyAverages = [];
      // Chart metrics are already set in loadData() from GraphQL
      // SignalR will add new metrics via updateChartFromRealTimeMetrics()
      // Grouping is done in loadData() and updateChartFromRealTimeMetrics()
    }
  }

  private convertDailyAveragesToMetrics(dailyAverages: DailyAverageMetric[]): Metric[] {
    // Group by date and type to create one metric per day per type
    const groupedByDateAndType = dailyAverages.reduce((acc, avg) => {
      const key = `${avg.date}_${avg.type}_${avg.name}`;
      if (!acc[key]) {
        acc[key] = {
          date: avg.date,
          type: avg.type,
          name: avg.name,
          averageValues: { ...avg.averageValues }
        };
      } else {
        // Merge average values if same date/type/name
        Object.assign(acc[key].averageValues, avg.averageValues);
      }
      return acc;
    }, {} as Record<string, { date: string; type: string; name: string; averageValues: Record<string, number> }>);

    // Convert to metrics, creating one metric per day with all average values
    return Object.values(groupedByDateAndType)
      .map(item => ({
        id: 0, // Daily averages don't have individual IDs
        type: item.type,
        name: item.name,
        payload: item.averageValues,
        createdAt: item.date
      }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  private updateChartFromRealTimeMetrics(): void {
    // Only merge real-time metrics if date filter is NOT active
    if (this.chartDateRange.fromDate && this.chartDateRange.toDate) {
      // Date filter is active - don't merge real-time metrics, only show daily averages
      return;
    }

    // For non-date-filtered queries, merge real-time metrics with chart metrics
    // Ensure all metrics have consistent date format for proper sorting
    const normalizedChartMetrics = this.chartMetrics.map(m => ({
      ...m,
      createdAt: new Date(m.createdAt).toISOString()
    }));
    const normalizedRealTimeMetrics = this.realTimeMetrics.map(m => ({
      ...m,
      createdAt: new Date(m.createdAt).toISOString()
    }));
    
    const allMetrics = [...normalizedChartMetrics, ...normalizedRealTimeMetrics];
    const uniqueMetrics = this.deduplicateMetrics(allMetrics);
    
    this.chartMetrics = this.sortMetricsByDate(uniqueMetrics);
    // Regroup metrics by type after merging
    this.groupMetricsByType();
  }

  private deduplicateMetrics(metrics: Metric[]): Metric[] {
    return Array.from(
      new Map(metrics.map(m => [m.id, m])).values()
    );
  }

  private sortMetricsByDate(metrics: Metric[]): Metric[] {
    return metrics.sort((a, b) => {
      // Parse dates consistently to avoid timezone issues
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      
      // Handle invalid dates
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      
      return dateA.getTime() - dateB.getTime();
    });
  }

  private addMetricToChart(metric: Metric): void {
    if (metric.id === 0) {
      return;
    }

    // Only add real-time metrics if date filter is NOT active
    if (this.chartDateRange.fromDate && this.chartDateRange.toDate) {
      // Date filter is active - don't add real-time metrics, only show daily averages
      return;
    }

    const existingIndex = this.realTimeMetrics.findIndex(m => m.id === metric.id);
    if (existingIndex >= 0) {
      this.realTimeMetrics[existingIndex] = metric;
    } else {
      this.realTimeMetrics.push(metric);
      if (this.realTimeMetrics.length > APP_CONSTANTS.PAGINATION.REAL_TIME_METRICS_LIMIT) {
        this.realTimeMetrics = this.realTimeMetrics.slice(-APP_CONSTANTS.PAGINATION.REAL_TIME_METRICS_LIMIT);
      }
    }

    this.updateChartFromRealTimeMetrics();
  }

  private setupSignalRUpdates(): void {
    this.signalRService.metricReceived$
      .pipe(takeUntil(this.destroy$))
      .subscribe(metric => {
        if (metric) {
          const matchesFilter = (!this.filter.type || metric.type === this.filter.type) &&
                               (!this.filter.name || metric.name.includes(this.filter.name));

          if (matchesFilter) {
            this.latestMetrics = [metric, ...this.latestMetrics]
              .slice(0, APP_CONSTANTS.PAGINATION.LATEST_METRICS_LIMIT * 4);
            
            // Only add to chart if date filter is NOT active (real-time mode)
            // If date filter is active, chart shows daily averages only
            if (!this.chartDateRange.fromDate || !this.chartDateRange.toDate) {
              this.addMetricToChart(metric);
            }
          }
        }
      });

    this.signalRService.dataUpdated$
      .pipe(
        debounceTime(APP_CONSTANTS.DEBOUNCE.DATA_UPDATE),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.loadAggregation();
      });
  }

  onFilterChange(filter: MetricFilter): void {
    this.filter = {
      type: filter.type,
      name: filter.name
    };
    
    const previousDateRange = { ...this.chartDateRange };
    const hadDateRange = previousDateRange.fromDate && previousDateRange.toDate;
    const hasDateRange = filter.fromDate && filter.toDate;
    
    this.chartDateRange = {
      fromDate: filter.fromDate,
      toDate: filter.toDate
    };
    
    // Clear real-time metrics if switching to date filter mode
    if (hasDateRange && !hadDateRange) {
      this.realTimeMetrics = [];
    }
    
    if (this.hasDateRangeChanged(previousDateRange, filter)) {
      if (hasDateRange) {
        // Date filter is active - clear real-time metrics
        this.realTimeMetrics = [];
      }
    }
    
    this.chartMetrics = [];
    this.dailyAverages = [];
    this.metricsByType = {};
    this.selectedLocation = null; // Reset location filter on filter change
    this.loadData();
    this.loadChartData();
  }

  private hasDateRangeChanged(previous: { fromDate?: Date; toDate?: Date }, current: MetricFilter): boolean {
    return previous.fromDate !== current.fromDate || previous.toDate !== current.toDate;
  }

  private filterRealTimeMetricsByDateRange(fromDate?: Date, toDate?: Date): void {
    if (!fromDate || !toDate) {
      return;
    }

    const fromTime = fromDate.getTime();
    const toTime = toDate.getTime();

    this.realTimeMetrics = this.realTimeMetrics.filter(m => {
      const metricTime = new Date(m.createdAt).getTime();
      return metricTime >= fromTime && metricTime <= toTime;
    });
  }

  private buildFilter(type?: string, name?: string): MetricFilter | undefined {
    const filter: MetricFilter = {};
    
    if (type) {
      filter.type = type;
    }
    if (name) {
      filter.name = name;
    }

    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  private loadAggregation(): void {
    const aggregationFilter = this.buildFilter(this.filter.type, this.filter.name);
    
    this.graphQLService.getMetricsAggregation(aggregationFilter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (agg) => {
          this.aggregation = agg;
        },
        error: (err) => {
          const appError = this.errorHandler.handleError(err);
          console.error('Error loading aggregation:', appError);
          this.aggregation = null;
        }
      });
  }

  private isMetricInDateRange(metric: Metric): boolean {
    const hasDateRange = this.chartDateRange.fromDate && this.chartDateRange.toDate;
    if (!hasDateRange) {
      return true;
    }

    const metricTime = new Date(metric.createdAt).getTime();
    const fromTime = this.chartDateRange.fromDate!.getTime();
    const toTime = this.chartDateRange.toDate!.getTime();
    
    return metricTime >= fromTime && metricTime <= toTime;
  }

  refresh(): void {
    this.chartMetrics = [];
    this.realTimeMetrics = [];
    this.metricsByType = {};
    this.selectedLocation = null;
    this.loadData();
    this.loadChartData();
  }

  private groupMetricsByType(): void {
    this.metricsByType = {};
    this.chartMetrics.forEach(metric => {
      if (!this.metricsByType[metric.type]) {
        this.metricsByType[metric.type] = [];
      }
      this.metricsByType[metric.type].push(metric);
    });
  }

  getMetricTypes(): string[] {
    return Object.keys(this.metricsByType).sort();
  }

  getMetricsForType(type: string): Metric[] {
    let metrics = this.metricsByType[type] || [];
    
    // Filter by location if selected
    if (this.selectedLocation) {
      metrics = metrics.filter(m => m.name === this.selectedLocation);
    }
    
    return metrics;
  }

  onLocationChange(location: string | null): void {
    this.selectedLocation = location;
  }
}

