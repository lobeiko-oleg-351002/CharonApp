import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { Metric } from '../../models/metric.model';
import { APP_CONSTANTS } from '../../constants/app.constants';

@Component({
  selector: 'app-metrics-chart',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './metrics-chart.component.html',
  styleUrls: ['./metrics-chart.component.scss']
})
export class MetricsChartComponent implements OnInit, OnChanges {
  @Input() metrics: Metric[] = [];
  @Input() loading = false;
  @Input() dateRange?: { fromDate?: Date; toDate?: Date };

  chartType: ChartType = 'line';
  chartData: ChartData<'line'> = {
    labels: [],
    datasets: []
  };
  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#e5e7eb'
        },
        grid: {
          color: 'rgba(212, 175, 55, 0.1)'
        }
      },
      x: {
        ticks: {
          color: '#e5e7eb',
          maxRotation: 45,
          minRotation: 45
        },
        grid: {
          color: 'rgba(212, 175, 55, 0.1)'
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#e5e7eb'
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(45, 27, 61, 0.95)',
        titleColor: '#d4af37',
        bodyColor: '#e5e7eb',
        borderColor: 'rgba(212, 175, 55, 0.3)',
        borderWidth: 1
      }
    }
  };

  ngOnInit(): void {
    this.updateChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['metrics'] || changes['dateRange']) {
      this.updateChart();
    }
  }

  private updateChart(): void {
    if (!this.metrics || this.metrics.length === 0) {
      this.chartData = {
        labels: [],
        datasets: []
      };
      return;
    }

    const filteredMetrics = this.filterMetricsByDateRange(this.metrics);

    if (filteredMetrics.length === 0) {
      this.chartData = {
        labels: [],
        datasets: []
      };
      return;
    }

    const typeGroups = this.groupByType(filteredMetrics);
    
    // Sort by date and create labels based on date range
    const sortedMetrics = filteredMetrics
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    const labels = this.formatChartLabels(sortedMetrics);

    const datasets = Object.entries(typeGroups).map(([type, metrics], index) => {
      const colors = [
        'rgba(102, 126, 234, 1)',
        'rgba(239, 68, 68, 1)',
        'rgba(16, 185, 129, 1)',
        'rgba(245, 158, 11, 1)',
        'rgba(139, 92, 246, 1)'
      ];
      const color = colors[index % colors.length];

      return {
        label: type,
        data: sortedMetrics.map(m => {
          if (m.type === type && m.payload) {
            const firstKey = Object.keys(m.payload)[0];
            const value = m.payload[firstKey];
            // Parse value - handle both numbers and string numbers
            if (typeof value === 'number') {
              return value;
            }
            if (typeof value === 'string') {
              // Handle boolean strings and numeric strings
              if (value.toLowerCase() === 'true') return 1;
              if (value.toLowerCase() === 'false') return 0;
              const parsed = parseFloat(value);
              return isNaN(parsed) ? 0 : parsed;
            }
            return 0;
          }
          return null;
        }),
        borderColor: color,
        backgroundColor: color.replace('1)', '0.1)'),
        tension: 0.4,
        fill: true
      };
    });

    this.chartData = {
      labels,
      datasets
    };
  }

  private filterMetricsByDateRange(metrics: Metric[]): Metric[] {
    if (!this.dateRange?.fromDate || !this.dateRange?.toDate) {
      return metrics;
    }

    const fromTime = this.dateRange.fromDate.getTime();
    const toTime = this.dateRange.toDate.getTime();

    return metrics.filter(m => {
      const metricTime = new Date(m.createdAt).getTime();
      return metricTime >= fromTime && metricTime <= toTime;
    });
  }

  private formatChartLabels(metrics: Metric[]): string[] {
    return metrics.map(m => {
      const date = new Date(m.createdAt);
      
      if (this.dateRange?.fromDate && this.dateRange?.toDate) {
        // For date-filtered queries (daily averages), always show date format
        const span = this.dateRange.toDate.getTime() - this.dateRange.fromDate.getTime();
        const days = span / (1000 * 60 * 60 * 24);
        
        // For daily averages, show date (not time) since data is aggregated by day
        if (days > 7) {
          // Long range: show month and day
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
          });
        } else if (days > 1) {
          // Medium range: show month, day, and year if different
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
          });
        } else {
          // Single day: show date
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
        }
      }
      
      // No date range: show time only for real-time metrics
      return date.toLocaleTimeString('en-US', APP_CONSTANTS.DATE_FORMAT.SINGLE_DAY);
    });
  }

  private groupByType(metrics: Metric[]): Record<string, Metric[]> {
    return metrics.reduce((acc, metric) => {
      if (!acc[metric.type]) {
        acc[metric.type] = [];
      }
      acc[metric.type].push(metric);
      return acc;
    }, {} as Record<string, Metric[]>);
  }
}

