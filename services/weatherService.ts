
import { RainViewerMetadata, SearchResult, CurrentWeather } from '../types';

const RAINVIEWER_API_URL = 'https://api.rainviewer.com/public/weather-maps.json';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

export const fetchRadarMetadata = async (): Promise<RainViewerMetadata> => {
  try {
    const response = await fetch(RAINVIEWER_API_URL);
    if (!response.ok) throw new Error('Failed to fetch radar data');
    return await response.json();
  } catch (error) {
    console.error('Error fetching radar metadata:', error);
    throw error;
  }
};

export const getRadarTileUrl = (
  host: string,
  path: string,
  colorScheme: number = 2,
  smooth: boolean = true,
  snow: boolean = true
): string => {
  return `${host}${path}/256/{z}/{x}/{y}/${colorScheme}/${smooth ? 1 : 0}_${snow ? 1 : 0}.png`;
};

export const searchLocations = async (query: string): Promise<SearchResult[]> => {
  if (!query || query.length < 2) return [];
  try {
    const response = await fetch(`${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=il`);
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};

export const fetchCurrentWeather = async (lat: number, lon: number): Promise<CurrentWeather> => {
  try {
    const response = await fetch(`${OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=precipitation`);
    const data = await response.json();
    return {
      temp: data.current_weather.temperature,
      condition: getWeatherCondition(data.current_weather.weathercode),
      windSpeed: data.current_weather.windspeed,
      rain: data.hourly.precipitation[0] || 0
    };
  } catch (error) {
    console.error('Weather error:', error);
    throw error;
  }
};

const getWeatherCondition = (code: number): string => {
  if (code === 0) return 'בהיר';
  if (code <= 3) return 'מעונן חלקית';
  if (code <= 48) return 'ערפילי';
  if (code <= 67) return 'גשום';
  if (code <= 77) return 'שלג';
  if (code <= 99) return 'סופות רעמים';
  return 'משתנה';
};
