import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MetricFilter } from '../../models/metric.model';

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDatepickerModule,
    MatInputModule,
    MatFormFieldModule,
    MatNativeDateModule,
    MatIconModule
  ],
  templateUrl: './filter-panel.component.html',
  styleUrls: ['./filter-panel.component.scss']
})
export class FilterPanelComponent implements OnInit {
  @Input() filter: MetricFilter = {};
  @Output() filterChange = new EventEmitter<MetricFilter>();

  localFilter: MetricFilter = {};
  showFilters = false;

  get fromDateValue(): Date | null {
    return this.localFilter.fromDate || null;
  }

  get toDateValue(): Date | null {
    return this.localFilter.toDate || null;
  }

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

  onFromDateChange(date: Date | null): void {
    if (date) {
      this.localFilter.fromDate = date;
      this.onDateChange();
    } else {
      this.localFilter.fromDate = undefined;
    }
  }

  onToDateChange(date: Date | null): void {
    if (date) {
      this.localFilter.toDate = date;
      this.onDateChange();
    } else {
      this.localFilter.toDate = undefined;
    }
  }

  private onDateChange(): void {
    if (this.localFilter.fromDate && this.localFilter.toDate) {
      if (this.localFilter.fromDate > this.localFilter.toDate) {
        const temp = this.localFilter.fromDate;
        this.localFilter.fromDate = this.localFilter.toDate;
        this.localFilter.toDate = temp;
      }
    }
  }
}

