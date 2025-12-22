import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GraphQLService } from '../../services/graphql.service';
import { SignalRService } from '../../services/signalr.service';
import { Metric, MetricsAggregation, MetricFilter } from '../../models/metric.model';
import { Subject, takeUntil, interval } from 'rxjs';
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
  aggregation: MetricsAggregation | null = null;
  loading = false;
  error: string | null = null;
  filter: MetricFilter = {};

  private destroy$ = new Subject<void>();
  private refreshInterval$ = interval(30000);

  constructor(
    private graphQLService: GraphQLService,
    private signalRService: SignalRService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.setupAutoRefresh();
    this.setupSignalRUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData(): void {
    this.loading = true;
    this.error = null;

    this.graphQLService.getLatestMetrics(5)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (metrics) => {
          this.latestMetrics = metrics;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load metrics. Please try again.';
          this.loading = false;
          console.error('Error loading metrics:', err);
        }
      });

    this.graphQLService.getMetricsAggregation(this.filter)
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

  private setupAutoRefresh(): void {
    this.refreshInterval$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadData();
      });
  }

  private setupSignalRUpdates(): void {
    this.signalRService.metricReceived$
      .pipe(takeUntil(this.destroy$))
      .subscribe(metric => {
        if (metric) {
          this.latestMetrics = [metric, ...this.latestMetrics].slice(0, 20);
          this.loadAggregation();
        }
      });
  }

  onFilterChange(filter: MetricFilter): void {
    this.filter = filter;
    this.loadData();
  }

  private loadAggregation(): void {
    this.graphQLService.getMetricsAggregation(this.filter)
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
    this.loadData();
  }
}

