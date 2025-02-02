class NovaAnalytics {
    static trackPageLoad() {
        const performance = window.performance;
        if (performance) {
            const timing = performance.timing;
            const loadTime = timing.loadEventEnd - timing.navigationStart;
            console.log(`Page load time: ${loadTime}ms`);
            
            // Track page load time in GA4
            gtag('event', 'performance', {
                'metric_name': 'page_load_time',
                'metric_value': loadTime,
                'metric_unit': 'ms'
            });
        }
    }

    static trackEvent(category, action, label, value = null) {
        // Console logging for development
        console.log(`Event tracked: ${category} - ${action} - ${label}`);
        
        // GA4 event tracking
        gtag('event', action, {
            'event_category': category,
            'event_label': label,
            'value': value
        });
    }

    static trackCalendarAction(action, details) {
        gtag('event', 'calendar_action', {
            'action_type': action,
            'details': details
        });
    }

    static trackFeatureUsage(feature) {
        gtag('event', 'feature_used', {
            'feature_name': feature
        });
    }
}

// Initialize analytics
document.addEventListener('DOMContentLoaded', () => {
    NovaAnalytics.trackPageLoad();
});
