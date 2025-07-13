interface DirectionsRequest {
  origin: string;
  destination: string;
  key: string;
  mode?: 'driving' | 'walking' | 'bicycling' | 'transit';
  alternatives?: boolean;
}

interface DirectionsResponse {
  routes: Route[];
  status: string;
  error_message?: string;
}

interface Route {
  bounds: Bounds;
  copyrights: string;
  legs: Leg[];
  overview_polyline: Polyline;
  summary: string;
  warnings: string[];
  waypoint_order: number[];
}

interface Bounds {
  northeast: LatLng;
  southwest: LatLng;
}

interface LatLng {
  lat: number;
  lng: number;
}

interface Leg {
  distance: TextValue;
  duration: TextValue;
  duration_in_traffic?: TextValue;
  end_address: string;
  end_location: LatLng;
  start_address: string;
  start_location: LatLng;
  steps: Step[];
  traffic_speed_entry: any[];
  via_waypoint: any[];
}

interface TextValue {
  text: string;
  value: number;
}

interface Step {
  distance: TextValue;
  duration: TextValue;
  end_location: LatLng;
  html_instructions: string;
  polyline: Polyline;
  start_location: LatLng;
  travel_mode: string;
  maneuver?: string;
}

interface Polyline {
  points: string;
}

class GoogleMapsDirections {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api/directions/json';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getDirections(origin: string, destination: string, mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving'): Promise<DirectionsResponse> {
    const params = new URLSearchParams({
      origin,
      destination,
      key: this.apiKey,
      mode,
      alternatives: 'true'
    });

    const url = `${this.baseUrl}?${params.toString()}`;
    
    try {
      const response = await fetch(url);
      const data: DirectionsResponse = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Directions API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching directions:', error);
      throw error;
    }
  }

  logDirections(directions: DirectionsResponse): void {
    console.log('\n=== GOOGLE MAPS DIRECTIONS ===\n');
    
    if (directions.routes.length === 0) {
      console.log('No routes found');
      return;
    }

    directions.routes.forEach((route, routeIndex) => {
      console.log(`\n--- ROUTE ${routeIndex + 1} ---`);
      console.log(`Summary: ${route.summary}`);
      console.log(`Copyrights: ${route.copyrights}`);
      
      if (route.warnings.length > 0) {
        console.log(`Warnings: ${route.warnings.join(', ')}`);
      }

      route.legs.forEach((leg, legIndex) => {
        console.log(`\n--- LEG ${legIndex + 1} ---`);
        console.log(`From: ${leg.start_address}`);
        console.log(`To: ${leg.end_address}`);
        console.log(`Distance: ${leg.distance.text} (${leg.distance.value} meters)`);
        console.log(`Duration: ${leg.duration.text} (${leg.duration.value} seconds)`);
        
        if (leg.duration_in_traffic) {
          console.log(`Duration in traffic: ${leg.duration_in_traffic.text} (${leg.duration_in_traffic.value} seconds)`);
        }

        console.log('\n--- COORDINATES ---');
        console.log(`Start: ${leg.start_location.lat}, ${leg.start_location.lng}`);
        console.log(`End: ${leg.end_location.lat}, ${leg.end_location.lng}`);
        console.log(`Bounds: NE(${route.bounds.northeast.lat}, ${route.bounds.northeast.lng}) SW(${route.bounds.southwest.lat}, ${route.bounds.southwest.lng})`);

        console.log('\n--- STEP-BY-STEP DIRECTIONS ---');
        leg.steps.forEach((step, stepIndex) => {
          console.log(`\n${stepIndex + 1}. ${step.html_instructions.replace(/<[^>]*>/g, '')}`);
          console.log(`   Distance: ${step.distance.text}`);
          console.log(`   Duration: ${step.duration.text}`);
          console.log(`   Start: ${step.start_location.lat}, ${step.start_location.lng}`);
          console.log(`   End: ${step.end_location.lat}, ${step.end_location.lng}`);
          console.log(`   Travel mode: ${step.travel_mode}`);
        });
      });
    });

    console.log('\n=== END DIRECTIONS ===\n');
  }
}

// Example usage function
async function getDirectionsExample(): Promise<void> {
      // Hardcoded Google Maps API key
    const API_KEY = 'AIzaSyC0IKrgwTx10_iuHWRMZnTk-MvrfqIBjV0';
  
  // TODO: Replace with your actual coordinates or addresses
  const ORIGIN = '40.7128,-74.0060'; // Example: New York City coordinates
  const DESTINATION = '34.0522,-118.2437'; // Example: Los Angeles coordinates
  
  // Alternative: Use addresses instead of coordinates
  // const ORIGIN = 'New York, NY';
  // const DESTINATION = 'Los Angeles, CA';

  const directionsService = new GoogleMapsDirections(API_KEY);
  
  try {
    console.log('Fetching directions...');
    const directions = await directionsService.getDirections(ORIGIN, DESTINATION, 'driving');
    directionsService.logDirections(directions);
  } catch (error) {
    console.error('Failed to get directions:', error);
  }
}

// Export for use in other files
export { GoogleMapsDirections, getDirectionsExample };

// Run the example if this file is executed directly
if (require.main === module) {
  getDirectionsExample();
} 