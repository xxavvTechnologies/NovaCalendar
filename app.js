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
        this.hapticFeedback = 'vibrate' in navigator;
        this.offlineMode = !navigator.onLine;
        this.syncQueue = [];
        this.initializeOfflineSupport();
        this.initializeNaturalLanguage();
        this.setupSharing();
        this.initializeKeyboardShortcuts();
        this.weatherAPI = new WeatherAPI('7faaa2944c4d4cc1091c8d1fd39998a5');
        this.initializePlaces();
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
        this.eventPopup = document.getElementById('event-details-popup');
        this.eventPopupContent = this.eventPopup.querySelector('.event-details-content');
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

        // Add event popup listeners
        document.addEventListener('click', (e) => {
            const eventEl = e.target.closest('.event');
            const clickedInsidePopup = this.eventPopup.contains(e.target);
            const isPopupButton = e.target.tagName === 'BUTTON' && clickedInsidePopup;

            if (eventEl && !clickedInsidePopup) {
                e.preventDefault();
                e.stopPropagation();
                const eventData = JSON.parse(eventEl.dataset.event);
                this.showEventPopup(eventData, eventEl);
            } else if (!clickedInsidePopup && !isPopupButton) {
                this.hideEventPopup();
            }
        });

        // Optional: Show on hover only if popup isn't already active
        let hoverTimer;
        document.addEventListener('mouseover', (e) => {
            const eventEl = e.target.closest('.event');
            if (eventEl && !this.eventPopup.classList.contains('active')) {
                hoverTimer = setTimeout(() => {
                    const eventData = JSON.parse(eventEl.dataset.event);
                    this.showEventPopup(eventData, eventEl);
                }, 500);
            }
        });

        document.addEventListener('mouseout', (e) => {
            clearTimeout(hoverTimer);
            if (!this.eventPopup.contains(e.target) && !e.target.closest('.event')) {
                // Only hide if not active (wasn't clicked)
                if (!this.eventPopup.classList.contains('active')) {
                    this.hideEventPopup();
                }
            }
        });
    }

    loadEvents() {
        const events = JSON.parse(localStorage.getItem('novaEvents')) || [];
        // Convert date strings back to Date objects
        return events.map(event => ({
            ...event,
            start: new Date(event.start),
            end: new Date(event.end)
        }));
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
        const eventsToUse = this.filteredEvents || this.events;
        return eventsToUse
            .filter(event => event.start.toDateString() === date.toDateString())
            .map(event => `
                <div class="event" 
                     data-id="${event.id}"
                     data-event='${JSON.stringify({
                         ...event,
                         start: event.start.toISOString(),
                         end: event.end.toISOString()
                     })}'
                     style="background-color: ${event.color}">
                    <span class="event-time">
                        ${event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    ${event.title}
                </div>
            `).join('');
    }

    showEventModal() {
        this.modal.style.display = 'block';
    }

    async handleEventSubmit(e) {
        e.preventDefault();
        try {
            const location = window.placesAPI?.lastSelectedPlace;
            const startDate = new Date(document.getElementById('event-start').value);
            const eventData = {
                id: this.editingEventId || Date.now(),
                title: document.getElementById('event-title').value,
                start: startDate,
                end: new Date(document.getElementById('event-end').value),
                description: document.getElementById('event-description').value,
                color: document.getElementById('event-color').value,
                repeat: document.getElementById('event-repeat').value,
                reminder: document.getElementById('event-reminder').value,
                attendees: this.getAttendees(),
                location: location ? location.address : '',
                locationLat: location ? location.lat : null,
                locationLng: location ? location.lng : null,
                tags: document.getElementById('event-tags').value.split(',').map(t => t.trim()),
                attachments: await this.processAttachments()
            };

            // Add weather data if location exists
            if (location && location.lat && location.lng) {
                try {
                    eventData.weather = await this.weatherAPI.getForecast(
                        { lat: location.lat, lng: location.lng }, 
                        startDate
                    );
                } catch (weatherError) {
                    console.warn('Weather fetch failed:', weatherError);
                    // Don't fail event creation if weather fetch fails
                }
            }

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

            if (eventData.attendees.length > 0) {
                this.sendEventInvites(eventData);
            }
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
        if (!query.trim()) {
            // If search is empty, show all events
            this.filteredEvents = null;
            this.render();
            return;
        }

        const searchTerms = query.toLowerCase().split(' ');
        this.filteredEvents = this.events.filter(event => {
            const searchText = `${event.title} ${event.description || ''} ${event.location || ''}`.toLowerCase();
            return searchTerms.every(term => searchText.includes(term));
        });
        this.render();
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
                    action: () => this.deleteEvent(this.selectedEvent.id)
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
        
        // Store actions for reference
        this.menuActions = menuItems;
        
        // Add click handlers with proper binding
        this.contextMenu.querySelectorAll('.context-menu-item').forEach((item, index) => {
            if (this.menuActions[index] && !this.menuActions[index].separator) {
                item.addEventListener('click', () => {
                    this.menuActions[index].action();
                    this.hideContextMenu();
                });
            }
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
        
        // Restore location data
        if (event.location) {
            window.placesAPI?.setPlace({
                lat: event.locationLat,
                lng: event.locationLng,
                name: event.location.split(',')[0],
                address: event.location
            });
        }
        
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

    deleteEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (event && confirm(`Are you sure you want to delete "${event.title}"?`)) {
            this.events = this.events.filter(e => e.id !== eventId);
            this.saveEvents();
            this.render();
            this.hideEventPopup();
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
        const errors = [];
        
        if (!eventData.title?.trim()) {
            errors.push('Event title is required');
        }
        if (!eventData.start || !eventData.end) {
            errors.push('Event start and end times are required');
        }
        if (new Date(eventData.end) <= new Date(eventData.start)) {
            errors.push('End time must be after start time');
        }
        
        if (errors.length > 0) {
            throw new Error(errors.join('\n'));
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
        let startX, startY, initialPinchDistance;

        const touch = {
            start(e) {
                if (e.touches.length === 2) {
                    initialPinchDistance = Math.hypot(
                        e.touches[0].pageX - e.touches[1].pageX,
                        e.touches[0].pageY - e.touches[1].pageY
                    );
                } else {
                    startX = e.touches[0].clientX;
                    startY = e.touches[0].clientY;
                }
            },

            move(e) {
                if (e.touches.length === 2) {
                    const currentDistance = Math.hypot(
                        e.touches[0].pageX - e.touches[1].pageX,
                        e.touches[0].pageY - e.touches[1].pageY
                    );
                    if (currentDistance > initialPinchDistance * 1.2) {
                        this.zoomIn();
                    } else if (currentDistance < initialPinchDistance * 0.8) {
                        this.zoomOut();
                    }
                } else if (startX && startY) {
                    const diffX = e.touches[0].clientX - startX;
                    const diffY = e.touches[0].clientY - startY;

                    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                        e.preventDefault();
                        this.navigate(diffX > 0 ? 'prev' : 'next');
                        this.vibrate(20);
                        startX = null;
                        startY = null;
                    }
                }
            }
        };

        this.container.addEventListener('touchstart', e => touch.start(e), { passive: true });
        this.container.addEventListener('touchmove', e => touch.move.call(this, e));
    }

    vibrate(pattern = 50) {
        if (this.hapticFeedback) {
            navigator.vibrate(pattern);
        }
    }

    initializeOfflineSupport() {
        window.addEventListener('online', () => {
            this.offlineMode = false;
            this.processSyncQueue();
            this.showNotification('Online Mode', 'Calendar syncing enabled');
        });

        window.addEventListener('offline', () => {
            this.offlineMode = true;
            this.showNotification('Offline Mode', 'Changes will sync when online');
        });
    }

    processSyncQueue() {
        while (this.syncQueue.length > 0) {
            const action = this.syncQueue.shift();
            this.syncWithServer(action);
        }
    }

    initializeNaturalLanguage() {
        const titleInput = document.getElementById('event-title');
        titleInput.addEventListener('input', () => {
            const text = titleInput.value;
            const parsed = this.parseNaturalDate(text);
            if (parsed) {
                document.getElementById('event-start').value = parsed.start;
                document.getElementById('event-end').value = parsed.end;
            }
        });
    }

    parseNaturalDate(text) {
        const patterns = {
            'today at': new Date(),
            'tomorrow at': new Date(Date.now() + 86400000),
            'next week': new Date(Date.now() + 604800000)
        };

        for (const [pattern, baseDate] of Object.entries(patterns)) {
            if (text.toLowerCase().includes(pattern)) {
                const timeMatch = text.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
                if (timeMatch) {
                    return this.createDateFromMatch(timeMatch, baseDate);
                }
            }
        }
        return null;
    }

    setupSharing() {
        if (navigator.share) {
            const shareButtons = document.querySelectorAll('.share-event');
            shareButtons.forEach(btn => {
                btn.style.display = 'block';
                btn.addEventListener('click', e => {
                    const eventId = e.target.dataset.eventId;
                    this.shareEvent(eventId);
                });
            });
        }
    }

    async shareEvent(eventId) {
        const event = this.events.find(e => e.id === parseInt(eventId));
        if (!event) return;

        try {
            await navigator.share({
                title: event.title,
                text: `${event.title} - ${new Date(event.start).toLocaleString()}`,
                url: `${window.location.origin}/event/${eventId}`
            });
            this.vibrate(50);
        } catch (err) {
            console.error('Sharing failed:', err);
        }
    }

    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.key.toLowerCase()) {
                case 't':
                    if (e.ctrlKey) this.goToToday();
                    break;
                case 'n':
                    if (e.ctrlKey) this.showEventModal();
                    break;
                case 'd':
                    if (e.ctrlKey && e.shiftKey) this.toggleTheme();
                    break;
                case 'arrowleft':
                    if (e.ctrlKey) this.navigate('prev');
                    break;
                case 'arrowright':
                    if (e.ctrlKey) this.navigate('next');
                    break;
            }
        });
    }

    getAttendees() {
        const input = document.getElementById('event-attendees');
        return input.value.split(',')
            .map(email => email.trim())
            .filter(email => email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/));
    }

    async processAttachments() {
        const fileInput = document.getElementById('event-attachments');
        const files = Array.from(fileInput.files);
        
        if (files.length === 0) return [];

        // Convert files to base64 for storage
        return Promise.all(files.map(async file => ({
            name: file.name,
            type: file.type,
            size: file.size,
            data: await this.fileToBase64(file)
        })));
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async getWeatherForecast() {
        const location = window.placesAPI?.lastSelectedPlace;
        if (!location?.lat || !location?.lng) return null;

        try {
            const weatherContainer = document.querySelector('.event-weather');
            if (weatherContainer) {
                weatherContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading weather...</div>';
            }

            const forecast = await this.weatherAPI.getForecast(location, this.selectedDate);
            return {
                ...forecast,
                location: location.address
            };
        } catch (error) {
            console.warn('Weather forecast unavailable:', error);
            const weatherContainer = document.querySelector('.event-weather');
            if (weatherContainer) {
                weatherContainer.innerHTML = '<div class="error"><i class="fas fa-exclamation-circle"></i> Weather data unavailable</div>';
            }
            return null;
        }
    }

    async geocodeLocation(address) {
        try {
            const results = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`,
                {
                    headers: {
                        'Accept-Language': 'en-US'
                    }
                }
            );
            const data = await results.json();
            
            if (data?.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }
            throw new Error('Location not found');
        } catch (error) {
            console.error('Geocoding failed:', error);
            throw new Error('Could not find location');
        }
    }

    sendEventInvites(event) {
        event.attendees.forEach(email => {
            const invite = this.createCalendarInvite(event);
            this.sendEmail(email, 'Event Invitation', invite);
        });
    }

    createCalendarInvite(event) {
        return `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${this.formatDateForICS(event.start)}
DTEND:${this.formatDateForICS(event.end)}
SUMMARY:${event.title}
DESCRIPTION:${event.description}
LOCATION:${event.location}
END:VEVENT
END:VCALENDAR`;
    }

    renderEventDetails(event) {
        const start = new Date(event.start);
        const end = new Date(event.end);
        
        // Weather section with better error handling
        const weatherSection = event.weather ? `
            <div class="event-weather">
                <i class="fas fa-cloud"></i>
                <img src="https://openweathermap.org/img/wn/${event.weather.icon}@2x.png" 
                     alt="${event.weather.description}"
                     class="weather-icon">
                <div class="weather-details">
                    <div class="weather-info">${this.weatherAPI.formatWeather(event.weather)}</div>
                </div>
            </div>
        ` : event.locationLat && event.locationLng ? `
            <div class="event-weather">
                <i class="fas fa-spinner fa-spin"></i>
                <div class="weather-details">
                    <div class="weather-info">Loading weather...</div>
                </div>
            </div>
        ` : '';

        return `
            <div class="event-detail-header" style="border-left: 4px solid ${event.color}; padding-left: 12px;">
                <h3>${event.title}</h3>
                <div class="event-datetime">
                    ${start.toLocaleDateString()} ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                    ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div class="event-actions">
                    <button onclick="calendar.editEvent(${JSON.stringify(event)})">Edit</button>
                    <button onclick="calendar.deleteEvent(${event.id})">Delete</button>
                </div>
            </div>
            ${event.description ? `
                <div class="event-description">
                    <p>${event.description}</p>
                </div>
            ` : ''}
            ${event.location ? `
                <div class="event-location">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${event.location}</span>
                </div>
            ` : ''}
            ${weatherSection}
            ${event.tags?.length ? `
                <div class="event-tags">
                    ${event.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
            ${event.attendees?.length ? `
                <div class="event-attendees">
                    <h4>Attendees</h4>
                    <div class="attendee-list">
                        ${event.attendees.map(email => `
                            <div class="attendee">
                                <i class="fas fa-user"></i>
                                <span>${email}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    }

    showEventPopup(event, element) {
        const eventData = {
            ...event,
            start: new Date(event.start),
            end: new Date(event.end)
        };

        const html = this.renderEventDetails(eventData);
        this.eventPopupContent.innerHTML = html;
        this.eventPopup.style.display = 'block';
        this.eventPopup.classList.add('active');

        // Improved positioning logic
        const rect = element.getBoundingClientRect();
        const popup = this.eventPopup;
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        let left = Math.min(
            rect.right + 10,
            viewportWidth - popup.offsetWidth - 10
        );
        
        if (left < 10) left = 10;
        
        let top = Math.min(
            rect.top,
            viewportHeight - popup.offsetHeight - 10
        );
        
        if (top < 10) top = 10;

        // Add smooth animation
        popup.style.transform = 'scale(0.95)';
        popup.style.opacity = '0';
        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;
        
        requestAnimationFrame(() => {
            popup.style.transform = 'scale(1)';
            popup.style.opacity = '1';
        });
    }

    hideEventPopup() {
        this.eventPopup.style.display = 'none';
        this.eventPopup.classList.remove('active'); // Remove active class when hiding
    }

    initializePlaces() {
        window.placesAPI = new PlacesAPI();
        const locationContainer = document.querySelector('.location-input-container');
        if (locationContainer) {
            placesAPI.initialize(locationContainer);
        }
    }
    
    async updateEventWeather(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event || !event.locationLat || !event.locationLng) return;

        try {
            const weather = await this.weatherAPI.getForecast(
                { lat: event.locationLat, lng: event.locationLng },
                event.start
            );
            event.weather = weather;
            this.saveEvents();
            
            // Update popup if it's showing this event
            const popup = document.querySelector('.event-details-popup[data-event-id="' + eventId + '"]');
            if (popup && popup.style.display === 'block') {
                this.eventPopupContent.innerHTML = this.renderEventDetails(event);
            }
        } catch (error) {
            console.warn('Failed to fetch weather:', error);
        }
    }
}

// Initialize the calendar when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.calendar = new NovaCalendar();
});
