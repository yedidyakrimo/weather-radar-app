
export interface RadarFrame {
  time: number;
  path: string;
}

export interface RainViewerMetadata {
  version: string;
  generated: number;
  host: string;
  radar: {
    past: RadarFrame[];
    nowcast: RadarFrame[];
  };
  satellite: {
    infrared: RadarFrame[];
  };
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

export interface CurrentWeather {
  temp: number;
  condition: string;
  windSpeed: number;
  rain: number;
}

export type MapStyle = 'dark' | 'light' | 'satellite' | 'terrain';
export type OverlayType = 'radar' | 'satellite';

export interface RadarScheme {
  id: number;
  name: string;
}
