/*
 * Mapbox GL JS Integration Example
 * 
 * This example shows how to integrate the TurnGuidanceFramework with Mapbox GL JS
 * for real-world navigation with turn-by-turn audio guidance.
 * 
 * This is a framework example - replace with actual Mapbox implementation
 */

import { TurnGuidanceFramework, type RouteSegment, type TurnPoint, type LatLon } from './turn-guidance-framework';

// Mock Mapbox GL JS types (replace with actual Mapbox types)
interface MapboxMap {
  on(event: string, callback: (e: any) => void): void;
  getSource(id: string): any;
  addSource(id: string, source: any): void;
  addLayer(layer: any): void;
}

interface MapboxDirections {
  setOrigin(coordinates: [number, number]): void;
  setDestination(coordinates: [number, number]): void;
  query(callback: (err: any, result: any) => void): void;
}

/**
 * Mapbox Navigation Integration Class
 * 
 * This class handles the integration between Mapbox GL JS and the TurnGuidanceFramework
 */
export class MapboxNavigationIntegration {
  private map: MapboxMap;
  private directions: MapboxDirections;
  private turnGuidance: TurnGuidanceFramework;
  private session: AppSession;

  constructor(map: MapboxMap, directions: MapboxDirections, session: AppSession) {
    this.map = map;
    this.directions = directions;
    this.session = session;
    this.turnGuidance = new TurnGuidanceFramework(session);
    
    this.initialize();
  }

  /**
   * Initialize the navigation integration
   */
  private initialize(): void {
    console.log('🗺️ Initializing Mapbox Navigation Integration');
    
    // Initialize turn guidance framework
    this.turnGuidance.initialize();
    
    // Set up map event listeners
    this.setupMapEventListeners();
  }

  /**
   * Set up map event listeners for route changes
   */
  private setupMapEventListeners(): void {
    // Listen for route changes from Mapbox Directions
    this.map.on('route', (e) => {
      this.handleRouteUpdate(e);
    });
  }

  /**
   * Handle route updates from Mapbox
   */
  private handleRouteUpdate(routeEvent: any): void {
    console.log('🛣️ Route updated from Mapbox');
    
    // Extract route data from Mapbox response
    const routeData = this.extractRouteData(routeEvent);
    
    // Convert to our framework format
    const routeSegments = this.convertToRouteSegments(routeData);
    const turnPoints = this.extractTurnPoints(routeData);
    
    // Set the route in our turn guidance framework
    this.turnGuidance.setRoute(routeSegments, turnPoints);
  }

  /**
   * Extract route data from Mapbox Directions response
   * 
   * This is where you would parse the actual Mapbox Directions API response
   */
  private extractRouteData(routeEvent: any): any {
    // Mock implementation - replace with actual Mapbox parsing
    return {
      routes: [{
        legs: [{
          steps: [
            {
              maneuver: { type: 'depart', location: [37.7749, -122.4194] },
              distance: 0,
              duration: 0
            },
            {
              maneuver: { type: 'turn', direction: 'right', location: [37.7753, -122.4180] },
              distance: 150,
              duration: 120
            },
            {
              maneuver: { type: 'turn', direction: 'left', location: [37.7759, -122.4170] },
              distance: 200,
              duration: 160
            },
            {
              maneuver: { type: 'arrive', location: [37.7766, -122.4160] },
              distance: 100,
              duration: 80
            }
          ]
        }]
      }]
    };
  }

  /**
   * Convert Mapbox route data to our RouteSegment format
   */
  private convertToRouteSegments(routeData: any): RouteSegment[] {
    const segments: RouteSegment[] = [];
    const route = routeData.routes[0];
    const leg = route.legs[0];
    
    for (let i = 0; i < leg.steps.length - 1; i++) {
      const currentStep = leg.steps[i];
      const nextStep = leg.steps[i + 1];
      
      const segment: RouteSegment = {
        id: `segment-${i}`,
        startPoint: {
          latitude: currentStep.maneuver.location[1],
          longitude: currentStep.maneuver.location[0]
        },
        endPoint: {
          latitude: nextStep.maneuver.location[1],
          longitude: nextStep.maneuver.location[0]
        },
        bearing: this.calculateBearing(
          currentStep.maneuver.location,
          nextStep.maneuver.location
        ),
        distance: currentStep.distance,
        turnPoint: this.createTurnPoint(nextStep, i)
      };
      
      segments.push(segment);
    }
    
    return segments;
  }

  /**
   * Extract turn points from Mapbox route data
   */
  private extractTurnPoints(routeData: any): TurnPoint[] {
    const turnPoints: TurnPoint[] = [];
    const route = routeData.routes[0];
    const leg = route.legs[0];
    
    let cumulativeDistance = 0;
    
    for (let i = 1; i < leg.steps.length; i++) {
      const step = leg.steps[i];
      const maneuver = step.maneuver;
      
      // Only create turn points for actual turns (not depart/arrive)
      if (maneuver.type === 'turn') {
        const turnPoint: TurnPoint = {
          id: `turn-${i}`,
          location: {
            latitude: maneuver.location[1],
            longitude: maneuver.location[0]
          },
          bearing: this.calculateBearing(
            leg.steps[i - 1].maneuver.location,
            maneuver.location
          ),
          turnType: this.mapManeuverToTurnType(maneuver),
          streetName: step.name || 'Unknown Street',
          distanceFromStart: cumulativeDistance
        };
        
        turnPoints.push(turnPoint);
      }
      
      cumulativeDistance += step.distance;
    }
    
    return turnPoints;
  }

  /**
   * Create a turn point from a Mapbox step
   */
  private createTurnPoint(step: any, index: number): TurnPoint | undefined {
    const maneuver = step.maneuver;
    
    // Skip depart/arrive maneuvers
    if (maneuver.type === 'depart' || maneuver.type === 'arrive') {
      return undefined;
    }
    
    return {
      id: `turn-${index}`,
      location: {
        latitude: maneuver.location[1],
        longitude: maneuver.location[0]
      },
      bearing: 0, // Will be calculated by the framework
      turnType: this.mapManeuverToTurnType(maneuver),
      streetName: step.name || 'Unknown Street',
      distanceFromStart: 0 // Will be calculated
    };
  }

  /**
   * Map Mapbox maneuver types to our turn types
   */
  private mapManeuverToTurnType(maneuver: any): 'left' | 'right' | 'straight' | 'uturn' {
    const direction = maneuver.direction;
    
    switch (direction) {
      case 'left':
        return 'left';
      case 'right':
        return 'right';
      case 'uturn':
        return 'uturn';
      case 'straight':
      default:
        return 'straight';
    }
  }

  /**
   * Calculate bearing between two coordinates
   */
  private calculateBearing(from: [number, number], to: [number, number]): number {
    // Simple bearing calculation - replace with more accurate implementation
    const deltaLon = to[0] - from[0];
    const lat1 = from[1] * Math.PI / 180;
    const lat2 = to[1] * Math.PI / 180;
    
    const y = Math.sin(deltaLon * Math.PI / 180) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon * Math.PI / 180);
    
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  /**
   * Start navigation to a destination
   */
  startNavigation(destination: LatLon): void {
    console.log(`🎯 Starting navigation to (${destination.latitude}, ${destination.longitude})`);
    
    // Set destination in Mapbox Directions
    this.directions.setDestination([destination.longitude, destination.latitude]);
    
    // Query for route
    this.directions.query((err, result) => {
      if (err) {
        console.error('Failed to get route:', err);
        return;
      }
      
      // Handle the route response
      this.handleRouteUpdate(result);
    });
  }

  /**
   * Update current location (called from GPS updates)
   */
  updateCurrentLocation(location: LatLon): void {
    // This would typically be called from your GPS tracking system
    console.log(`📍 Location updated: (${location.latitude}, ${location.longitude})`);
    
    // The turn guidance framework will handle the location update internally
    // through the session.events.onLocation subscription
  }

  /**
   * Get current navigation state
   */
  getNavigationState(): any {
    return this.turnGuidance.getNavigationState();
  }

  /**
   * Pause navigation
   */
  pauseNavigation(): void {
    this.turnGuidance.pauseNavigation();
  }

  /**
   * Resume navigation
   */
  resumeNavigation(): void {
    this.turnGuidance.resumeNavigation();
  }

  /**
   * Stop navigation
   */
  stopNavigation(): void {
    this.turnGuidance.stop();
  }
}

// Type definitions for integration
interface AppSession {
  events: {
    onLocation: (callback: (location: LatLon) => void) => () => void;
  };
  audio: {
    play: (url: string, options: { volume: number; category: string }) => Promise<void>;
  };
}

// Example usage:
/*
// Initialize Mapbox map and directions
const map = new mapboxgl.Map({...});
const directions = new MapboxDirections({...});

// Create navigation integration
const navigation = new MapboxNavigationIntegration(map, directions, session);

// Start navigation to a destination
navigation.startNavigation({
  latitude: 37.7766,
  longitude: -122.4160
});

// Update location from GPS
navigation.updateCurrentLocation({
  latitude: 37.7749,
  longitude: -122.4194
});
*/ 