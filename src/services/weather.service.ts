export interface WeatherData {
  temperature: number;
  feelsLike: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  city: string;
  isDay: boolean;
}

// Open-Meteo WMO weather codes mapping
const weatherCodes: Record<number, { condition: string; icon: string }> = {
  0: { condition: 'Ciel dégagé', icon: 'sun' },
  1: { condition: 'Principalement dégagé', icon: 'cloud-sun' },
  2: { condition: 'Partiellement nuageux', icon: 'cloud-sun' },
  3: { condition: 'Nuageux', icon: 'cloud' },
  45: { condition: 'Brouillard', icon: 'fog' },
  48: { condition: 'Brouillard givrant', icon: 'fog' },
  51: { condition: 'Bruine légère', icon: 'cloud-drizzle' },
  53: { condition: 'Bruine modérée', icon: 'cloud-drizzle' },
  55: { condition: 'Bruine dense', icon: 'cloud-drizzle' },
  61: { condition: 'Pluie légère', icon: 'cloud-rain' },
  63: { condition: 'Pluie modérée', icon: 'cloud-rain' },
  65: { condition: 'Pluie forte', icon: 'cloud-rain' },
  71: { condition: 'Neige légère', icon: 'snowflake' },
  73: { condition: 'Neige modérée', icon: 'snowflake' },
  75: { condition: 'Neige forte', icon: 'snowflake' },
  77: { condition: 'Grains de neige', icon: 'snowflake' },
  80: { condition: 'Averses légères', icon: 'cloud-rain' },
  81: { condition: 'Averses modérées', icon: 'cloud-rain' },
  82: { condition: 'Averses fortes', icon: 'cloud-rain' },
  85: { condition: 'Neige légère', icon: 'snowflake' },
  86: { condition: 'Neige forte', icon: 'snowflake' },
  95: { condition: 'Orage', icon: 'cloud-lightning' },
  96: { condition: 'Orage avec grêle', icon: 'cloud-lightning' },
  99: { condition: 'Orage avec grêle forte', icon: 'cloud-lightning' },
};

// Geocoding cache
const geocodingCache = new Map<string, { lat: number; lon: number; name: string }>();

async function geocodeCity(city: string): Promise<{ lat: number; lon: number; name: string } | null> {
  const cacheKey = city.toLowerCase().trim();
  if (geocodingCache.has(cacheKey)) {
    return geocodingCache.get(cacheKey)!;
  }

  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fr&format=json`
    );

    if (!response.ok) throw new Error('Geocoding failed');

    const data = await response.json();
    if (!data.results || data.results.length === 0) return null;

    const result = data.results[0];
    const coordinates = {
      lat: result.latitude,
      lon: result.longitude,
      name: result.name,
    };

    geocodingCache.set(cacheKey, coordinates);
    return coordinates;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export const weatherService = {
  async getCurrentWeather(city: string): Promise<WeatherData | null> {
    try {
      const location = await geocodeCity(city);
      if (!location) {
        console.warn(`City not found: ${city}`);
        return null;
      }

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&timezone=auto`
      );

      if (!response.ok) throw new Error('Weather API failed');

      const data = await response.json();
      const current = data.current;
      const weatherInfo = weatherCodes[current.weather_code] || { condition: 'Inconnu', icon: 'cloud' };

      return {
        temperature: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature),
        condition: weatherInfo.condition,
        icon: weatherInfo.icon,
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        city: location.name,
        isDay: current.is_day === 1,
      };
    } catch (error) {
      console.error('Weather service error:', error);
      return null;
    }
  },

  convertTemperature(celsius: number, unit: 'celsius' | 'fahrenheit'): number {
    if (unit === 'fahrenheit') {
      return Math.round((celsius * 9) / 5 + 32);
    }
    return celsius;
  },
};
