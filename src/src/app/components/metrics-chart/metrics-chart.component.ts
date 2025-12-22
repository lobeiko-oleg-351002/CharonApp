import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { Metric } from '../../models/metric.model';

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
        beginAtZero: true
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      tooltip: {
        enabled: true
      }
    }
  };

  ngOnInit(): void {
    this.updateChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['metrics']) {
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

    const typeGroups = this.groupByType(this.metrics);
    const labels = this.metrics
      .slice()
      .reverse()
      .map(m => new Date(m.createdAt).toLocaleTimeString());

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
        data: this.metrics
          .slice()
          .reverse()
          .map(m => {
            if (m.type === type && m.payload) {
              const firstKey = Object.keys(m.payload)[0];
              const value = m.payload[firstKey];
              return typeof value === 'number' ? value : 0;
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

