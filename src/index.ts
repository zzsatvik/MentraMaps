import { AppServer, AppSession } from '@mentra/sdk';

// Load configuration from environment variables
const PACKAGE_NAME = process.env.PACKAGE_NAME || "com.example.myfirstmentraosapp";
const PORT = parseInt(process.env.PORT || "3000");
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY;

if (!MENTRAOS_API_KEY) {
    console.error("MENTRAOS_API_KEY environment variable is required");
    process.exit(1);
}

// Location interface for type safety
interface LocationData {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: number;
    heading?: number;
    speed?: number;
}

// Location subscription interface
interface LocationSubscription {
    onLocationUpdate: (callback: (location: LocationData) => void) => void;
    onError: (callback: (error: Error) => void) => void;
    onPermissionChange: (callback: (hasPermission: boolean) => void) => void;
    stop: () => void;
}

/**
 * MyMentraOSApp - A MentraOS application that provides live location streaming
 * Extends AppServer to handle sessions and user interactions with location tracking
 */
class MyMentraOSApp extends AppServer {
    /**
     * Handle new session connections
     * @param session - The app session instance
     * @param sessionId - Unique identifier for this session
     * @param userId - The user ID for this session
     */
    protected async onSession(session: AppSession, sessionId: string, userId: string): Promise<void> {
        session.logger.info(`New session: ${sessionId} for user ${userId}`);

        // Display welcome message on the glasses
        session.layouts.showTextWall("Mentra Maps - Location Tracking Active");

        // Subscribe to live location streaming
        await this.subscribeToLocationStreaming(session, sessionId);

        // Log when the session is disconnected
        session.events.onDisconnected(() => {
            session.logger.info(`Session ${sessionId} disconnected.`);
        });
    }

    /**
     * Subscribe to live location streaming from Mentra Location service
     * @param session - The app session instance
     * @param sessionId - Unique identifier for this session
     */
    private async subscribeToLocationStreaming(session: AppSession, sessionId: string): Promise<void> {
        try {
            session.logger.info(`Starting location streaming for session: ${sessionId}`);

            // Try to use Mentra Location API if available
            let locationSubscription: LocationSubscription | null = null;

            // Check if Mentra Location API is available with proper type checking
            if (session.location && this.hasLocationMethod(session.location, 'getCurrentLocation')) {
                // Use Mentra Location API with getCurrentLocation
                locationSubscription = await this.createMentraLocationSubscription(session);
            } else if (session.location && this.hasLocationMethod(session.location, 'watchPosition')) {
                // Use alternative Mentra Location API with watchPosition
                locationSubscription = await this.createMentraWatchLocationSubscription(session);
            } else {
                // Fallback to mock location service for development
                session.logger.warn(`Mentra Location API not available, using mock location service for session: ${sessionId}`);
                locationSubscription = this.createMockLocationSubscription();
            }

            if (locationSubscription) {
                // Handle location updates
                locationSubscription.onLocationUpdate((location: LocationData) => {
                    this.handleLocationUpdate(session, sessionId, location);
                });

                // Handle location errors
                locationSubscription.onError((error: Error) => {
                    session.logger.error(`Location error for session ${sessionId}:`, error.message);
                    session.layouts.showTextWall("Location Error - Check GPS");
                });

                // Handle location permission changes
                locationSubscription.onPermissionChange((hasPermission: boolean) => {
                    if (hasPermission) {
                        session.logger.info(`Location permission granted for session: ${sessionId}`);
                        session.layouts.showTextWall("Location Permission Granted");
                    } else {
                        session.logger.warn(`Location permission denied for session: ${sessionId}`);
                        session.layouts.showTextWall("Location Permission Required");
                    }
                });

                // Store subscription for cleanup
                session.events.onDisconnected(() => {
                    locationSubscription?.stop();
                });

                session.logger.info(`Location streaming started successfully for session: ${sessionId}`);
            } else {
                throw new Error("Failed to create location subscription");
            }

        } catch (error) {
            session.logger.error(`Failed to start location streaming for session ${sessionId}:`, error);
            session.layouts.showTextWall("Failed to Start Location Tracking");
        }
    }

    /**
     * Check if a location method exists on the location object
     * @param location - The location object
     * @param methodName - The method name to check
     * @returns True if the method exists
     */
    private hasLocationMethod(location: any, methodName: string): boolean {
        return location && typeof location[methodName] === 'function';
    }

    /**
     * Create location subscription using Mentra Location API (getCurrentLocation)
     * @param session - The app session instance
     * @returns Location subscription
     */
    private async createMentraLocationSubscription(session: AppSession): Promise<LocationSubscription> {
        let isRunning = true;
        const callbacks = {
            onLocationUpdate: [] as ((location: LocationData) => void)[],
            onError: [] as ((error: Error) => void)[],
            onPermissionChange: [] as ((hasPermission: boolean) => void)[]
        };

        // Start polling for location updates
        const pollLocation = async () => {
            while (isRunning) {
                try {
                    // Use type assertion to access the method
                    const location = await (session.location as any).getCurrentLocation({
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 5000
                    });

                    callbacks.onLocationUpdate.forEach(callback => callback(location));
                } catch (error) {
                    callbacks.onError.forEach(callback => callback(error as Error));
                }

                // Wait 5 seconds before next poll
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        };

        pollLocation();

        return {
            onLocationUpdate: (callback) => callbacks.onLocationUpdate.push(callback),
            onError: (callback) => callbacks.onError.push(callback),
            onPermissionChange: (callback) => callbacks.onPermissionChange.push(callback),
            stop: () => { isRunning = false; }
        };
    }

    /**
     * Create location subscription using Mentra Location API (watchPosition)
     * @param session - The app session instance
     * @returns Location subscription
     */
    private async createMentraWatchLocationSubscription(session: AppSession): Promise<LocationSubscription> {
        const callbacks = {
            onLocationUpdate: [] as ((location: LocationData) => void)[],
            onError: [] as ((error: Error) => void)[],
            onPermissionChange: [] as ((hasPermission: boolean) => void)[]
        };

        const watchId = await (session.location as any).watchPosition(
            (location: LocationData) => {
                callbacks.onLocationUpdate.forEach(callback => callback(location));
            },
            (error: Error) => {
                callbacks.onError.forEach(callback => callback(error));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 5000
            }
        );

        return {
            onLocationUpdate: (callback) => callbacks.onLocationUpdate.push(callback),
            onError: (callback) => callbacks.onError.push(callback),
            onPermissionChange: (callback) => callbacks.onPermissionChange.push(callback),
            stop: () => {
                if (this.hasLocationMethod(session.location, 'clearWatch')) {
                    (session.location as any).clearWatch(watchId);
                }
            }
        };
    }

    /**
     * Create mock location subscription for development/testing
     * @returns Mock location subscription
     */
    private createMockLocationSubscription(): LocationSubscription {
        let isRunning = true;
        const callbacks = {
            onLocationUpdate: [] as ((location: LocationData) => void)[],
            onError: [] as ((error: Error) => void)[],
            onPermissionChange: [] as ((hasPermission: boolean) => void)[]
        };

        // Simulate location updates every 3 seconds
        const mockLocation = () => {
            while (isRunning) {
                const mockLocationData: LocationData = {
                    latitude: 37.7749 + (Math.random() - 0.5) * 0.01, // San Francisco area
                    longitude: -122.4194 + (Math.random() - 0.5) * 0.01,
                    accuracy: 5 + Math.random() * 10,
                    timestamp: Date.now(),
                    heading: Math.random() * 360,
                    speed: Math.random() * 5
                };

                callbacks.onLocationUpdate.forEach(callback => callback(mockLocationData));
                
                setTimeout(() => {}, 3000);
            }
        };

        // Simulate permission granted
        setTimeout(() => {
            callbacks.onPermissionChange.forEach(callback => callback(true));
        }, 1000);

        mockLocation();

        return {
            onLocationUpdate: (callback) => callbacks.onLocationUpdate.push(callback),
            onError: (callback) => callbacks.onError.push(callback),
            onPermissionChange: (callback) => callbacks.onPermissionChange.push(callback),
            stop: () => { isRunning = false; }
        };
    }

    /**
     * Handle incoming location updates
     * @param session - The app session instance
     * @param sessionId - Unique identifier for this session
     * @param location - The location data received
     */
    private handleLocationUpdate(session: AppSession, sessionId: string, location: LocationData): void {
        // Log location update
        session.logger.info(`Location update for session ${sessionId}:`, {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            timestamp: new Date(location.timestamp).toISOString()
        });

        // Display location information on glasses
        const locationText = `Location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
        session.layouts.showTextWall(locationText);

        // You can add additional logic here for:
        // - Route calculation
        // - Turn detection
        // - Audio feedback (beeping)
        // - Navigation instructions

        // Example: Calculate distance to a target location
        // this.calculateDistanceToTarget(location, targetLocation);
    }

    /**
     * Calculate distance between two coordinates using Haversine formula
     * @param lat1 - First latitude
     * @param lon1 - First longitude
     * @param lat2 - Second latitude
     * @param lon2 - Second longitude
     * @returns Distance in meters
     */
    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }
}

// Create and start the app server
const server = new MyMentraOSApp({
    packageName: PACKAGE_NAME,
    apiKey: MENTRAOS_API_KEY,
    port: PORT
});

server.start().catch(err => {
    console.error("Failed to start server:", err);
});