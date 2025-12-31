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
  private connectionStateSubject = new BehaviorSubject<boolean>(false);

  public metricReceived$: Observable<Metric | null> = this.metricSubject.asObservable();
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
      this.metricSubject.next(metric);
    });
  }

  async startConnection(): Promise<void> {
    if (this.hubConnection?.state === HubConnectionState.Disconnected) {
      try {
        await this.hubConnection.start();
        this.connectionStateSubject.next(true);
        console.log('SignalR connection started');
      } catch (error) {
        console.error('Error starting SignalR connection:', error);
        this.connectionStateSubject.next(false);
      }
    }
  }

  async stopConnection(): Promise<void> {
    if (this.hubConnection?.state !== HubConnectionState.Disconnected) {
      await this.hubConnection?.stop();
      this.connectionStateSubject.next(false);
      console.log('SignalR connection stopped');
    }
  }
}

