import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { Metric } from '../../models/metric.model';
import { APP_CONSTANTS } from '../../constants/app.constants';

@Component({
  selector: 'app-multi-series-chart',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './multi-series-chart.component.html',
  styleUrls: ['./multi-series-chart.component.scss']
})
export class MultiSeriesChartComponent implements OnInit, OnChanges {
  @Input() metrics: Metric[] = [];
  @Input() loading = false;
  @Input() dateRange?: { fromDate?: Date; toDate?: Date };
  @Input() location?: string | null;
  @Input() payloadKeys: string[] = [];

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

  private colors = [
    'rgba(102, 126, 234, 1)',   // Blue
    'rgba(239, 68, 68, 1)',     // Red
    'rgba(16, 185, 129, 1)',    // Green
    'rgba(245, 158, 11, 1)',    // Yellow
    'rgba(139, 92, 246, 1)'     // Purple
  ];

  ngOnInit(): void {
    this.updateChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['metrics'] || changes['dateRange'] || changes['location'] || changes['payloadKeys']) {
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

    // Filter by location if specified
    let filteredMetrics = this.metrics;
    if (this.location) {
      filteredMetrics = this.metrics.filter(m => m.name === this.location);
    }

    const sortedMetrics = filteredMetrics
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const labels = this.formatChartLabels(sortedMetrics);

    // Create datasets for each payload key
    const datasets = this.payloadKeys.map((key, index) => {
      const color = this.colors[index % this.colors.length];
      
      return {
        label: key.toUpperCase(),
        data: sortedMetrics.map(m => {
          if (m.payload && m.payload[key] !== undefined) {
            const value = m.payload[key];
            if (typeof value === 'number') {
              return value;
            }
            if (typeof value === 'string') {
              const parsed = parseFloat(value);
              return isNaN(parsed) ? null : parsed;
            }
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

  private formatChartLabels(metrics: Metric[]): string[] {
    return metrics.map(m => {
      const date = new Date(m.createdAt);
      
      if (this.dateRange?.fromDate && this.dateRange?.toDate) {
        const span = this.dateRange.toDate.getTime() - this.dateRange.fromDate.getTime();
        const days = span / (1000 * 60 * 60 * 24);
        
        if (days > 7) {
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
          });
        } else if (days > 1) {
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
        } else {
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
        }
      }
      
      return date.toLocaleTimeString('en-US', APP_CONSTANTS.DATE_FORMAT.SINGLE_DAY);
    });
  }
}

