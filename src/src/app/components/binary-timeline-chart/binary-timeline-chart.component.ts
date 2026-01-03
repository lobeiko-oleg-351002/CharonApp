import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { Metric } from '../../models/metric.model';
import { APP_CONSTANTS } from '../../constants/app.constants';

@Component({
  selector: 'app-binary-timeline-chart',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './binary-timeline-chart.component.html',
  styleUrls: ['./binary-timeline-chart.component.scss']
})
export class BinaryTimelineChartComponent implements OnInit, OnChanges {
  @Input() metrics: Metric[] = [];
  @Input() loading = false;
  @Input() dateRange?: { fromDate?: Date; toDate?: Date };
  @Input() location?: string | null;

  chartType: ChartType = 'bar';
  chartData: ChartData<'bar'> = {
    labels: [],
    datasets: []
  };
  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        max: 1,
        ticks: {
          stepSize: 1,
          callback: function(value) {
            return value === 1 ? 'ON' : value === 0 ? 'OFF' : '';
          },
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
        display: false
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context) => {
            return context.parsed.y === 1 ? 'Motion Detected' : 'No Motion';
          }
        },
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
    if (changes['metrics'] || changes['dateRange'] || changes['location']) {
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
    
    const data = sortedMetrics.map(m => {
      if (m.payload) {
        const firstKey = Object.keys(m.payload)[0];
        const value = m.payload[firstKey];
        if (typeof value === 'boolean') {
          return value ? 1 : 0;
        }
        if (typeof value === 'string') {
          const lower = value.toLowerCase();
          if (lower === 'true' || lower === '1') return 1;
          if (lower === 'false' || lower === '0') return 0;
        }
        if (typeof value === 'number') {
          return value > 0 ? 1 : 0;
        }
      }
      return 0;
    });

    this.chartData = {
      labels,
      datasets: [{
        label: 'Motion',
        data,
        backgroundColor: data.map(val => val === 1 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'),
        borderColor: data.map(val => val === 1 ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)'),
        borderWidth: 1
      }]
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

