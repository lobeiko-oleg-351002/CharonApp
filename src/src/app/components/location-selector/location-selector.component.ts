import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Metric } from '../../models/metric.model';

@Component({
  selector: 'app-location-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-selector.component.html',
  styleUrls: ['./location-selector.component.scss']
})
export class LocationSelectorComponent implements OnInit {
  @Input() metrics: Metric[] = [];
  @Input() selectedLocation: string | null = null;
  @Output() locationChange = new EventEmitter<string | null>();

  availableLocations: string[] = [];
  allLocationsOption = 'All Locations';

  ngOnInit(): void {
    this.updateAvailableLocations();
  }

  ngOnChanges(): void {
    this.updateAvailableLocations();
  }

  private updateAvailableLocations(): void {
    const locations = new Set<string>();
    this.metrics.forEach(metric => {
      if (metric.name) {
        locations.add(metric.name);
      }
    });
    this.availableLocations = Array.from(locations).sort();
  }

  onLocationChange(location: string): void {
    const selected = location === this.allLocationsOption ? null : location;
    this.selectedLocation = selected;
    this.locationChange.emit(selected);
  }
}

