import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MetricFilter } from '../../models/metric.model';

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filter-panel.component.html',
  styleUrls: ['./filter-panel.component.scss']
})
export class FilterPanelComponent implements OnInit {
  @Input() filter: MetricFilter = {};
  @Output() filterChange = new EventEmitter<MetricFilter>();

  localFilter: MetricFilter = {};
  showFilters = false;

  ngOnInit(): void {
    this.localFilter = { ...this.filter };
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  applyFilters(): void {
    this.filterChange.emit({ ...this.localFilter });
  }

  clearFilters(): void {
    this.localFilter = {};
    this.filterChange.emit({});
  }

  onDateChange(): void {
    if (this.localFilter.fromDate && this.localFilter.toDate) {
      if (this.localFilter.fromDate > this.localFilter.toDate) {
        const temp = this.localFilter.fromDate;
        this.localFilter.fromDate = this.localFilter.toDate;
        this.localFilter.toDate = temp;
      }
    }
  }
}

