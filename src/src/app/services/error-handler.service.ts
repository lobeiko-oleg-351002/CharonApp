import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

export interface AppError {
  message: string;
  code?: string;
  details?: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  handleError(error: unknown): AppError {
    if (error instanceof HttpErrorResponse) {
      return this.handleHttpError(error);
    }
    
    if (error instanceof Error) {
      return {
        message: error.message,
        details: error
      };
    }
    
    return {
      message: 'An unknown error occurred',
      details: error
    };
  }

  private handleHttpError(error: HttpErrorResponse): AppError {
    if (error.error && typeof error.error === 'string' && error.error.trim().startsWith('<!')) {
      return {
        message: 'Server returned HTML instead of JSON. Check API endpoint URL and server configuration.',
        code: 'HTML_RESPONSE',
        details: error
      };
    }

    if (error.status === 0) {
      return {
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        details: error
      };
    }

    if (error.status >= 500) {
      return {
        message: 'Server error. Please try again later.',
        code: 'SERVER_ERROR',
        details: error
      };
    }

    if (error.status >= 400) {
      return {
        message: error.error?.message || error.message || 'Request failed',
        code: `HTTP_${error.status}`,
        details: error
      };
    }

    return {
      message: error.message || 'An error occurred',
      code: 'UNKNOWN_HTTP_ERROR',
      details: error
    };
  }

  getUserFriendlyMessage(error: AppError): string {
    return error.message;
  }
}


