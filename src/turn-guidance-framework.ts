/*
 * Turn Guidance Framework for MentraOS Navigation
 * 
 * This framework provides audio guidance for turns in navigation.
 * Designed to integrate with Mapbox GL JS for route planning and turn detection.
 * 
 * Features:
 * - Audio alerts starting 30m before turns
 * - Volume scaling based on proximity to turn
 * - Framework ready for real GPS integration
 * - Turn point management system
 */

import { getDistance, getGreatCircleBearing } from 'geolib';

// Core configuration constants
const TURN_ALERT_START_M = 30;      // Start alerting 30m before turn
const TURN_ALERT_MAX_VOL_M = 2;     // Max volume at 2m from turn
const ALERT_INTERVAL_MS = 1000;     // Alert interval (1 second)
const MIN_VOL = 0.2;                // Minimum volume (20%)
const MAX_VOL = 1.0;                // Maximum volume (100%)

// Type definitions
interface LatLon {
  latitude: number;
  longitude: number;
}

interface TurnPoint {
  id: string;
  location: LatLon;
  bearing: number;           // Direction to turn (degrees)
  turnType: 'left' | 'right' | 'straight' | 'uturn';
  streetName?: string;
  distanceFromStart: number; // Distance from route start
}

interface RouteSegment {
  id: string;
  startPoint: LatLon;
  endPoint: LatLon;
  bearing: number;
  distance: number;
  turnPoint?: TurnPoint;     // Turn point at end of segment
}

interface NavigationState {
  currentLocation: LatLon;
  currentBearing: number;
  currentSpeed: number;      // meters per second
  isNavigating: boolean;
  currentSegmentIndex: number;
  distanceToNextTurn: number;
}

// Utility functions
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function calculateBearing(from: LatLon, to: LatLon): number {
  return getGreatCircleBearing(from, to);
}

function calculateDistance(from: LatLon, to: LatLon): number {
  return getDistance(from, to);
}

/**
 * Main Turn Guidance Framework
 */
export class TurnGuidanceFramework {
  private session: AppSession;
  private route: RouteSegment[] = [];
  private turnPoints: TurnPoint[] = [];
  private navigationState: NavigationState;
  private alertTimer: NodeJS.Timeout | null = null;
  private locationUnsubscribe: (() => void) | null = null;
  private isActive = false;

  constructor(session: AppSession) {
    this.session = session;
    this.navigationState = {
      currentLocation: { latitude: 0, longitude: 0 },
      currentBearing: 0,
      currentSpeed: 0,
      isNavigating: false,
      currentSegmentIndex: 0,
      distanceToNextTurn: Infinity
    };
  }

  /**
   * Initialize the turn guidance system
   */
  initialize(): void {
    console.log('🎧 Initializing Turn Guidance Framework');
    
    // Set up location tracking
    this.locationUnsubscribe = this.session.events.onLocation((location) => {
      this.updateLocation(location);
    });

    this.isActive = true;
  }

  /**
   * Set the route and turn points (will be populated by Mapbox GL JS)
   */
  setRoute(routeSegments: RouteSegment[], turns: TurnPoint[]): void {
    this.route = routeSegments;
    this.turnPoints = turns;
    
    console.log(`📍 Route set with ${routeSegments.length} segments and ${turns.length} turns`);
    
    // Start navigation if we have a route
    if (routeSegments.length > 0) {
      this.startNavigation();
    }
  }

  /**
   * Start navigation mode
   */
  private startNavigation(): void {
    this.navigationState.isNavigating = true;
    this.navigationState.currentSegmentIndex = 0;
    
    // Start the alert loop
    this.startAlertLoop();
    
    console.log('🚀 Navigation started');
  }

  /**
   * Update current location and recalculate navigation state
   */
  private updateLocation(location: LatLon): void {
    this.navigationState.currentLocation = location;
    
    if (!this.navigationState.isNavigating || this.route.length === 0) {
      return;
    }

    // Calculate current bearing and speed (simplified)
    const currentSegment = this.route[this.navigationState.currentSegmentIndex];
    if (currentSegment) {
      this.navigationState.currentBearing = calculateBearing(location, currentSegment.endPoint);
    }

    // Update distance to next turn
    this.updateDistanceToNextTurn();
    
    // Check if we've reached the current segment end
    this.checkSegmentCompletion();
  }

  /**
   * Calculate distance to the next turn point
   */
  private updateDistanceToNextTurn(): void {
    const currentSegment = this.route[this.navigationState.currentSegmentIndex];
    if (!currentSegment || !currentSegment.turnPoint) {
      this.navigationState.distanceToNextTurn = Infinity;
      return;
    }

    const distance = calculateDistance(
      this.navigationState.currentLocation,
      currentSegment.turnPoint.location
    );
    
    this.navigationState.distanceToNextTurn = distance;
  }

  /**
   * Check if we've completed the current route segment
   */
  private checkSegmentCompletion(): void {
    const currentSegment = this.route[this.navigationState.currentSegmentIndex];
    if (!currentSegment) return;

    const distanceToEnd = calculateDistance(
      this.navigationState.currentLocation,
      currentSegment.endPoint
    );

    // If we're within 5m of the segment end, advance to next segment
    if (distanceToEnd <= 5) {
      this.advanceToNextSegment();
    }
  }

  /**
   * Advance to the next route segment
   */
  private advanceToNextSegment(): void {
    this.navigationState.currentSegmentIndex++;
    
    if (this.navigationState.currentSegmentIndex >= this.route.length) {
      // Route completed
      this.completeNavigation();
    } else {
      // Update distance to next turn
      this.updateDistanceToNextTurn();
      console.log(`📍 Advanced to segment ${this.navigationState.currentSegmentIndex + 1}`);
    }
  }

  /**
   * Start the audio alert loop
   */
  private startAlertLoop(): void {
    this.alertTimer = setInterval(() => {
      this.checkAndPlayTurnAlert();
    }, ALERT_INTERVAL_MS);
  }

  /**
   * Check if we should play a turn alert and play it
   */
  private async checkAndPlayTurnAlert(): Promise<void> {
    if (!this.isActive || !this.navigationState.isNavigating) {
      return;
    }

    const distanceToTurn = this.navigationState.distanceToNextTurn;
    
    // Check if we're within alert range
    if (distanceToTurn > TURN_ALERT_START_M) {
      return; // Too far from turn
    }

    // Calculate volume based on distance
    const volume = this.calculateAlertVolume(distanceToTurn);
    
    // Get current turn point for audio cue
    const currentSegment = this.route[this.navigationState.currentSegmentIndex];
    const turnPoint = currentSegment?.turnPoint;
    
    if (!turnPoint) {
      return;
    }

    // Play the appropriate audio alert
    await this.playTurnAlert(turnPoint, volume);
  }

  /**
   * Calculate alert volume based on distance to turn
   */
  private calculateAlertVolume(distanceToTurn: number): number {
    if (distanceToTurn <= TURN_ALERT_MAX_VOL_M) {
      return MAX_VOL; // Maximum volume when very close
    }

    // Linear scaling from MIN_VOL to MAX_VOL
    const ratio = clamp(
      (distanceToTurn - TURN_ALERT_MAX_VOL_M) / (TURN_ALERT_START_M - TURN_ALERT_MAX_VOL_M),
      0,
      1
    );
    
    return MIN_VOL + (1 - ratio) * (MAX_VOL - MIN_VOL);
  }

  /**
   * Play the appropriate turn alert audio
   */
  private async playTurnAlert(turnPoint: TurnPoint, volume: number): Promise<void> {
    try {
      // Determine which audio file to play based on turn type
      let audioUrl: string;
      
      switch (turnPoint.turnType) {
        case 'left':
          audioUrl = 'https://YOUR_CDN/turn-left.mp3';
          break;
        case 'right':
          audioUrl = 'https://YOUR_CDN/turn-right.mp3';
          break;
        case 'straight':
          audioUrl = 'https://YOUR_CDN/continue-straight.mp3';
          break;
        case 'uturn':
          audioUrl = 'https://YOUR_CDN/uturn.mp3';
          break;
        default:
          audioUrl = 'https://YOUR_CDN/turn-alert.mp3';
      }

      await this.session.audio.play(audioUrl, {
        volume,
        category: 'navigation'
      });

      console.log(`🔊 Turn alert: ${turnPoint.turnType} at ${Math.round(volume * 100)}% volume (${Math.round(this.navigationState.distanceToNextTurn)}m away)`);
      
    } catch (error) {
      console.warn('Failed to play turn alert:', error);
    }
  }

  /**
   * Complete navigation (route finished)
   */
  private completeNavigation(): void {
    this.navigationState.isNavigating = false;
    
    // Play arrival sound
    this.playArrivalAlert();
    
    console.log('✅ Navigation completed');
  }

  /**
   * Play arrival alert
   */
  private async playArrivalAlert(): Promise<void> {
    try {
      await this.session.audio.play('https://YOUR_CDN/arrival.mp3', {
        volume: MAX_VOL,
        category: 'navigation'
      });
    } catch (error) {
      console.warn('Failed to play arrival alert:', error);
    }
  }

  /**
   * Get current navigation state (for debugging/monitoring)
   */
  getNavigationState(): NavigationState {
    return { ...this.navigationState };
  }

  /**
   * Pause navigation
   */
  pauseNavigation(): void {
    this.navigationState.isNavigating = false;
    console.log('⏸️ Navigation paused');
  }

  /**
   * Resume navigation
   */
  resumeNavigation(): void {
    if (this.route.length > 0) {
      this.navigationState.isNavigating = true;
      console.log('▶️ Navigation resumed');
    }
  }

  /**
   * Stop navigation and clean up
   */
  stop(): void {
    this.isActive = false;
    this.navigationState.isNavigating = false;
    
    if (this.alertTimer) {
      clearInterval(this.alertTimer);
      this.alertTimer = null;
    }
    
    if (this.locationUnsubscribe) {
      this.locationUnsubscribe();
      this.locationUnsubscribe = null;
    }
    
    console.log('🛑 Turn guidance stopped');
  }
}

// Type definitions for MentraOS SDK integration
interface AppSession {
  events: {
    onLocation: (callback: (location: LatLon) => void) => () => void;
  };
  audio: {
    play: (url: string, options: { volume: number; category: string }) => Promise<void>;
  };
}

// Export types for external use
export type { LatLon, TurnPoint, RouteSegment, NavigationState, AppSession }; 