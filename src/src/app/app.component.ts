import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SignalRService } from './services/signalr.service';
import { ErrorHandlerService } from './services/error-handler.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Charon Metrics Dashboard';
  private destroy$ = new Subject<void>();

  constructor(
    public signalRService: SignalRService,
    private errorHandler: ErrorHandlerService
  ) {}

  ngOnInit(): void {
    this.signalRService.startConnection().catch(err => {
      const appError = this.errorHandler.handleError(err);
      console.error('Failed to start SignalR connection:', appError);
    });
    
    this.signalRService.metricReceived$
      .pipe(takeUntil(this.destroy$))
      .subscribe(metric => {
        if (metric) {
          console.log('New metric received via SignalR:', metric);
        }
      });
    
    this.signalRService.dataUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('Data updated notification received');
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.signalRService.stopConnection().catch(err => {
      console.error('Error stopping SignalR connection:', err);
    });
  }
}

