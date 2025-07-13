// Google Directions API integration
interface Location {
    lat: number;
    lng: number;
}

interface RouteStep {
    distance: {
        text: string;
        value: number;
    };
    duration: {
        text: string;
        value: number;
    };
    end_location: Location;
    start_location: Location;
    html_instructions: string;
    maneuver?: string;
    polyline: {
        points: string;
    };
    travel_mode: string;
}

interface RouteData {
    routes: Array<{
        legs: Array<{
            steps: RouteStep[];
            distance: {
                text: string;
                value: number;
            };
            duration: {
                text: string;
                value: number;
            };
            start_address: string;
            end_address: string;
        }>;
    }>;
    status: string;
}

export class GoogleDirectionsAPI {
    private apiKey: string;
    private baseUrl: string = 'https://maps.googleapis.com/maps/api/directions/json';

    // Hardcoded origin and destination coordinates
    private origin: Location = {
        lat: 37.573042,
        lng: -122.026170
    };

    private destination: Location = {
        lat: 37.573042,
        lng: -122.026170
    };

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.GOOGLE_MAPS_API_KEY || '';
        if (!this.apiKey) {
            console.warn("⚠️ Google Maps API key not provided. Using fallback route data.");
        }
    }

    // Build the API URL with parameters
    private buildApiUrl(): string {
        const params = new URLSearchParams({
            origin: `${this.origin.lat},${this.origin.lng}`,
            destination: `${this.destination.lat},${this.destination.lng}`,
            mode: 'walking',
            key: this.apiKey
        });

        return `${this.baseUrl}?${params.toString()}`;
    }

    // Fetch route data from Google Directions API
    public async fetchRouteData(): Promise<RouteStep[]> {
        if (!this.apiKey) {
            console.log("📄 Using fallback route data (no API key provided)");
            return this.getFallbackRouteData();
        }

        try {
            console.log("🗺️ Fetching route from Google Directions API...");
            console.log(`📍 Origin: ${this.origin.lat}, ${this.origin.lng}`);
            console.log(`🎯 Destination: ${this.destination.lat}, ${this.destination.lng}`);

            const response = await fetch(this.buildApiUrl());
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: RouteData = await response.json();

            if (data.status !== 'OK') {
                throw new Error(`Google Directions API error: ${data.status}`);
            }

            if (data.routes.length === 0) {
                throw new Error('No routes found');
            }

            const route = data.routes[0];
            const leg = route.legs[0];
            const steps = leg.steps;

            console.log(`✅ Route fetched successfully!`);
            console.log(`📊 Total distance: ${leg.distance.text}`);
            console.log(`⏱️ Total duration: ${leg.duration.text}`);
            console.log(`📍 From: ${leg.start_address}`);
            console.log(`🎯 To: ${leg.end_address}`);
            console.log(`🚶 Steps: ${steps.length}`);

            return steps;

        } catch (error) {
            console.error("❌ Error fetching route from Google Directions API:", error);
            console.log("📄 Falling back to static route data...");
            return this.getFallbackRouteData();
        }
    }

    // Fallback route data (same as output.json)
    private getFallbackRouteData(): RouteStep[] {
        return [
            {
                distance: {
                    text: "266 ft",
                    value: 81
                },
                duration: {
                    text: "1 min",
                    value: 65
                },
                end_location: {
                    lat: 37.5753831,
                    lng: -122.0251384
                },
                start_location: {
                    lat: 37.5757072,
                    lng: -122.0259204
                },
                html_instructions: "Head <b>east</b> on <b>Cade Dr</b> toward <b>Wyndham Dr</b>",
                polyline: {
                    points: "e_jdF~dxgVAG?C?E?C@G@CVo@f@iA"
                },
                travel_mode: "WALKING"
            },
            {
                distance: {
                    text: "0.2 mi",
                    value: 286
                },
                duration: {
                    text: "4 mins",
                    value: 228
                },
                end_location: {
                    lat: 37.5732824,
                    lng: -122.0270207
                },
                start_location: {
                    lat: 37.5753831,
                    lng: -122.0251384
                },
                html_instructions: "Turn <b>right</b> onto <b>Wyndham Dr</b>",
                maneuver: "turn-right",
                polyline: {
                    points: "c}idFb`xgVNL|@v@dBxAJJ`BtADFzBlB"
                },
                travel_mode: "WALKING"
            },
            {
                distance: {
                    text: "230 ft",
                    value: 70
                },
                duration: {
                    text: "1 min",
                    value: 59
                },
                end_location: {
                    lat: 37.5728826,
                    lng: -122.0263133
                },
                start_location: {
                    lat: 37.5732824,
                    lng: -122.0270207
                },
                html_instructions: "Turn <b>left</b> onto <b>Erving Ct</b><div style=\"font-size:0.9em\">Destination will be on the left</div>",
                maneuver: "turn-left",
                polyline: {
                    points: "_pidFzkxgVJSbAyB"
                },
                travel_mode: "WALKING"
            }
        ];
    }

    // Get route summary information
    public async getRouteSummary(): Promise<{
        totalSteps: number;
        totalDistance: string;
        totalDuration: string;
        startAddress: string;
        endAddress: string;
        origin: Location;
        destination: Location;
    }> {
        if (!this.apiKey) {
            const fallbackSteps = this.getFallbackRouteData();
            const totalDistance = fallbackSteps.reduce((sum, step) => sum + step.distance.value, 0);
            const totalDuration = fallbackSteps.reduce((sum, step) => sum + step.duration.value, 0);
            
            return {
                totalSteps: fallbackSteps.length,
                totalDistance: `${Math.round(totalDistance * 3.28084)} ft`,
                totalDuration: `${Math.round(totalDuration / 60)} min`,
                startAddress: "3263 Cade Dr, Fremont, CA 94536, USA",
                endAddress: "35238 Erving Ct, Fremont, CA 94536, USA",
                origin: this.origin,
                destination: this.destination
            };
        }

        try {
            const response = await fetch(this.buildApiUrl());
            const data: RouteData = await response.json();
            
            if (data.status === 'OK' && data.routes.length > 0) {
                const leg = data.routes[0].legs[0];
                return {
                    totalSteps: leg.steps.length,
                    totalDistance: leg.distance.text,
                    totalDuration: leg.duration.text,
                    startAddress: leg.start_address,
                    endAddress: leg.end_address,
                    origin: this.origin,
                    destination: this.destination
                };
            }
        } catch (error) {
            console.error("Error getting route summary:", error);
        }

        // Fallback
        return this.getRouteSummary();
    }

    // Update origin and destination (if needed for future use)
    public updateRoute(origin: Location, destination: Location): void {
        this.origin = origin;
        this.destination = destination;
        console.log(`🗺️ Route updated:`);
        console.log(`📍 New origin: ${origin.lat}, ${origin.lng}`);
        console.log(`🎯 New destination: ${destination.lat}, ${destination.lng}`);
    }
} 