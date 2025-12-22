import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetricsAggregation } from '../../models/metric.model';

@Component({
  selector: 'app-aggregations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './aggregations.component.html',
  styleUrls: ['./aggregations.component.scss']
})
export class AggregationsComponent {
  @Input() aggregation: MetricsAggregation | null = null;
  @Input() loading = false;
}

