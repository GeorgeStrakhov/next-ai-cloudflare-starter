/**
 * Analytics Provider Interface
 *
 * All analytics providers must implement this interface.
 * This allows easy swapping and addition of new providers.
 */
export interface AnalyticsProvider {
  name: string;
  init(): void | Promise<void>;
  track(event: string, properties?: Record<string, unknown>): void;
  identify(userId: string, traits?: Record<string, unknown>): void;
  page(name?: string, properties?: Record<string, unknown>): void;
  reset(): void;
}

export interface AnalyticsConfig {
  debug?: boolean;
  providers: AnalyticsProvider[];
}
