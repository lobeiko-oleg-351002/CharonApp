import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DailyAverageMetric } from '../../models/metric.model';

@Component({
  selector: 'app-daily-averages-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './daily-averages-table.component.html',
  styleUrls: ['./daily-averages-table.component.scss']
})
export class DailyAveragesTableComponent {
  @Input() dailyAverages: DailyAverageMetric[] = [];
  @Input() loading = false;

  getAverageValuesString(avg: DailyAverageMetric): string {
    if (!avg.averageValues || Object.keys(avg.averageValues).length === 0) {
      return 'N/A';
    }
    return Object.entries(avg.averageValues)
      .map(([key, value]) => `${key}: ${value.toFixed(2)}`)
      .join(', ');
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}

