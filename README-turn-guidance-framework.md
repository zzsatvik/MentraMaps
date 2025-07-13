# Turn Guidance Framework for MentraOS Navigation

A comprehensive framework for providing audio turn-by-turn navigation guidance through Mentra smart glasses. Designed to integrate with Mapbox GL JS for route planning and real GPS data from connected phones.

## 🎯 Core Features

- **Turn-based audio alerts** starting 30m before turns
- **Volume scaling** from 20% to 100% based on proximity
- **Real-time GPS integration** (2-4 second updates)
- **Mapbox GL JS ready** for route planning and turn detection
- **Multiple turn types** (left, right, straight, u-turn)
- **Route segment management** with automatic progression
- **Clean audio integration** with MentraOS AudioManager

## 📁 Files

- `turn-guidance-framework.ts` - Core framework for audio guidance
- `mapbox-integration-example.ts` - Example integration with Mapbox GL JS
- `README-turn-guidance-framework.md` - This documentation

## 🏗️ Architecture

```
Phone GPS (2-4s updates) → MentraOS Session → TurnGuidanceFramework → Audio Output
                                    ↓
                            Mapbox GL JS Route Data
```

## 🔧 Configuration

### Core Constants

```typescript
const TURN_ALERT_START_M = 30;      // Start alerting 30m before turn
const TURN_ALERT_MAX_VOL_M = 2;     // Max volume at 2m from turn
const ALERT_INTERVAL_MS = 1000;     // Alert interval (1 second)
const MIN_VOL = 0.2;                // Minimum volume (20%)
const MAX_VOL = 1.0;                // Maximum volume (100%)
```

### Volume Scaling

The framework provides linear volume scaling based on distance:

- **30m from turn**: 20% volume (quiet alert)
- **16m from turn**: 60% volume (moderate alert)
- **2m from turn**: 100% volume (loud alert)
- **Below 2m**: 100% volume (maximum alert)

## 🚀 Quick Start

### 1. Basic Integration

```typescript
import { TurnGuidanceFramework } from './turn-guidance-framework';

// Initialize with MentraOS session
const turnGuidance = new TurnGuidanceFramework(session);
turnGuidance.initialize();

// Set route data (from Mapbox or other source)
turnGuidance.setRoute(routeSegments, turnPoints);
```

### 2. Mapbox GL JS Integration

```typescript
import { MapboxNavigationIntegration } from './mapbox-integration-example';

// Initialize Mapbox components
const map = new mapboxgl.Map({...});
const directions = new MapboxDirections({...});

// Create navigation integration
const navigation = new MapboxNavigationIntegration(map, directions, session);

// Start navigation
navigation.startNavigation({
  latitude: 37.7766,
  longitude: -122.4160
});
```

## 📊 Data Structures

### TurnPoint Interface

```typescript
interface TurnPoint {
  id: string;
  location: LatLon;
  bearing: number;           // Direction to turn (degrees)
  turnType: 'left' | 'right' | 'straight' | 'uturn';
  streetName?: string;
  distanceFromStart: number; // Distance from route start
}
```

### RouteSegment Interface

```typescript
interface RouteSegment {
  id: string;
  startPoint: LatLon;
  endPoint: LatLon;
  bearing: number;
  distance: number;
  turnPoint?: TurnPoint;     // Turn point at end of segment
}
```

### NavigationState Interface

```typescript
interface NavigationState {
  currentLocation: LatLon;
  currentBearing: number;
  currentSpeed: number;      // meters per second
  isNavigating: boolean;
  currentSegmentIndex: number;
  distanceToNextTurn: number;
}
```

## 🗺️ Mapbox Integration

### Route Data Flow

1. **Mapbox Directions API** provides route with turn-by-turn instructions
2. **MapboxNavigationIntegration** converts Mapbox data to framework format
3. **TurnGuidanceFramework** processes route segments and turn points
4. **Audio alerts** play based on proximity to turns

### Converting Mapbox Data

```typescript
// Mapbox step structure
{
  maneuver: { 
    type: 'turn', 
    direction: 'right', 
    location: [longitude, latitude] 
  },
  distance: 150,
  duration: 120
}

// Converts to TurnPoint
{
  id: 'turn-1',
  location: { latitude: 37.7753, longitude: -122.4180 },
  bearing: 90,
  turnType: 'right',
  streetName: '5th Street',
  distanceFromStart: 150
}
```

## 🎧 Audio Integration

### Audio Files Required

You'll need to host these audio files and update the URLs:

- `turn-left.mp3` - "Turn left"
- `turn-right.mp3` - "Turn right"  
- `continue-straight.mp3` - "Continue straight"
- `uturn.mp3` - "Make a U-turn"
- `arrival.mp3` - "You have arrived"

### Audio Configuration

```typescript
await session.audio.play(audioUrl, {
  volume: calculatedVolume,  // 0.2 to 1.0
  category: 'navigation'     // Audio category for glasses
});
```

## 📱 GPS Integration

### Location Updates

The framework automatically handles GPS updates through the MentraOS session:

```typescript
// Framework subscribes to location updates
this.locationUnsubscribe = this.session.events.onLocation((location) => {
  this.updateLocation(location);
});
```

### Update Frequency

- **Expected frequency**: 2-4 seconds from connected phone
- **Framework handles**: Variable update intervals gracefully
- **Distance calculations**: Real-time based on latest GPS fix

## 🔄 Navigation Flow

1. **Route Setup**: Mapbox provides route with turn points
2. **Location Tracking**: GPS updates every 2-4 seconds
3. **Distance Calculation**: Real-time distance to next turn
4. **Volume Scaling**: Audio volume based on proximity
5. **Turn Detection**: Automatic progression through route segments
6. **Completion**: Arrival alert when destination reached

## 🛠️ API Reference

### TurnGuidanceFramework

```typescript
class TurnGuidanceFramework {
  constructor(session: AppSession)
  
  // Core methods
  initialize(): void
  setRoute(routeSegments: RouteSegment[], turns: TurnPoint[]): void
  getNavigationState(): NavigationState
  pauseNavigation(): void
  resumeNavigation(): void
  stop(): void
}
```

### MapboxNavigationIntegration

```typescript
class MapboxNavigationIntegration {
  constructor(map: MapboxMap, directions: MapboxDirections, session: AppSession)
  
  // Navigation methods
  startNavigation(destination: LatLon): void
  updateCurrentLocation(location: LatLon): void
  getNavigationState(): NavigationState
  pauseNavigation(): void
  resumeNavigation(): void
  stopNavigation(): void
}
```

## 🔧 Customization

### Adjusting Alert Distances

```typescript
// Modify these constants in turn-guidance-framework.ts
const TURN_ALERT_START_M = 30;      // Start alerting distance
const TURN_ALERT_MAX_VOL_M = 2;     // Max volume distance
```

### Custom Turn Types

```typescript
// Add new turn types to the TurnPoint interface
turnType: 'left' | 'right' | 'straight' | 'uturn' | 'merge' | 'exit';
```

### Audio Customization

```typescript
// Modify audio URLs in playTurnAlert method
switch (turnPoint.turnType) {
  case 'left':
    audioUrl = 'https://YOUR_CDN/custom-turn-left.mp3';
    break;
  // ... other cases
}
```

## 🧪 Testing

### Mock GPS Data

```typescript
// Simulate GPS movement for testing
const mockLocations = [
  { latitude: 37.7749, longitude: -122.4194 },
  { latitude: 37.7753, longitude: -122.4180 },
  // ... more locations
];

mockLocations.forEach(location => {
  navigation.updateCurrentLocation(location);
});
```

### Route Testing

```typescript
// Test with sample route data
const testRoute = [
  {
    id: 'segment-1',
    startPoint: { latitude: 37.7749, longitude: -122.4194 },
    endPoint: { latitude: 37.7753, longitude: -122.4180 },
    bearing: 90,
    distance: 150,
    turnPoint: {
      id: 'turn-1',
      location: { latitude: 37.7753, longitude: -122.4180 },
      bearing: 90,
      turnType: 'right',
      streetName: '5th Street',
      distanceFromStart: 150
    }
  }
];

turnGuidance.setRoute(testRoute, [testRoute[0].turnPoint]);
```

## 🚨 Error Handling

The framework includes comprehensive error handling:

- **Audio playback failures**: Logged but don't crash navigation
- **GPS errors**: Graceful handling of location update failures
- **Route errors**: Validation of route data before processing
- **Network issues**: Retry logic for audio file loading

## 📈 Performance Considerations

- **Memory efficient**: Automatic cleanup of completed route segments
- **CPU optimized**: Efficient distance calculations using geolib
- **Battery friendly**: Debounced audio alerts (1 per second max)
- **Network optimized**: Audio files cached by MentraOS

## 🔮 Future Enhancements

- **Speed-based alerts**: Adjust timing based on walking speed
- **Contextual audio**: Include street names in turn instructions
- **Haptic feedback**: Integration with glasses vibration
- **Offline support**: Cached audio files and route data
- **Accessibility**: Support for different audio cue patterns

## 📞 Support

This framework is designed to be production-ready for MentraOS navigation. For integration questions or customizations, refer to the Mapbox GL JS documentation and MentraOS SDK reference. 