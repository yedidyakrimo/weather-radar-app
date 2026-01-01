
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { RainViewerMetadata, MapStyle, OverlayType } from '../types';
import { getRadarTileUrl } from '../services/weatherService';

interface RadarMapProps {
  metadata: RainViewerMetadata | null;
  currentIndex: number;
  opacity: number;
  userCoords: [number, number] | null;
  mapStyle: MapStyle;
  overlayType: OverlayType;
  onMapClick: (lat: number, lng: number) => void;
  selectedPos: [number, number] | null;
  resetTrigger: number;
  radarScheme: number;
}

const IsraelCenter: [number, number] = [31.5, 34.8];
const IsraelZoom = 8;

const MapController: React.FC<{ 
  onMapClick: (lat: number, lng: number) => void; 
  userCoords: [number, number] | null;
  resetTrigger: number;
}> = ({ onMapClick, userCoords, resetTrigger }) => {
  const map = useMap();
  
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    if (resetTrigger > 0) {
      map.setView(IsraelCenter, IsraelZoom, { animate: true });
    }
  }, [resetTrigger, map]);

  useEffect(() => {
    if (userCoords) {
      map.setView(userCoords, 11, { animate: true });
    }
  }, [userCoords, map]);

  useEffect(() => {
    const timer = setInterval(() => {
      map.invalidateSize();
    }, 1000);
    return () => clearInterval(timer);
  }, [map]);

  return null;
};

const RadarMap: React.FC<RadarMapProps> = ({ 
  metadata, currentIndex, opacity, userCoords, mapStyle, overlayType, onMapClick, selectedPos, resetTrigger, radarScheme
}) => {
  const styleUrls = {
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
  };

  const userIcon = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-12 h-12 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
        <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-xl relative z-10"></div>
      </div>
    `,
    className: '',
    iconSize: [48, 48],
    iconAnchor: [24, 24]
  });

  const selectedIcon = L.divIcon({
    html: `<div class="w-8 h-8 flex items-center justify-center text-red-500 drop-shadow-lg"><svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="2" fill="white" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3" fill="currentColor"></circle></svg></div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  const frames = metadata 
    ? (overlayType === 'radar' ? [...metadata.radar.past, ...metadata.radar.nowcast] : metadata.satellite.infrared)
    : [];

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-900">
      <MapContainer
        center={IsraelCenter}
        zoom={IsraelZoom}
        zoomControl={false}
        className="w-full h-full"
        style={{ height: '100%', width: '100%' }}
        minZoom={4}
        maxZoom={18}
      >
        <TileLayer
          key={`base-${mapStyle}`}
          url={styleUrls[mapStyle]}
          attribution='&copy; OpenStreetMap'
          zIndex={1}
          maxZoom={20}
        />
        
        {metadata && frames.map((frame, idx) => {
          const isCurrent = idx === currentIndex;
          if (!isCurrent) return null;

          return (
            <TileLayer
              key={`${overlayType}-${frame.time}-${radarScheme}`}
              url={getRadarTileUrl(metadata.host, frame.path, overlayType === 'radar' ? radarScheme : 0)}
              opacity={opacity}
              zIndex={10}
              maxNativeZoom={10}
              maxZoom={20}
              bounds={[[20, 20], [45, 45]]}
            />
          );
        })}

        <MapController 
          onMapClick={onMapClick} 
          userCoords={userCoords} 
          resetTrigger={resetTrigger} 
        />

        {userCoords && <Marker position={userCoords} icon={userIcon} />}
        {selectedPos && <Marker position={selectedPos} icon={selectedIcon} />}
      </MapContainer>
    </div>
  );
};

export default RadarMap;
