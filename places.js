class PlacesAPI {
    constructor() {
        this.lastSelectedPlace = null;
        this.searchDelay = null;
        this.dropdown = null;
        this.cache = new Map();
        this.requestTimes = [];
        this.CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
        this.RATE_LIMIT = 1000; // 1 request per second
        this.loadCache();
    }

    initialize(containerElement) {
        // Create input field
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Add location';
        input.className = 'location-input';
        
        // Create dropdown for suggestions
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'location-dropdown';
        
        containerElement.appendChild(input);
        containerElement.appendChild(this.dropdown);

        input.addEventListener('input', (e) => this.handleInput(e));
        input.addEventListener('focus', () => this.dropdown.style.display = 'block');
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!containerElement.contains(e.target)) {
                this.dropdown.style.display = 'none';
            }
        });

        // Add attribution
        const attribution = document.createElement('div');
        attribution.className = 'osm-attribution';
        attribution.innerHTML = '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>';
        containerElement.appendChild(attribution);
    }

    async handleInput(e) {
        const query = e.target.value;
        if (!query) {
            this.dropdown.style.display = 'none';
            return;
        }

        // Debounce search requests
        clearTimeout(this.searchDelay);
        this.searchDelay = setTimeout(async () => {
            try {
                const results = await this.searchPlaces(query);
                this.showResults(results);
            } catch (error) {
                console.error('Place search failed:', error);
            }
        }, 300);
    }

    loadCache() {
        try {
            const cached = localStorage.getItem('placesCache');
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < this.CACHE_EXPIRY) {
                    Object.entries(data).forEach(([key, value]) => {
                        this.cache.set(key, value);
                    });
                } else {
                    localStorage.removeItem('placesCache');
                }
            }
        } catch (error) {
            console.warn('Failed to load places cache:', error);
        }
    }

    saveCache() {
        try {
            const data = Object.fromEntries(this.cache);
            localStorage.setItem('placesCache', JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.warn('Failed to save places cache:', error);
        }
    }

    async searchPlaces(query) {
        // Check cache first
        const cached = this.cache.get(query);
        if (cached) {
            return cached;
        }

        // Rate limiting
        const now = Date.now();
        this.requestTimes = this.requestTimes.filter(time => now - time < this.RATE_LIMIT);
        
        if (this.requestTimes.length > 0) {
            const delay = this.RATE_LIMIT - (now - this.requestTimes[0]);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        this.requestTimes.push(now);

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`,
            {
                headers: {
                    'Accept-Language': 'en-US',
                    'User-Agent': 'NovaCalendar/1.0' // Identify your application
                }
            }
        );

        const results = await response.json();
        
        // Cache the results
        this.cache.set(query, results);
        this.saveCache();

        return results;
    }

    showResults(results) {
        this.dropdown.innerHTML = '';
        
        results.forEach(place => {
            const item = document.createElement('div');
            item.className = 'location-item';
            item.textContent = place.display_name;
            
            item.addEventListener('click', () => {
                this.lastSelectedPlace = {
                    lat: parseFloat(place.lat),
                    lng: parseFloat(place.lon),
                    name: place.display_name.split(',')[0],
                    address: place.display_name
                };
                
                const input = item.closest('.location-input-container').querySelector('input');
                input.value = place.display_name;
                input.dataset.lat = place.lat;
                input.dataset.lon = place.lon;
                this.dropdown.style.display = 'none';
            });
            
            this.dropdown.appendChild(item);
        });
        
        this.dropdown.style.display = results.length ? 'block' : 'none';
    }

    setPlace(place) {
        if (!place) return;
        
        const input = document.querySelector('.location-input');
        if (input) {
            input.value = place.address;
            input.dataset.lat = place.lat;
            input.dataset.lon = place.lng;
            this.lastSelectedPlace = place;
        }
    }

    getSelectedLocation() {
        return this.lastSelectedPlace;
    }
}
