import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GraphQLService } from '../../services/graphql.service';
import { RestService } from '../../services/rest.service';
import { SignalRService } from '../../services/signalr.service';
import { Metric, MetricsAggregation, MetricFilter, DailyAverageMetric } from '../../models/metric.model';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { LatestValuesComponent } from '../latest-values/latest-values.component';
import { MetricsChartComponent } from '../metrics-chart/metrics-chart.component';
import { AggregationsComponent } from '../aggregations/aggregations.component';
import { FilterPanelComponent } from '../filter-panel/filter-panel.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LatestValuesComponent,
    MetricsChartComponent,
    AggregationsComponent,
    FilterPanelComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  latestMetrics: Metric[] = [];
  chartMetrics: Metric[] = []; // Metrics for chart (converted from daily averages)
  dailyAverages: DailyAverageMetric[] = []; // Daily average metrics for chart
  realTimeMetrics: Metric[] = []; // Real-time metrics received via SignalR (separate from daily averages)
  aggregation: MetricsAggregation | null = null;
  loading = false;
  error: string | null = null;
  filter: MetricFilter = {};
  chartDateRange: { fromDate?: Date; toDate?: Date } = {}; // Separate date range for chart

  private destroy$ = new Subject<void>();

  constructor(
    private graphQLService: GraphQLService,
    private restService: RestService,
    private signalRService: SignalRService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.loadChartData();
    this.setupSignalRUpdates();
    this.signalRService.startConnection();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.signalRService.stopConnection();
  }

  private loadData(): void {
    this.loading = true;
    this.error = null;

    // Apply filters for latest metrics (type and name, but not date range)
    // IMPORTANT: Explicitly exclude dates to prevent GraphQL calls with date filters
    // Only include filter if there are actual values (type or name)
    const latestFilter: MetricFilter = {};
    if (this.filter.type) {
      latestFilter.type = this.filter.type;
    }
    if (this.filter.name) {
      latestFilter.name = this.filter.name;
    }
    // Explicitly NO fromDate/toDate - use REST API for date-filtered queries

    const filterToUse = Object.keys(latestFilter).length > 0 ? latestFilter : undefined;
    console.log('loadData: Using REST API (GraphQL disabled):', filterToUse || 'no filters');
    // Use REST API instead of GraphQL to avoid complexity issues
    // Even without dates, GraphQL can exceed complexity limits
    this.restService.getMetrics(filterToUse, 1, 5)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.latestMetrics = result.items;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load metrics. Please try again.';
          this.loading = false;
          console.error('Error loading metrics:', err);
        }
      });

    this.loadAggregation();
  }

  private loadChartData(): void {
    // Load metrics for chart when date range is selected
    // Use REST API for date-filtered queries to avoid GraphQL complexity errors
    if (this.chartDateRange.fromDate && this.chartDateRange.toDate) {
      const chartFilter: MetricFilter = {
        type: this.filter.type,
        name: this.filter.name,
        fromDate: this.chartDateRange.fromDate,
        toDate: this.chartDateRange.toDate
      };

      // Use REST API for date-filtered queries (no complexity issues)
      this.restService.getAllMetrics(chartFilter, 100) // Max 100 metrics for chart
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (metrics) => {
            // Store loaded metrics as base data
            // Real-time metrics will be added on top via addMetricToChart()
            this.chartMetrics = metrics
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            this.dailyAverages = [];
            
            // Now add any existing real-time metrics that match the date range
            this.updateChartFromRealTimeMetrics();
          },
          error: (err) => {
            console.error('Error loading chart data via REST:', err);
            // Show real-time metrics even if initial load fails
            this.updateChartFromRealTimeMetrics();
          }
        });
    } else {
      // If no date range, use GraphQL for simple queries (type/name filters only)
      // Only include filter if there are actual values (type or name)
      const latestFilter: MetricFilter = {};
      if (this.filter.type) {
        latestFilter.type = this.filter.type;
      }
      if (this.filter.name) {
        latestFilter.name = this.filter.name;
      }
      // Explicitly NO fromDate/toDate - use REST API for date-filtered queries
      
      const filterToUse = Object.keys(latestFilter).length > 0 ? latestFilter : undefined;
      console.log('loadChartData (no date range): Using REST API instead of GraphQL');
      // Use REST API instead of GraphQL to avoid complexity issues
      this.restService.getAllMetrics(filterToUse, 20)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (metrics) => {
            // Store loaded metrics as base data
            // Real-time metrics will be added on top via addMetricToChart()
            this.chartMetrics = metrics
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            this.dailyAverages = [];
            
            // Now add any existing real-time metrics
            this.updateChartFromRealTimeMetrics();
          },
          error: (err) => {
            console.error('Error loading latest metrics for chart:', err);
            // Show real-time metrics even if initial load fails
            this.updateChartFromRealTimeMetrics();
          }
        });
    }
  }

  // Removed loadChartDataPaginated - now using REST API for date-filtered queries

  private updateChartFromRealTimeMetrics(): void {
    // Update chart by combining existing chartMetrics with real-time metrics
    if (this.chartDateRange.fromDate && this.chartDateRange.toDate) {
      // Filter real-time metrics by date range
      const validRealTimeMetrics = this.realTimeMetrics.filter(m => {
        const metricDate = new Date(m.createdAt);
        return metricDate >= this.chartDateRange.fromDate! && 
               metricDate <= this.chartDateRange.toDate!;
      });
      
      console.log(`Updating chart: ${this.chartMetrics.length} existing metrics, ${validRealTimeMetrics.length} valid real-time metrics`);
      
      // Combine existing chartMetrics (from REST/GraphQL) with real-time metrics
      // Remove duplicates by ID, keeping the most recent version (real-time metrics take priority)
      const allMetrics = [...this.chartMetrics, ...validRealTimeMetrics];
      const uniqueMetrics = Array.from(
        new Map(allMetrics.map(m => [m.id, m])).values()
      );
      
      this.chartMetrics = uniqueMetrics
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      console.log(`Chart updated with ${this.chartMetrics.length} total metrics`);
    } else {
      // No date range - combine existing chartMetrics with all real-time metrics
      console.log(`Updating chart (no date range): ${this.chartMetrics.length} existing metrics, ${this.realTimeMetrics.length} real-time metrics`);
      
      const allMetrics = [...this.chartMetrics, ...this.realTimeMetrics];
      const uniqueMetrics = Array.from(
        new Map(allMetrics.map(m => [m.id, m])).values()
      );
      
      this.chartMetrics = uniqueMetrics
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      console.log(`Chart updated with ${this.chartMetrics.length} total metrics`);
    }
  }

  private convertDailyAveragesToMetrics(dailyAverages: DailyAverageMetric[]): Metric[] {
    // Convert daily averages to Metric format for chart display
    // Since averageValues is not included in GraphQL query to reduce complexity,
    // we use an empty payload or reconstruct from available data
    return dailyAverages.map(avg => ({
      id: 0, // Daily averages don't have individual IDs
      type: avg.type,
      name: avg.name,
      payload: avg.averageValues || {}, // Will be empty if not included in query
      createdAt: avg.date
    }));
  }

  private addMetricToChart(metric: Metric): void {
    // Only add real metrics (with ID), not daily averages
    if (metric.id === 0) {
      console.log('Skipping metric with ID 0 (daily average)');
      return;
    }

    // Add/update in realTimeMetrics array
    const existingIndex = this.realTimeMetrics.findIndex(m => m.id === metric.id);
    if (existingIndex >= 0) {
      this.realTimeMetrics[existingIndex] = metric;
      console.log(`Updated real-time metric ${metric.id} in chart`);
    } else {
      this.realTimeMetrics.push(metric);
      console.log(`Added new real-time metric ${metric.id} to chart. Total real-time: ${this.realTimeMetrics.length}`);
      // Limit to reasonable number of real-time metrics
      if (this.realTimeMetrics.length > 100) {
        this.realTimeMetrics = this.realTimeMetrics.slice(-100);
      }
    }

    // Update chartMetrics by combining existing chartMetrics with real-time metrics
    this.updateChartFromRealTimeMetrics();
  }

  private setupSignalRUpdates(): void {
    // Handle real-time metric updates for Latest Values (instant update)
    this.signalRService.metricReceived$
      .pipe(takeUntil(this.destroy$))
      .subscribe(metric => {
        if (metric) {
          // Apply filters to SignalR updates
          const matchesFilter = (!this.filter.type || metric.type === this.filter.type) &&
                               (!this.filter.name || metric.name.includes(this.filter.name));

          if (matchesFilter) {
            // Update Latest Values instantly with received metric
            this.latestMetrics = [metric, ...this.latestMetrics].slice(0, 20);
            
            // Add metric to chart if it matches the date range or if no date range is set
            const metricDate = new Date(metric.createdAt);
            const hasDateRange = this.chartDateRange.fromDate && this.chartDateRange.toDate;
            const isInDateRange = !hasDateRange || 
                                 (metricDate >= this.chartDateRange.fromDate! && metricDate <= this.chartDateRange.toDate!);
            
            if (isInDateRange) {
              console.log(`Adding metric ${metric.id} to chart. Date range: ${hasDateRange ? 'set' : 'not set'}, Metric date: ${metric.createdAt}`);
              // If date range is set, add individual metric to chart for real-time updates
              // If no date range, show live metrics
              this.addMetricToChart(metric);
            } else {
              console.log(`Skipping metric ${metric.id} - outside date range. Metric: ${metric.createdAt}, Range: ${this.chartDateRange.fromDate} to ${this.chartDateRange.toDate}`);
            }
          }
        }
      });

    // Handle data update notifications for aggregations
    // Note: We don't reload chart data here to avoid overwriting real-time metrics
    // Real-time metrics are handled by metricReceived$ subscription above
    this.signalRService.dataUpdated$
      .pipe(
        debounceTime(200), // Debounce to avoid too many requests if multiple notifications arrive quickly
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        // Refresh aggregations (requires server-side filtering)
        this.loadAggregation();
        
        // Don't reload chart data here - it would overwrite real-time metrics
        // Real-time metrics are already being added via metricReceived$ subscription
        // If you need to refresh historical data, use the refresh button
      });
  }

  onFilterChange(filter: MetricFilter): void {
    // Separate filters: type/name for latest values, dates for chart
    this.filter = {
      type: filter.type,
      name: filter.name
    };
    
    // Update chart date range
    const previousDateRange = { ...this.chartDateRange };
    this.chartDateRange = {
      fromDate: filter.fromDate,
      toDate: filter.toDate
    };
    
    // Clear real-time metrics if date range changed significantly
    if (previousDateRange.fromDate !== filter.fromDate || previousDateRange.toDate !== filter.toDate) {
      // Filter real-time metrics to keep only those in new range
      if (filter.fromDate && filter.toDate) {
        this.realTimeMetrics = this.realTimeMetrics.filter(m => {
          const metricDate = new Date(m.createdAt);
          return metricDate >= filter.fromDate! && metricDate <= filter.toDate!;
        });
      }
    }
    
    // Clear chart data when filters change
    this.chartMetrics = [];
    
    this.loadData();
    this.loadChartData();
  }

  private loadAggregation(): void {
    const aggregationFilter: MetricFilter = {
      type: this.filter.type,
      name: this.filter.name
    };
    
    this.graphQLService.getMetricsAggregation(aggregationFilter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (agg) => {
          this.aggregation = agg;
        },
        error: (err) => {
          console.error('Error loading aggregation:', err);
        }
      });
  }

  refresh(): void {
    // Clear accumulated chart data on refresh
    this.chartMetrics = [];
    this.realTimeMetrics = []; // Also clear real-time metrics on manual refresh
    this.loadData();
    this.loadChartData();
  }
}

