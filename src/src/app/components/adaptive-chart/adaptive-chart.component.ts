import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Metric } from '../../models/metric.model';
import { getMetricTypeConfig, MetricTypeConfig } from '../../models/metric-type-config.model';
import { BinaryTimelineChartComponent } from '../binary-timeline-chart/binary-timeline-chart.component';
import { MultiSeriesChartComponent } from '../multi-series-chart/multi-series-chart.component';
import { MetricsChartComponent } from '../metrics-chart/metrics-chart.component';

@Component({
  selector: 'app-adaptive-chart',
  standalone: true,
  imports: [
    CommonModule,
    BinaryTimelineChartComponent,
    MultiSeriesChartComponent,
    MetricsChartComponent
  ],
  templateUrl: './adaptive-chart.component.html',
  styleUrls: ['./adaptive-chart.component.scss']
})
export class AdaptiveChartComponent implements OnInit, OnChanges {
  @Input() metrics: Metric[] = [];
  @Input() loading = false;
  @Input() dateRange?: { fromDate?: Date; toDate?: Date };
  @Input() location?: string | null;
  @Input() metricType: string = '';

  config: MetricTypeConfig | null = null;

  ngOnInit(): void {
    this.updateConfig();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['metricType']) {
      this.updateConfig();
    }
  }

  private updateConfig(): void {
    if (this.metricType) {
      this.config = getMetricTypeConfig(this.metricType);
    }
  }

  get visualizationType(): string {
    return this.config?.visualization || 'line';
  }
}

