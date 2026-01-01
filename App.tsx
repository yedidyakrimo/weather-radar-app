
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, CloudRain, Search, Map as MapIcon, 
  Satellite, Thermometer, Wind, CloudLightning, Home, Navigation,
  Clock, Settings, Palette, ChevronDown, ChevronUp
} from 'lucide-react';
import { fetchRadarMetadata, searchLocations, fetchCurrentWeather } from './services/weatherService';
import { RainViewerMetadata, MapStyle, OverlayType, CurrentWeather, RadarScheme } from './types';
import RadarMap from './components/RadarMap';
import Legend from './components/Legend';

const RADAR_SCHEMES: RadarScheme[] = [
  { id: 2, name: 'כחול אוניברסלי' },
  { id: 1, name: 'קלאסי (RainViewer)' },
  { id: 4, name: 'ערוץ מזג האוויר' },
  { id: 6, name: 'NEXRAD (ארה"ב)' },
  { id: 7, name: 'קשת בענן' },
  { id: 8, name: 'Dark Sky' },
];

const App: React.FC = () => {
  const [metadata, setMetadata] = useState<RainViewerMetadata | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(800);
  const [opacity, setOpacity] = useState(0.8);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [mapStyle, setMapStyle] = useState<MapStyle>('dark');
  const [overlayType, setOverlayType] = useState<OverlayType>('radar');
  const [radarScheme, setRadarScheme] = useState<number>(2);
  const [selectedWeather, setSelectedWeather] = useState<CurrentWeather | null>(null);
  const [selectedPos, setSelectedPos] = useState<[number, number] | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchRadarMetadata();
      setMetadata(data);
      
      const framesCount = overlayType === 'radar' 
        ? data.radar.past.length + data.radar.nowcast.length
        : data.satellite.infrared.length;
      
      if (currentIndex === 0) {
        setCurrentIndex(Math.max(0, (overlayType === 'radar' ? data.radar.past.length : data.satellite.infrared.length) - 1));
      }
      setError(null);
    } catch (err) {
      console.error(err);
      setError('שגיאה בתקשורת עם השרת.');
    } finally {
      setLoading(false);
    }
  }, [overlayType]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    if (!metadata) return;
    const framesCount = overlayType === 'radar' 
      ? metadata.radar.past.length + metadata.radar.nowcast.length
      : metadata.satellite.infrared.length;
    if (framesCount === 0) return;

    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % framesCount);
      }, playbackSpeed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, metadata, playbackSpeed, overlayType]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const resetToIsrael = () => {
    setUserCoords(null);
    setSelectedPos(null);
    setSelectedWeather(null);
    setResetTrigger(prev => prev + 1);
  };

  const switchOverlay = (type: OverlayType) => {
    setOverlayType(type);
    setCurrentIndex(0);
  };

  const locateUser = () => {
    if (!navigator.geolocation) return alert("הדפדפן לא תומך במיקום");
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserCoords(coords);
        handleMapClick(coords[0], coords[1]);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        alert("לא ניתן לגשת למיקום.");
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.length < 2) return;
    const results = await searchLocations(searchQuery);
    setSearchResults(results);
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setSelectedPos([lat, lng]);
    try {
      const weather = await fetchCurrentWeather(lat, lng);
      setSelectedWeather(weather);
    } catch (e) { console.error(e); }
  };

  const frames = metadata ? (overlayType === 'radar' ? [...metadata.radar.past, ...metadata.radar.nowcast] : metadata.satellite.infrared) : [];
  const currentFrame = frames[currentIndex];
  const isForecast = metadata && overlayType === 'radar' ? currentIndex >= metadata.radar.past.length : false;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 flex flex-col font-sans select-none">
      
      {/* Header - Account for iPhone Notch */}
      <header className="absolute top-0 left-0 right-0 z-[1001] p-4 pt-[calc(1rem+env(safe-area-inset-top))] pointer-events-none" dir="rtl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex flex-col gap-2 pointer-events-auto">
            <div className="bg-slate-900/90 backdrop-blur-md px-5 py-3 rounded-2xl border border-slate-700 shadow-2xl flex items-center gap-3">
              <CloudRain className="w-6 h-6 text-blue-400" />
              <h1 className="text-xl font-black text-white hidden sm:block">מכ"ם גשם</h1>
              <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>
              <form onSubmit={handleSearch} className="relative">
                <input 
                  type="text" 
                  placeholder="חפש עיר..." 
                  className="bg-slate-800 border-none rounded-xl py-2 px-4 pr-10 text-sm text-white focus:ring-2 focus:ring-blue-500 w-48 sm:w-72 transition-all outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-500" />
                {searchResults.length > 0 && (
                  <div className="absolute top-full mt-2 left-0 right-0 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
                    {searchResults.map((res, i) => (
                      <button key={i} onClick={() => { setUserCoords([parseFloat(res.lat), parseFloat(res.lon)]); setSearchResults([]); setSearchQuery(''); handleMapClick(parseFloat(res.lat), parseFloat(res.lon)); }} className="w-full text-right px-4 py-3 text-sm text-slate-200 hover:bg-slate-800 border-b border-slate-800 last:border-0 transition-colors">{res.display_name}</button>
                    ))}
                  </div>
                )}
              </form>
            </div>
          </div>

          <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700 pointer-events-auto flex items-center gap-4 shadow-xl">
             <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isForecast ? 'bg-amber-400' : 'bg-green-500'} animate-pulse`}></div>
              <span className="text-sm font-bold text-white whitespace-nowrap">
                {isForecast ? 'תחזית' : 'זמן אמת'}: {currentFrame ? formatDate(currentFrame.time) : '--:--'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar - Account for safe areas */}
      <aside className="absolute right-6 top-1/2 -translate-y-1/2 z-[1001] flex flex-col gap-4 pointer-events-auto pr-[env(safe-area-inset-right)]" dir="rtl">
        <div className="bg-slate-900/90 backdrop-blur-xl p-3 rounded-3xl border border-emerald-500/30 shadow-2xl flex flex-col items-center justify-center gap-1 min-w-[80px]">
          <Clock className="w-5 h-5 text-emerald-400" />
          <span className="text-lg font-black text-white tracking-tighter tabular-nums">
            {currentTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">עכשיו</span>
        </div>

        <div className="bg-slate-900/90 backdrop-blur-xl p-2 rounded-3xl border border-slate-700 shadow-2xl flex flex-col gap-3">
          <button onClick={resetToIsrael} className="p-3 rounded-2xl text-white hover:bg-slate-800 transition-all flex flex-col items-center gap-1 group" title="חזור לישראל"><Home className="w-6 h-6 text-blue-400" /><span className="text-[10px] font-bold text-slate-500">ישראל</span></button>
          <button onClick={locateUser} className="p-3 rounded-2xl text-white hover:bg-slate-800 transition-all flex flex-col items-center gap-1 group" title="איפה אני?"><Navigation className={`w-6 h-6 text-emerald-400 ${isLocating ? 'animate-spin' : ''}`} /><span className="text-[10px] font-bold text-slate-500">מיקום שלי</span></button>
          <div className="h-px bg-slate-800 mx-2"></div>
          <button onClick={() => switchOverlay('radar')} className={`p-3 rounded-2xl transition-all flex flex-col items-center gap-1 group ${overlayType === 'radar' ? 'bg-blue-600/30 ring-1 ring-blue-500' : 'text-slate-500 hover:bg-slate-800'}`}><CloudLightning className="w-6 h-6 text-blue-400" /><span className="text-[10px] font-bold">מכ"ם</span></button>
          <button onClick={() => switchOverlay('satellite')} className={`p-3 rounded-2xl transition-all flex flex-col items-center gap-1 group ${overlayType === 'satellite' ? 'bg-blue-600/30 ring-1 ring-blue-500' : 'text-slate-500 hover:bg-slate-800'}`}><Satellite className="w-6 h-6 text-blue-400" /><span className="text-[10px] font-bold">לוויין</span></button>
        </div>

        <div className="bg-slate-900/90 backdrop-blur-xl p-2 rounded-3xl border border-slate-700 shadow-2xl flex flex-col gap-2">
          <button onClick={() => setShowSettings(!showSettings)} className={`p-3 rounded-2xl transition-all ${showSettings ? 'bg-blue-600/30 text-white' : 'text-slate-500 hover:bg-slate-800'}`} title='הגדרות מכ"ם'><Palette className="w-5 h-5" /></button>
          {(['dark', 'satellite', 'terrain'] as MapStyle[]).map(style => (
            <button key={style} onClick={() => setMapStyle(style)} className={`p-3 rounded-2xl transition-all ${mapStyle === style ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-800'}`}><MapIcon className="w-5 h-5" /></button>
          ))}
        </div>
      </aside>

      {/* Settings Overlay - Position adjust for mobile */}
      {showSettings && (
        <div className="absolute right-28 top-1/2 -translate-y-1/2 z-[1001] bg-slate-900/95 backdrop-blur-2xl p-6 rounded-[2rem] border border-slate-700 shadow-2xl w-64 animate-in fade-in slide-in-from-right-8" dir="rtl">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-black text-lg">סגנון מכ"ם</h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white p-2">✕</button>
           </div>
           <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {RADAR_SCHEMES.map(scheme => (
                <button 
                  key={scheme.id}
                  onClick={() => setRadarScheme(scheme.id)}
                  className={`w-full text-right p-4 rounded-xl text-sm font-bold transition-all ${radarScheme === scheme.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  {scheme.name}
                </button>
              ))}
           </div>
        </div>
      )}

      {/* Local Weather Panel */}
      {selectedWeather && selectedPos && (
        <div className="absolute left-6 top-1/4 z-[1001] bg-slate-900/95 backdrop-blur-2xl p-6 rounded-[2rem] border border-slate-700 shadow-2xl w-72 animate-in fade-in slide-in-from-left-8" dir="rtl">
           <button onClick={() => setSelectedWeather(null)} className="absolute top-4 left-4 text-slate-500 hover:text-white p-2">✕</button>
           <h3 className="text-white font-black text-xl mb-4">מזג אוויר כאן</h3>
           <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-blue-400"><Thermometer className="w-8 h-8" /><span className="text-4xl font-black">{selectedWeather.temp.toFixed(1)}°</span></div>
                <span className="text-slate-300 font-bold bg-slate-800 px-3 py-1 rounded-full text-sm">{selectedWeather.condition}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/80 p-4 rounded-2xl flex flex-col gap-1"><div className="flex items-center gap-2 text-slate-400"><Wind className="w-4 h-4" /><span>רוח</span></div><span className="text-white font-black">{selectedWeather.windSpeed}</span></div>
                <div className="bg-slate-800/80 p-4 rounded-2xl flex flex-col gap-1"><div className="flex items-center gap-2 text-blue-400"><CloudRain className="w-4 h-4" /><span>גשם</span></div><span className="text-white font-black">{selectedWeather.rain}</span></div>
              </div>
           </div>
        </div>
      )}

      {/* Map Content */}
      <main className="flex-grow w-full h-full relative">
        {(loading || isLocating) && (
          <div className="absolute inset-0 z-[1002] bg-slate-950/60 backdrop-blur-md flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 bg-slate-900 p-8 rounded-[3rem] border border-slate-700 shadow-2xl">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-white font-black text-lg tracking-wider">טוען נתונים...</span>
            </div>
          </div>
        )}
        <RadarMap 
          metadata={metadata} 
          currentIndex={currentIndex} 
          opacity={opacity}
          userCoords={userCoords}
          mapStyle={mapStyle}
          overlayType={overlayType}
          onMapClick={handleMapClick}
          selectedPos={selectedPos}
          resetTrigger={resetTrigger}
          radarScheme={radarScheme}
        />
        <div className="pl-[env(safe-area-inset-left)]">
          {overlayType === 'radar' && <Legend />}
        </div>
      </main>

      {/* Footer Controls - Account for Home Indicator */}
      <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1001] w-[92%] max-w-3xl px-4 pointer-events-auto pb-[env(safe-area-inset-bottom)]" dir="rtl">
        <div className="bg-slate-900/95 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-slate-700 shadow-2xl flex flex-col gap-6">
          <div className="relative h-3 w-full bg-slate-800/50 rounded-full overflow-hidden">
            <div className="absolute top-0 right-0 h-full bg-blue-500 transition-all duration-300" style={{ width: `${(currentIndex / Math.max(1, frames.length - 1)) * 100}%` }}></div>
            <input type="range" min="0" max={Math.max(0, frames.length - 1)} value={currentIndex} onChange={(e) => { setCurrentIndex(parseInt(e.target.value)); setIsPlaying(false); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </div>
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <button onClick={togglePlay} className="w-14 h-14 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all shadow-xl active:scale-95">{isPlaying ? <Pause size={28} fill="white" /> : <Play size={28} fill="white" className="mr-1" />}</button>
              <button onClick={loadData} className="w-12 h-12 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-all active:rotate-180 duration-500"><RotateCcw className="w-6 h-6" /></button>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center"><span className="text-[9px] text-slate-500 font-black mb-1 uppercase tracking-wider">מהירות</span><select value={playbackSpeed} onChange={(e) => setPlaybackSpeed(parseInt(e.target.value))} className="bg-slate-800 border border-slate-700 px-3 py-1 rounded-xl text-xs font-bold text-white outline-none"><option value={1200}>איטי</option><option value={800}>רגיל</option><option value={400}>מהיר</option></select></div>
              <div className="flex flex-col items-center"><span className="text-[9px] text-slate-500 font-black mb-1 uppercase tracking-wider">שקיפות</span><input type="range" min="0.1" max="1" step="0.1" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} className="w-20 accent-blue-500 h-1.5 rounded-full cursor-pointer bg-slate-800" /></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
