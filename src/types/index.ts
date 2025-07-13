/**
 * Type definitions for Google Maps API responses and application data
 */

export interface GoogleMapsDirectionsResponse {
  status: string;
  routes: GoogleMapsRoute[];
}

export interface GoogleMapsRoute {
  legs: GoogleMapsLeg[];
  overview_polyline: {
    points: string;
  };
}

export interface GoogleMapsLeg {
  steps: GoogleMapsStep[];
  distance: {
    text: string;
    value: number;
  };
  duration: {
    text: string;
    value: number;
  };
}

export interface GoogleMapsStep {
  html_instructions: string;
  polyline: {
    points: string;
  };
  distance: {
    text: string;
    value: number;
  };
  duration: {
    text: string;
    value: number;
  };
  maneuver?: string;
}

export interface NavigationStep {
  direction: string;
  distance: number; // meters
  bearing: number; // degrees
  instruction: string;
}

export interface DirectionsResponse {
  instructions: string[];
  coordinates: [number, number][];
  navigationSteps: NavigationStep[];
  totalDistance: string;
  totalDuration: string;
}

export interface DirectionsRequest {
  origin: string;
  destination: string;
} 