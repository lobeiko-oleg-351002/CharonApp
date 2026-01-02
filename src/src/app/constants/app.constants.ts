/**
 * Application-wide constants
 */
export const APP_CONSTANTS = {
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_PAGE_SIZE: 20,
    LATEST_METRICS_LIMIT: 5,
    CHART_METRICS_LIMIT: 100,
    CHART_METRICS_DEFAULT_LIMIT: 20,
    REAL_TIME_METRICS_LIMIT: 100
  },
  DEBOUNCE: {
    DATA_UPDATE: 200
  },
  DATE_FORMAT: {
    MULTI_DAY: {
      month: 'short' as const,
      day: 'numeric' as const,
      hour: '2-digit' as const,
      minute: '2-digit' as const
    },
    SINGLE_DAY: {
      hour: '2-digit' as const,
      minute: '2-digit' as const,
      second: '2-digit' as const
    }
  }
} as const;


