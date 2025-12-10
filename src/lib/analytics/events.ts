/**
 * Analytics Events
 *
 * Define all trackable events here for type-safety and consistency.
 * Customize these events based on your application's needs.
 */
export const AnalyticsEvents = {
  // Authentication
  SIGN_IN: "sign_in",
  SIGN_OUT: "sign_out",
  SIGN_UP: "sign_up",

  // User Actions
  BUTTON_CLICKED: "button_clicked",
  FORM_SUBMITTED: "form_submitted",
  LINK_CLICKED: "link_clicked",

  // Navigation
  PAGE_VIEWED: "page_viewed",
  TAB_CHANGED: "tab_changed",
  MODAL_OPENED: "modal_opened",
  MODAL_CLOSED: "modal_closed",

  // Content
  CONTENT_VIEWED: "content_viewed",
  CONTENT_SHARED: "content_shared",
  CONTENT_DOWNLOADED: "content_downloaded",

  // Engagement
  FEATURE_USED: "feature_used",
  SEARCH_PERFORMED: "search_performed",
  FILTER_APPLIED: "filter_applied",

  // Errors
  ERROR_OCCURRED: "error_occurred",
  ERROR_BOUNDARY_TRIGGERED: "error_boundary_triggered",

  // Feedback
  FEEDBACK_SUBMITTED: "feedback_submitted",
  RATING_GIVEN: "rating_given",
} as const;

export type AnalyticsEvent =
  (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

/**
 * Event Properties
 *
 * Define type-safe properties for each event.
 * This ensures consistent data structure across the application.
 */
export interface EventProperties {
  // Authentication
  [AnalyticsEvents.SIGN_IN]: {
    method?: string;
  };
  [AnalyticsEvents.SIGN_OUT]: Record<string, never>;
  [AnalyticsEvents.SIGN_UP]: {
    method?: string;
  };

  // User Actions
  [AnalyticsEvents.BUTTON_CLICKED]: {
    buttonId?: string;
    buttonText?: string;
    location?: string;
  };
  [AnalyticsEvents.FORM_SUBMITTED]: {
    formId?: string;
    formName?: string;
    success?: boolean;
  };
  [AnalyticsEvents.LINK_CLICKED]: {
    linkUrl?: string;
    linkText?: string;
    external?: boolean;
  };

  // Navigation
  [AnalyticsEvents.PAGE_VIEWED]: {
    pagePath?: string;
    pageTitle?: string;
    referrer?: string;
  };
  [AnalyticsEvents.TAB_CHANGED]: {
    tabId?: string;
    tabName?: string;
  };
  [AnalyticsEvents.MODAL_OPENED]: {
    modalId?: string;
    modalName?: string;
  };
  [AnalyticsEvents.MODAL_CLOSED]: {
    modalId?: string;
    modalName?: string;
  };

  // Content
  [AnalyticsEvents.CONTENT_VIEWED]: {
    contentId?: string;
    contentType?: string;
    contentTitle?: string;
  };
  [AnalyticsEvents.CONTENT_SHARED]: {
    contentId?: string;
    contentType?: string;
    shareMethod?: string;
  };
  [AnalyticsEvents.CONTENT_DOWNLOADED]: {
    contentId?: string;
    contentType?: string;
    fileType?: string;
  };

  // Engagement
  [AnalyticsEvents.FEATURE_USED]: {
    featureId?: string;
    featureName?: string;
  };
  [AnalyticsEvents.SEARCH_PERFORMED]: {
    query?: string;
    resultsCount?: number;
  };
  [AnalyticsEvents.FILTER_APPLIED]: {
    filterId?: string;
    filterValue?: string;
  };

  // Errors
  [AnalyticsEvents.ERROR_OCCURRED]: {
    errorMessage?: string;
    errorCode?: string;
    errorStack?: string;
  };
  [AnalyticsEvents.ERROR_BOUNDARY_TRIGGERED]: {
    componentName?: string;
    errorMessage?: string;
  };

  // Feedback
  [AnalyticsEvents.FEEDBACK_SUBMITTED]: {
    feedbackType?: string;
    feedbackText?: string;
  };
  [AnalyticsEvents.RATING_GIVEN]: {
    ratingValue?: number;
    ratingMax?: number;
    itemId?: string;
  };
}
