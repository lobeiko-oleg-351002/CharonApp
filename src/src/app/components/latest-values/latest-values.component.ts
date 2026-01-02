import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Metric } from '../../models/metric.model';

@Component({
  selector: 'app-latest-values',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './latest-values.component.html',
  styleUrls: ['./latest-values.component.scss']
})
export class LatestValuesComponent {
  @Input() metrics: Metric[] = [];
  @Input() loading = false;

  getPayloadValue(metric: Metric): string {
    if (!metric.payload || Object.keys(metric.payload).length === 0) {
      return 'N/A';
    }
    const firstKey = Object.keys(metric.payload)[0];
    return String(metric.payload[firstKey]);
  }

  hasMultiplePayloadKeys(payload: Record<string, unknown>): boolean {
    return payload !== null && payload !== undefined && Object.keys(payload).length > 1;
  }
}

