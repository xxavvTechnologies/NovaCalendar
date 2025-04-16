class WeatherAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.openweathermap.org/data/2.5';
    }

    async getForecast({ lat, lng }, date) {
        // Validate coordinates
        if (!lat || !lng) {
            throw new Error('Invalid coordinates');
        }

        // Ensure we have a valid date
        const targetDate = date instanceof Date ? date : new Date(date);
        const targetTimestamp = Math.floor(targetDate.getTime() / 1000);
        
        const response = await fetch(
            `${this.baseUrl}/forecast?lat=${lat}&lon=${lng}&appid=${this.apiKey}&units=metric&exclude=minutely,alerts`,
            {
                headers: {
                    'Accept-Language': 'en-US'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Weather forecast request failed');
        }

        const data = await response.json();
        
        // Find the forecast closest to our target time
        const forecast = data.list.reduce((closest, current) => {
            const currentDiff = Math.abs(current.dt - targetTimestamp);
            const closestDiff = Math.abs(closest.dt - targetTimestamp);
            return currentDiff < closestDiff ? current : closest;
        }, data.list[0]);

        return {
            temp: Math.round(forecast.main.temp),
            description: forecast.weather[0].description,
            icon: forecast.weather[0].icon,
            humidity: forecast.main.humidity,
            windSpeed: forecast.wind.speed
        };
    }

    async getLocation(address) {
        // If we have coordinates from Places API, use them directly
        if (window.placesAPI?.lastSelectedPlace) {
            const place = window.placesAPI.lastSelectedPlace;
            return {
                lat: place.lat,
                lng: place.lng,
                name: place.name,
                country: place.address.split(',').pop().trim()
            };
        }

        // Fallback to OpenWeather geocoding
        const response = await fetch(
            `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(address)}&limit=1&appid=${this.apiKey}`
        );

        if (!response.ok) {
            throw new Error('Geocoding request failed');
        }

        const data = await response.json();
        if (data.length === 0) {
            throw new Error('Location not found');
        }

        return {
            lat: data[0].lat,
            lng: data[0].lon,
            name: data[0].name,
            country: data[0].country
        };
    }

    formatWeather(forecast) {
        if (!forecast) return 'Forecast unavailable';
        
        return `${forecast.temp}°C, ${forecast.description}
                💨 ${forecast.windSpeed}m/s  💧 ${forecast.humidity}%`;
    }
}
