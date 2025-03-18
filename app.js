class NovaCalendar {
    constructor() {
        this.initializeTheme();
        this.currentDate = new Date();
        this.currentView = 'month';
        this.events = this.loadEvents();
        this.initializeElements();
        this.addEventListeners();
        this.render();
        this.draggedEvent = null;
        this.notifications = this.checkNotificationPermission();
        this.initializeDragAndDrop();
        this.initializeSearch();
        this.notificationsCenter = document.getElementById('notifications-center');
        this.initializeModals();
        this.contextMenu = this.createContextMenu();
        this.selectedDate = null;
        this.selectedEvent = null;
        this.isMobile = window.innerWidth < 768;
        this.initializeMobileFeatures();
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('novaCalendarTheme');
        
        if (savedTheme) {
            document.body.classList.toggle('dark-mode', savedTheme === 'dark');
            this.updateThemeIcon(savedTheme === 'dark');
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.classList.toggle('dark-mode', prefersDark);
            this.updateThemeIcon(prefersDark);
        }

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('novaCalendarTheme')) {
                document.body.classList.toggle('dark-mode', e.matches);
                this.updateThemeIcon(e.matches);
            }
        });
    }

    updateThemeIcon(isDark) {
        const icon = this.themeToggle?.querySelector('i');
        if (icon) {
            if (isDark) {
                icon.classList.replace('fa-moon', 'fa-sun');
            } else {
                icon.classList.replace('fa-sun', 'fa-moon');
            }
        }
    }

    initializeElements() {
        this.container = document.getElementById('calendar-container');
        this.viewBtns = document.querySelectorAll('.view-btn');
        this.currentDateEl = document.getElementById('current-date');
        this.themeToggle = document.getElementById('theme-toggle');
        this.modal = document.getElementById('event-modal');
    }

    addEventListeners() {
        document.getElementById('prev-btn').addEventListener('click', () => this.navigate('prev'));
        document.getElementById('next-btn').addEventListener('click', () => this.navigate('next'));
        document.getElementById('today-btn').addEventListener('click', () => this.goToToday());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        this.viewBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentView = e.target.dataset.view;
                this.updateActiveView();
                this.render();
            });
        });

        document.getElementById('add-event').addEventListener('click', () => this.showEventModal());
        document.getElementById('event-form').addEventListener('submit', (e) => this.handleEventSubmit(e));

        // Add context menu listeners
        this.container.addEventListener('contextmenu', (e) => {
            const cell = e.target.closest('.calendar-cell');
            const eventEl = e.target.closest('.event');
            
            if (eventEl) {
                const eventId = parseInt(eventEl.dataset.id);
                const event = this.events.find(e => e.id === eventId);
                this.showContextMenu(e, 'event', { event });
            } else if (cell) {
                const date = new Date(cell.dataset.date);
                this.showContextMenu(e, 'cell', { date });
            }
        });
    }

    loadEvents() {
        return JSON.parse(localStorage.getItem('novaEvents')) || [];
    }

    saveEvents() {
        localStorage.setItem('novaEvents', JSON.stringify(this.events));
    }

    toggleTheme() {
        const isDark = document.body.classList.toggle('dark-mode');
        this.updateThemeIcon(isDark);
        localStorage.setItem('novaCalendarTheme', isDark ? 'dark' : 'light');
        
        // Track theme change
        NovaAnalytics.trackFeatureUsage(`theme_switch_${isDark ? 'dark' : 'light'}`);
    }

    formatDate() {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(this.currentDate);
    }

    navigate(direction) {
        const amount = direction === 'prev' ? -1 : 1;
        switch(this.currentView) {
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() + amount);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() + (amount * 7));
                break;
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() + amount);
                break;
        }
        this.render();
    }

    goToToday() {
        this.currentDate = new Date();
        this.render();
    }

    updateActiveView() {
        this.viewBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === this.currentView);
        });
        
        // Track view changes
        NovaAnalytics.trackCalendarAction('view_change', {
            new_view: this.currentView
        });
    }

    renderMonth() {
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const startDay = new Date(firstDay);
        startDay.setDate(startDay.getDate() - startDay.getDay());
        const today = new Date();

        let html = '<div class="calendar-grid">';
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        days.forEach(day => {
            html += `<div class="calendar-header">${day}</div>`;
        });

        for (let i = 0; i < 42; i++) {
            const date = new Date(startDay);
            const isCurrentMonth = date.getMonth() === this.currentDate.getMonth();
            const isToday = date.toDateString() === today.toDateString();
            
            html += `
                <div class="calendar-cell ${isCurrentMonth ? 'current-month' : 'other-month'} ${isToday ? 'today' : ''}"
                     data-date="${date.toISOString()}">
                    <div class="date-number ${isToday ? 'today-marker' : ''}">${date.getDate()}</div>
                    ${this.getEventsForDate(date)}
                </div>
            `;
            startDay.setDate(startDay.getDate() + 1);
        }

        html += '</div>';
        this.container.innerHTML = html;
        this.currentDateEl.textContent = this.formatDate();
    }

    getEventsForDate(date) {
        return this.events
            .filter(event => new Date(event.start).toDateString() === date.toDateString())
            .map(event => `
                <div class="event" 
                     data-id="${event.id}" 
                     style="background-color: ${event.color}">
                    <span class="event-time">
                        ${new Date(event.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    ${event.title}
                </div>
            `).join('');
    }

    showEventModal() {
        this.modal.style.display = 'block';
    }

    handleEventSubmit(e) {
        e.preventDefault();
        try {
            const eventData = {
                id: this.editingEventId || Date.now(),
                title: document.getElementById('event-title').value,
                start: new Date(document.getElementById('event-start').value),
                end: new Date(document.getElementById('event-end').value),
                description: document.getElementById('event-description').value,
                color: document.getElementById('event-color').value,
                repeat: document.getElementById('event-repeat').value,
                reminder: document.getElementById('event-reminder').value
            };

            this.validateEventData(eventData);

            if (this.editingEventId) {
                // Update existing event
                this.events = this.events.map(e => 
                    e.id === this.editingEventId ? eventData : e
                );
                this.editingEventId = null;
                this.showNotification('Event Updated', `"${eventData.title}" has been updated`);
            } else {
                // Add new event
                this.events.push(eventData);
                this.showNotification('Event Created', `"${eventData.title}" has been added`);
            }

            this.createRecurringEvents(eventData);
            this.saveEvents();
            this.render();
            this.modal.style.display = 'none';
            e.target.reset();
            
            // Set reminder if specified
            if (eventData.reminder !== 'none') {
                this.setEventReminder(eventData);
            }

            // Track event creation/update
            NovaAnalytics.trackCalendarAction(
                this.editingEventId ? 'update_event' : 'create_event',
                {
                    has_reminder: eventData.reminder !== 'none',
                    is_recurring: eventData.repeat !== 'none'
                }
            );
        } catch (error) {
            this.handleError(error, 'handleEventSubmit');
            return false;
        }
    }

    render() {
        switch(this.currentView) {
            case 'month':
                this.renderMonth();
                break;
            case 'week':
                this.renderWeek();
                break;
            case 'day':
                this.renderDay();
                break;
        }
    }

    checkNotificationPermission() {
        if ('Notification' in window) {
            return Notification.permission === 'granted';
        }
        return false;
    }

    initializeSearch() {
        const searchInput = document.getElementById('search-events');
        searchInput.addEventListener('input', (e) => this.searchEvents(e.target.value));
    }

    searchEvents(query) {
        const filteredEvents = this.events.filter(event => 
            event.title.toLowerCase().includes(query.toLowerCase()) ||
            event.description.toLowerCase().includes(query.toLowerCase())
        );
        this.render(filteredEvents);
    }

    initializeDragAndDrop() {
        new Draggable.Draggable(document.querySelector('.calendar-grid'), {
            draggable: '.event',
            delay: 100
        }).on('drag:start', this.handleDragStart.bind(this))
          .on('drag:stop', this.handleDragStop.bind(this));
    }

    handleDragStart(event) {
        this.draggedEvent = this.events.find(e => e.id === parseInt(event.source.dataset.id));
        event.source.classList.add('dragging');
    }

    handleDragStop(event) {
        const targetCell = event.source.closest('.calendar-cell');
        if (targetCell && this.draggedEvent) {
            const newDate = new Date(targetCell.dataset.date);
            this.updateEventDate(this.draggedEvent, newDate);
        }
        event.source.classList.remove('dragging');
        this.draggedEvent = null;
    }

    updateEventDate(event, newDate) {
        const timeDiff = event.end - event.start;
        event.start = newDate;
        event.end = new Date(newDate.getTime() + timeDiff);
        this.saveEvents();
        this.render();
    }

    showEventDetails(event, element) {
        const popup = document.getElementById('event-details');
        const rect = element.getBoundingClientRect();
        
        popup.innerHTML = `
            <h3>${event.title}</h3>
            <p>${this.formatDateRange(event.start, event.end)}</p>
            <p>${event.description}</p>
            <div class="event-actions">
                <button onclick="calendar.editEvent(${event.id})">Edit</button>
                <button onclick="calendar.deleteEvent(${event.id})">Delete</button>
            </div>
        `;

        popup.style.display = 'block';
        popup.style.left = `${rect.left}px`;
        popup.style.top = `${rect.bottom + 5}px`;
    }

    createRecurringEvents(event) {
        if (event.repeat === 'none') return;

        const recurringEvents = [];
        let currentDate = new Date(event.start);
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 3); // Create events for next 3 months

        while (currentDate < endDate) {
            const newEvent = {...event};
            newEvent.id = Date.now() + Math.random();
            newEvent.start = new Date(currentDate);
            newEvent.end = new Date(currentDate);
            newEvent.end.setHours(event.end.getHours());
            newEvent.end.setMinutes(event.end.getMinutes());

            recurringEvents.push(newEvent);

            switch(event.repeat) {
                case 'daily':
                    currentDate.setDate(currentDate.getDate() + 1);
                    break;
                case 'weekly':
                    currentDate.setDate(currentDate.getDate() + 7);
                    break;
                case 'monthly':
                    currentDate.setMonth(currentDate.getMonth() + 1);
                    break;
            }
        }

        this.events = [...this.events, ...recurringEvents];
        this.saveEvents();
    }

    showNotification(title, message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `
            <h4>${title}</h4>
            <p>${message}</p>
        `;
        
        this.notificationsCenter.appendChild(notification);
        
        // Remove notification after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    setEventReminder(event) {
        const reminderTime = new Date(event.start);
        reminderTime.setMinutes(reminderTime.getMinutes() - parseInt(event.reminder));

        const timeUntilReminder = reminderTime.getTime() - Date.now();
        if (timeUntilReminder > 0) {
            setTimeout(() => {
                this.showNotification(
                    'Event Reminder',
                    `${event.title} starts in ${event.reminder} minutes`
                );
            }, timeUntilReminder);
        }
    }

    initializeModals() {
        // Close button in header
        const closeBtn = this.modal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        // Cancel button
        const cancelBtn = this.modal.querySelector('.cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }

        // Close on click outside
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
    }

    closeModal() {
        this.modal.style.display = 'none';
        document.getElementById('event-form').reset();
    }

    formatTimeSlot(hour) {
        return `${hour.toString().padStart(2, '0')}:00`;
    }

    getTimeSlotsHtml() {
        let html = '';
        for (let i = 0; i < 24; i++) {
            html += `<div class="time-slot">${this.formatTimeSlot(i)}</div>`;
        }
        return html;
    }

    calculateEventPosition(event) {
        const start = new Date(event.start);
        const end = new Date(event.end);
        const top = (start.getHours() * 60 + start.getMinutes()) * (60/60); // 60px per hour
        const height = ((end - start) / (1000 * 60)) * (60/60); // Convert ms to minutes to pixels
        return { top, height };
    }

    renderWeek() {
        const weekStart = new Date(this.currentDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const today = new Date();

        let html = '<div class="time-grid">';
        
        // Time slots column
        html += `<div class="time-slots">${this.getTimeSlotsHtml()}</div>`;

        // Week grid
        html += '<div class="week-grid">';

        // Headers
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + i);
            const isToday = date.toDateString() === today.toDateString();
            
            html += `
                <div class="week-header ${isToday ? 'today' : ''}">
                    <div class="week-date">${date.getDate()}</div>
                    <div class="week-day">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                </div>
            `;
        }

        // Time grid for each day
        for (let hour = 0; hour < 24; hour++) {
            for (let day = 0; day < 7; day++) {
                const date = new Date(weekStart);
                date.setDate(date.getDate() + day);
                html += `<div class="week-cell" data-date="${date.toISOString()}" data-hour="${hour}"></div>`;
            }
        }

        html += '</div></div>';
        this.container.innerHTML = html;

        // Add events
        this.renderWeekEvents(weekStart);
        this.renderCurrentTimeLine();
    }

    renderDay() {
        const today = new Date();
        const isToday = this.currentDate.toDateString() === today.toDateString();

        let html = '<div class="time-grid">';
        
        // Time slots column
        html += `<div class="time-slots">${this.getTimeSlotsHtml()}</div>`;

        // Day grid
        html += '<div class="day-grid">';
        
        // Header
        html += `
            <div class="day-header ${isToday ? 'today' : ''}">
                <div class="day-date">${this.currentDate.getDate()}</div>
                <div class="day-day">
                    ${this.currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
                </div>
            </div>
        `;

        // Time grid
        for (let hour = 0; hour < 24; hour++) {
            html += `<div class="day-cell" data-hour="${hour}"></div>`;
        }

        html += '</div></div>';
        this.container.innerHTML = html;

        // Add events
        this.renderDayEvents();
        if (isToday) this.renderCurrentTimeLine();
    }

    renderCurrentTimeLine() {
        const now = new Date();
        const minutes = now.getHours() * 60 + now.getMinutes();
        const top = minutes * (60/60); // Convert to pixels (60px per hour)

        const marker = document.createElement('div');
        marker.className = 'current-time-marker';
        marker.style.top = `${top}px`;

        const gridContainer = document.querySelector('.week-grid, .day-grid');
        if (gridContainer) gridContainer.appendChild(marker);
    }

    renderWeekEvents(weekStart) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekEvents = this.events.filter(event => {
            const eventDate = new Date(event.start);
            return eventDate >= weekStart && eventDate < weekEnd;
        });

        weekEvents.forEach(event => {
            const { top, height } = this.calculateEventPosition(event);
            const eventDate = new Date(event.start);
            const dayOffset = eventDate.getDay();
            
            const eventEl = document.createElement('div');
            eventEl.className = 'timed-event';
            eventEl.style.top = `${top}px`;
            eventEl.style.height = `${height}px`;
            eventEl.style.backgroundColor = event.color;
            eventEl.innerHTML = `
                <div class="event-title">${event.title}</div>
                <div class="event-time">
                    ${eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            `;

            const dayColumn = document.querySelector(`.week-grid > div:nth-child(${dayOffset + 8})`);
            if (dayColumn) dayColumn.appendChild(eventEl);
        });
    }

    renderDayEvents() {
        const dayStart = new Date(this.currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const dayEvents = this.events.filter(event => {
            const eventDate = new Date(event.start);
            return eventDate >= dayStart && eventDate < dayEnd;
        });

        dayEvents.forEach(event => {
            const { top, height } = this.calculateEventPosition(event);
            
            const eventEl = document.createElement('div');
            eventEl.className = 'timed-event';
            eventEl.style.top = `${top}px`;
            eventEl.style.height = `${height}px`;
            eventEl.style.backgroundColor = event.color;
            eventEl.innerHTML = `
                <div class="event-title">${event.title}</div>
                <div class="event-time">
                    ${new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            `;

            const dayGrid = document.querySelector('.day-grid');
            if (dayGrid) dayGrid.appendChild(eventEl);
        });
    }

    createContextMenu() {
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        document.body.appendChild(menu);

        // Close context menu on click outside
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target)) {
                this.hideContextMenu();
            }
        });

        return menu;
    }

    showContextMenu(e, type, data) {
        e.preventDefault();
        this.hideContextMenu();
        
        let menuItems = [];
        
        if (type === 'cell') {
            this.selectedDate = new Date(data.date);
            menuItems = [
                {
                    icon: 'fa-plus',
                    text: 'Add Event',
                    action: () => this.quickAddEvent(this.selectedDate)
                },
                {
                    icon: 'fa-calendar',
                    text: 'Go to Date',
                    action: () => this.goToDate(this.selectedDate)
                }
            ];
        } else if (type === 'event') {
            this.selectedEvent = data.event;
            menuItems = [
                {
                    icon: 'fa-edit',
                    text: 'Edit Event',
                    action: () => this.editEvent(this.selectedEvent)
                },
                {
                    icon: 'fa-copy',
                    text: 'Duplicate Event',
                    action: () => this.duplicateEvent(this.selectedEvent)
                },
                { separator: true },
                {
                    icon: 'fa-trash',
                    text: 'Delete Event',
                    action: () => this.deleteEvent(this.selectedEvent)
                }
            ];
        }

        const menuHtml = menuItems.map(item => {
            if (item.separator) {
                return '<div class="context-menu-separator"></div>';
            }
            return `
                <div class="context-menu-item" data-action="${item.text}">
                    <i class="fas ${item.icon}"></i>
                    ${item.text}
                </div>
            `;
        }).join('');

        this.contextMenu.innerHTML = menuHtml;
        
        // Add click handlers
        this.contextMenu.querySelectorAll('.context-menu-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                menuItems[index].action();
                this.hideContextMenu();
            });
        });

        // Position menu
        const x = e.clientX;
        const y = e.clientY;
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
        
        // Show menu
        requestAnimationFrame(() => {
            this.contextMenu.classList.add('show');
        });
    }

    hideContextMenu() {
        this.contextMenu.classList.remove('show');
    }

    quickAddEvent(date) {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        
        date.setHours(hours, minutes);
        
        // Pre-fill the event form with the selected date
        document.getElementById('event-start').value = date.toISOString().slice(0, 16);
        
        const endDate = new Date(date);
        endDate.setHours(hours + 1);
        document.getElementById('event-end').value = endDate.toISOString().slice(0, 16);
        
        this.showEventModal();
    }

    editEvent(event) {
        // Pre-fill form with event data
        document.getElementById('event-title').value = event.title;
        document.getElementById('event-start').value = new Date(event.start).toISOString().slice(0, 16);
        document.getElementById('event-end').value = new Date(event.end).toISOString().slice(0, 16);
        document.getElementById('event-description').value = event.description;
        document.getElementById('event-color').value = event.color;
        document.getElementById('event-repeat').value = event.repeat;
        document.getElementById('event-reminder').value = event.reminder;
        
        // Store the event ID for updating
        this.editingEventId = event.id;
        
        this.showEventModal();
    }

    duplicateEvent(event) {
        const newEvent = {...event};
        newEvent.id = Date.now();
        newEvent.title = `Copy of ${event.title}`;
        this.events.push(newEvent);
        this.saveEvents();
        this.render();
        this.showNotification('Event Duplicated', `"${newEvent.title}" has been created`);
    }

    deleteEvent(event) {
        if (confirm(`Are you sure you want to delete "${event.title}"?`)) {
            this.events = this.events.filter(e => e.id !== event.id);
            this.saveEvents();
            this.render();
            this.showNotification('Event Deleted', `"${event.title}" has been removed`);
            
            // Track event deletion
            NovaAnalytics.trackCalendarAction('delete_event', {
                was_recurring: event.repeat !== 'none'
            });
        }
    }

    goToDate(date) {
        this.currentDate = new Date(date);
        this.render();
    }

    handleError(error, context) {
        console.error(`Error in ${context}:`, error);
        this.showNotification('Error', 'Something went wrong. Please try again.');
        
        // Track errors
        NovaAnalytics.trackEvent('Error', context, error.message);
    }

    validateEventData(eventData) {
        if (!eventData.title?.trim()) {
            throw new Error('Event title is required');
        }
        if (!eventData.start || !eventData.end) {
            throw new Error('Event start and end times are required');
        }
        if (new Date(eventData.end) <= new Date(eventData.start)) {
            throw new Error('End time must be after start time');
        }
    }

    initializeMobileFeatures() {
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.querySelector('.sidebar'); // Changed from getElementById to querySelector
        
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });

            // Close sidebar on outside click
            document.addEventListener('click', (e) => {
                if (sidebar?.classList.contains('active') && 
                    !sidebar.contains(e.target) && 
                    !sidebarToggle.contains(e.target)) {
                    sidebar.classList.remove('active');
                }
            });
        }

        // Bottom navigation
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) {
            bottomNav.addEventListener('click', (e) => {
                const navItem = e.target.closest('.bottom-nav-item');
                if (!navItem) return;

                e.preventDefault();
                const view = navItem.dataset.view;
                if (view) {
                    this.currentView = view;
                    this.updateActiveView();
                    this.render();
                }
            });
        }

        // Touch gestures
        this.initializeTouchGestures();
    }

    initializeTouchGestures() {
        let startX, startY;
        
        this.container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });

        this.container.addEventListener('touchmove', (e) => {
            if (!startX || !startY) return;

            const diffX = e.touches[0].clientX - startX;
            const diffY = e.touches[0].clientY - startY;

            // If horizontal swipe is greater than vertical and more than 50px
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                e.preventDefault();
                this.navigate(diffX > 0 ? 'prev' : 'next');
                startX = null;
                startY = null;
            }
        });
    }
}

// Initialize the calendar when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new NovaCalendar();
});
