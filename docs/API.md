# 🔌 מסמך API ושירותים - מכ"ם גשם

## תוכן עניינים
1. [סקירה כללית](#סקירה-כללית)
2. [RainViewer API](#rainviewer-api)
3. [Nominatim API](#nominatim-api)
4. [Open-Meteo API](#open-meteo-api)
5. [שירותי עזר](#שירותי-עזר)
6. [טיפול בשגיאות](#טיפול-בשגיאות)

---

## סקירה כללית

האפליקציה משתמשת ב-3 APIs חיצוניים ציבוריים:

| API | מטרה | עדכון | אותנטיקציה |
|-----|------|--------|-------------|
| **RainViewer** | נתוני מכ"ם ולוויין | 10 דק' | ❌ לא נדרש |
| **Nominatim** | חיפוש מיקומים | - | ❌ לא נדרש |
| **Open-Meteo** | נתוני מזג אוויר | 1 שעה | ❌ לא נדרש |

**יתרונות:**
- ✅ אין צורך במפתחות API
- ✅ שימוש חופשי
- ✅ ללא הגבלת rate
- ✅ תמיכה ב-CORS

---

## RainViewer API

### תיאור
**RainViewer** הוא שירות המספק נתוני מכ"ם מטאורולוגי ותמונות לוויין גלובליים בזמן אמת.

### Endpoint ראשי

```http
GET https://api.rainviewer.com/public/weather-maps.json
```

### תגובה (Response)

```typescript
interface RainViewerMetadata {
  version: string;           // גרסת API
  generated: number;         // timestamp יצירה
  host: string;              // שרת tiles
  radar: {
    past: RadarFrame[];      // פריימים היסטוריים
    nowcast: RadarFrame[];   // פריימי תחזית
  };
  satellite: {
    infrared: RadarFrame[];  // תמונות לוויין IR
  };
}

interface RadarFrame {
  time: number;              // Unix timestamp
  path: string;              // נתיב tile
}
```

### דוגמת תגובה

```json
{
  "version": "1.5",
  "generated": 1704110400,
  "host": "https://tilecache.rainviewer.com",
  "radar": {
    "past": [
      {
        "time": 1704109200,
        "path": "/v2/radar/1704109200/256"
      },
      {
        "time": 1704109800,
        "path": "/v2/radar/1704109800/256"
      }
    ],
    "nowcast": [
      {
        "time": 1704110400,
        "path": "/v2/radar/1704110400/256"
      }
    ]
  },
  "satellite": {
    "infrared": [
      {
        "time": 1704109200,
        "path": "/v2/satellite/1704109200/256"
      }
    ]
  }
}
```

---

### Tile URL Construction

**פונקציה:**
```typescript
getRadarTileUrl(
  host: string,
  path: string,
  colorScheme: number = 2,
  smooth: boolean = true,
  snow: boolean = true
): string
```

**פורמט URL:**
```
{host}{path}/256/{z}/{x}/{y}/{colorScheme}/{smooth}_{snow}.png
```

**דוגמה:**
```
https://tilecache.rainviewer.com/v2/radar/1704109200/256/7/69/50/2/1_1.png
```

**פרמטרים:**
- `{z}` - רמת זום (0-20)
- `{x}` - קואורדינטת X של tile
- `{y}` - קואורדינטת Y של tile
- `{colorScheme}` - מזהה סכמת צבע (1-8)
- `{smooth}` - החלקה (0=לא, 1=כן)
- `{snow}` - תצוגת שלג (0=לא, 1=כן)

---

### סכמות צבע זמינות

| ID | שם | תיאור |
|----|-----|-------|
| 1 | Original | קלאסי RainViewer |
| 2 | Universal Blue | כחול אוניברסלי (ברירת מחדל) |
| 3 | TITAN | סגנון TITAN |
| 4 | The Weather Channel | ערוץ מזג האוויר |
| 5 | Meteored | סגנון Meteored |
| 6 | NEXRAD | תקן אמריקאי |
| 7 | Rainbow | קשת בענן |
| 8 | Dark Sky | Dark Sky מינימליסטי |

---

### יישום בקוד

**קריאה לנתונים:**
```typescript
export const fetchRadarMetadata = async (): Promise<RainViewerMetadata> => {
  try {
    const response = await fetch(RAINVIEWER_API_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch radar data');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching radar metadata:', error);
    throw error;
  }
};
```

**בניית URL:**
```typescript
export const getRadarTileUrl = (
  host: string,
  path: string,
  colorScheme: number = 2,
  smooth: boolean = true,
  snow: boolean = true
): string => {
  return `${host}${path}/256/{z}/{x}/{y}/${colorScheme}/${smooth ? 1 : 0}_${snow ? 1 : 0}.png`;
};
```

---

### תדירות עדכון

**מכ"ם:**
- עדכון כל 10 דקות
- 12 פריימים עבר
- 6 פריימי תחזית (nowcast)
- סה"כ: 18 פריימים

**לוויין:**
- עדכון כל 15-30 דקות
- תלוי בלוויין ובאזור
- בדרך כלל 8-12 פריימים

---

## Nominatim API

### תיאור
**Nominatim** הוא שירות geocoding של OpenStreetMap לחיפוש מיקומים גיאוגרפיים.

### Endpoint

```http
GET https://nominatim.openstreetmap.org/search
```

### פרמטרים

| פרמטר | סוג | תיאור | חובה |
|--------|-----|-------|------|
| `q` | string | שאילתת חיפוש | ✅ |
| `format` | string | פורמט תגובה (json) | ✅ |
| `limit` | number | מספר תוצאות מקסימלי | ❌ |
| `countrycodes` | string | קודי מדינה (il) | ❌ |

### תגובה (Response)

```typescript
interface SearchResult {
  display_name: string;      // שם מלא למיקום
  lat: string;               // קו רוחב
  lon: string;               // קו אורך
  type: string;              // סוג מיקום
  importance: number;        // רלוונטיות
}
```

### דוגמת קריאה

```http
GET https://nominatim.openstreetmap.org/search?q=תל%20אביב&format=json&limit=5&countrycodes=il
```

### דוגמת תגובה

```json
[
  {
    "display_name": "תל אביב-יפו, מחוז תל אביב, ישראל",
    "lat": "32.0852999",
    "lon": "34.7817676",
    "type": "city",
    "importance": 0.7856
  },
  {
    "display_name": "תל אביב, רחוב תל אביב, חיפה",
    "lat": "32.8156",
    "lon": "34.9895",
    "type": "street",
    "importance": 0.325
  }
]
```

---

### יישום בקוד

```typescript
export const searchLocations = async (query: string): Promise<SearchResult[]> => {
  if (!query || query.length < 2) return [];
  
  try {
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=il`;
    const response = await fetch(url);
    
    if (!response.ok) return [];
    
    return await response.json();
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};
```

---

### הגבלות וכללים

**Usage Policy:**
- ✅ מקסימום 1 בקשה לשנייה
- ✅ חובה לציין User-Agent
- ✅ אין לשמור תוצאות בקבע
- ❌ אין לבצע bulk queries

**Best Practices:**
- מינימום 2-3 תווים לחיפוש
- Debounce של 300ms
- Cache מקומי לתוצאות זהות

---

## Open-Meteo API

### תיאור
**Open-Meteo** מספק נתוני מזג אוויר מדויקים ללא צורך ב-API key.

### Endpoint

```http
GET https://api.open-meteo.com/v1/forecast
```

### פרמטרים

| פרמטר | סוג | תיאור | חובה |
|--------|-----|-------|------|
| `latitude` | number | קו רוחב | ✅ |
| `longitude` | number | קו אורך | ✅ |
| `current_weather` | boolean | מזג אוויר נוכחי | ❌ |
| `hourly` | string | פרמטרים שעתיים | ❌ |

### תגובה (Response)

```typescript
interface OpenMeteoResponse {
  current_weather: {
    temperature: number;      // טמפרטורה (°C)
    windspeed: number;        // מהירות רוח (km/h)
    winddirection: number;    // כיוון רוח (°)
    weathercode: number;      // קוד תנאי מזג אוויר
    time: string;             // זמן תצפית
  };
  hourly: {
    time: string[];
    precipitation: number[];  // משקעים (mm)
  };
}
```

### דוגמת קריאה

```http
GET https://api.open-meteo.com/v1/forecast?latitude=32.0853&longitude=34.7818&current_weather=true&hourly=precipitation
```

### דוגמת תגובה

```json
{
  "current_weather": {
    "temperature": 22.5,
    "windspeed": 15.2,
    "winddirection": 270,
    "weathercode": 3,
    "time": "2024-01-01T12:00"
  },
  "hourly": {
    "time": ["2024-01-01T12:00", "2024-01-01T13:00"],
    "precipitation": [0.0, 0.2]
  }
}
```

---

### Weather Codes

**מיפוי קודים לתיאורים בעברית:**

```typescript
const getWeatherCondition = (code: number): string => {
  if (code === 0) return 'בהיר';
  if (code <= 3) return 'מעונן חלקית';
  if (code <= 48) return 'ערפילי';
  if (code <= 67) return 'גשום';
  if (code <= 77) return 'שלג';
  if (code <= 99) return 'סופות רעמים';
  return 'משתנה';
};
```

**טבלת קודים:**

| קוד | תיאור אנגלית | תיאור עברית |
|-----|--------------|-------------|
| 0 | Clear sky | בהיר |
| 1-3 | Partly cloudy | מעונן חלקית |
| 45-48 | Fog | ערפילי |
| 51-67 | Rain | גשום |
| 71-77 | Snow | שלג |
| 80-99 | Thunderstorm | סופות רעמים |

---

### יישום בקוד

```typescript
export const fetchCurrentWeather = async (
  lat: number,
  lon: number
): Promise<CurrentWeather> => {
  try {
    const url = `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=precipitation`;
    const response = await fetch(url);
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
```

---

### הגבלות

**Rate Limits:**
- ✅ 10,000 בקשות ביום (חינם)
- ✅ מקסימום 5,000 בקשות בשעה
- ✅ אין צורך בהרשמה

**Cache:**
- נתונים מתעדכנים כל שעה
- מומלץ cache מקומי של 15-30 דקות

---

## שירותי עזר

### תבניות TypeScript

**קובץ types.ts:**

```typescript
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
```

---

### קונפיגורציה

**קבועים:**

```typescript
const RAINVIEWER_API_URL = 'https://api.rainviewer.com/public/weather-maps.json';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

const REFRESH_INTERVAL = 3 * 60 * 1000; // 3 minutes
const SEARCH_MIN_LENGTH = 2;
const SEARCH_LIMIT = 5;
```

---

## טיפול בשגיאות

### אסטרטגיות

#### 1. Network Errors

```typescript
try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return await response.json();
} catch (error) {
  console.error('Network error:', error);
  // Fallback or retry
  return fallbackData;
}
```

#### 2. Timeout

```typescript
const fetchWithTimeout = async (url: string, timeout = 5000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};
```

#### 3. Retry Logic

```typescript
const fetchWithRetry = async (
  url: string,
  maxRetries = 3
): Promise<Response> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
};
```

---

### הודעות למשתמש

```typescript
const handleError = (error: Error, context: string) => {
  const messages = {
    network: 'שגיאה בתקשורת עם השרת',
    timeout: 'החיבור לשרת לקח יותר מדי זמן',
    parse: 'שגיאה בעיבוד נתונים',
    location: 'לא ניתן לגשת למיקום',
    unknown: 'אירעה שגיאה לא צפויה'
  };
  
  const message = messages[context] || messages.unknown;
  setError(message);
  console.error(`[${context}]`, error);
};
```

---

## תרשים זרימת API

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       │ (1) Load App
       ▼
┌──────────────────────┐
│  fetchRadarMetadata  │
│  ↓                   │
│  RainViewer API      │
└──────┬───────────────┘
       │
       │ (2) Click Map / Search
       ▼
┌──────────────────────┐
│  searchLocations     │──▶ (if search)
│  ↓                   │
│  Nominatim API       │
└──────┬───────────────┘
       │
       │ (3) Select Location
       ▼
┌──────────────────────┐
│ fetchCurrentWeather  │
│  ↓                   │
│  Open-Meteo API      │
└──────┬───────────────┘
       │
       │ (4) Display Data
       ▼
┌──────────────────────┐
│   Render UI          │
└──────────────────────┘
```

---

## סיכום

**יתרונות הארכיטקטורה:**
- ✅ פשוטה ויעילה
- ✅ ללא תלות באותנטיקציה
- ✅ עלויות אפס
- ✅ ביצועים גבוהים
- ✅ קלה לתחזוקה

**נקודות לשיפור:**
- הוספת cache מתקדם יותר
- מנגנון retry אוטומטי
- fallback בשגיאות API
- monitoring ו-logging

