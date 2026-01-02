import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { BehaviorSubject, Observable } from 'rxjs';
import { Metric } from '../models/metric.model';

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection?: HubConnection;
  private metricSubject = new BehaviorSubject<Metric | null>(null);
  private dataUpdatedSubject = new BehaviorSubject<boolean>(false);
  private connectionStateSubject = new BehaviorSubject<boolean>(false);

  public metricReceived$: Observable<Metric | null> = this.metricSubject.asObservable();
  public dataUpdated$: Observable<boolean> = this.dataUpdatedSubject.asObservable();
  public isConnected$: Observable<boolean> = this.connectionStateSubject.asObservable();

  constructor() {
    this.hubConnection = new HubConnectionBuilder()
      .withUrl('/metricsHub')
      .withAutomaticReconnect()
      .build();

    this.hubConnection.onreconnecting(() => {
      this.connectionStateSubject.next(false);
    });

    this.hubConnection.onreconnected(() => {
      this.connectionStateSubject.next(true);
    });

    this.hubConnection.onclose(() => {
      this.connectionStateSubject.next(false);
    });

    this.hubConnection.on('MetricReceived', (metric: Metric) => {
      // Receive actual metric data for instant Latest Values update
      this.metricSubject.next(metric);
    });

    this.hubConnection.on('DataUpdated', () => {
      // Notify that data has been updated - frontend will fetch chart/aggregations via GraphQL
      this.dataUpdatedSubject.next(true);
    });
  }

  async startConnection(): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state !== HubConnectionState.Disconnected) {
      return;
    }

    try {
      await this.hubConnection.start();
      this.connectionStateSubject.next(true);
    } catch (error) {
      console.error('Error starting SignalR connection:', error);
      this.connectionStateSubject.next(false);
      throw error;
    }
  }

  async stopConnection(): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state === HubConnectionState.Disconnected) {
      return;
    }

    try {
      await this.hubConnection.stop();
      this.connectionStateSubject.next(false);
    } catch (error) {
      console.error('Error stopping SignalR connection:', error);
      throw error;
    }
  }
}

