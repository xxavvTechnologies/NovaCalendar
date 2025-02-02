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
        // Only track if analytics consent is given
        const preferences = JSON.parse(localStorage.getItem('cookiePreferences'));
        if (!preferences?.analytics) return;

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

    static initialize() {
        // Set default consent state
        gtag('consent', 'default', {
            'analytics_storage': 'denied'
        });

        // Check for existing preferences
        const preferences = JSON.parse(localStorage.getItem('cookiePreferences'));
        if (preferences?.analytics) {
            gtag('consent', 'update', {
                'analytics_storage': 'granted'
            });
        }

        this.trackPageLoad();
    }
}

// Update initialization
document.addEventListener('DOMContentLoaded', () => {
    NovaAnalytics.initialize();
});
