import { AppServer, AppSession } from '@mentra/sdk';
import { LiveNavigation } from './navigation';

// Load configuration from environment variables
const PACKAGE_NAME = process.env.PACKAGE_NAME || "com.example.myfirstmentraosapp";
const PORT = parseInt(process.env.PORT || "3000");
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY || "demo_key";

console.log("=== MentraOS Live Navigation App ===");
console.log(`Package Name: ${PACKAGE_NAME}`);
console.log(`Port: ${PORT}`);
console.log(`API Key: ${MENTRAOS_API_KEY ? "Set" : "Not set"}`);
console.log("====================================");

if (!MENTRAOS_API_KEY || MENTRAOS_API_KEY === "demo_key") {
   console.error("MENTRAOS_API_KEY environment variable is required");
   console.error("Please set it with: export MENTRAOS_API_KEY=your_actual_api_key");
   console.error("For now, using demo key for testing...");
}

/**
 * Live Navigation App - Provides turn-by-turn navigation using real-time location
 */
class LiveNavigationApp extends AppServer {
   protected async onSession(session: AppSession, sessionId: string, userId: string): Promise<void> {
       console.log(`🎉 NEW NAVIGATION SESSION CONNECTED!`);
       console.log(`Session ID: ${sessionId}`);
       console.log(`User ID: ${userId}`);
       session.logger.info(`New navigation session: ${sessionId} for user ${userId}`);

       // Initialize navigation system
       const navigation = new LiveNavigation();
       
       // Wait for route data to load
       session.layouts.showTextWall("🗺️ Loading route data...");
       
       const routeSummary = await navigation.getRouteSummary();
       
       if (routeSummary.totalSteps === 0) {
           session.layouts.showTextWall("❌ No route data available");
           console.error("No route steps found");
           return;
       }

       console.log(`🗺️ Route loaded: ${routeSummary.totalSteps} steps, ${routeSummary.totalDistance}`);
       console.log(`📍 From: ${routeSummary.startAddress}`);
       console.log(`🎯 To: ${routeSummary.endAddress}`);
       
       session.layouts.showTextWall(`🗺️ Live Navigation Started!\n\n${routeSummary.totalSteps} steps\n${routeSummary.totalDistance}`);

       // Navigation state
       let currentLocation: { lat: number; lng: number } | null = null;
       let isNavigating = false;
       let navigationInterval: NodeJS.Timeout | null = null;

       // Subscribe to real-time location stream
       console.log("📍 Subscribing to real-time location stream...");

       const stopLocationUpdates = session.location.subscribeToStream(
           { accuracy: 'realtime' },
           (data) => {
               currentLocation = { lat: data.lat, lng: data.lng };
               if (!isNavigating) {
                   isNavigating = true;
                   navigation.startNavigation();
                   console.log("🚶 Navigation started - tracking user location");
               }
           }
       );

       console.log("✅ Location stream subscription created");

       // Navigation update interval - runs every second
       navigationInterval = setInterval(async () => {
           try {
               if (!currentLocation) {
                   // Fallback: get latest location if stream hasn't provided data yet
                   const location = await session.location.getLatestLocation({ accuracy: 'realtime' });
                   currentLocation = { lat: location.lat, lng: location.lng };
                   console.log("🔄 Got initial location via fallback");
                   
                   if (!isNavigating) {
                       isNavigating = true;
                       navigation.startNavigation();
                   }
               }

               if (currentLocation) {
                   // Update navigation based on current location
                   const update = navigation.updateNavigation(currentLocation);
                   const status = update.status;

                   if (status.isActive) {
                       console.log("=== NAVIGATION UPDATE ===");
                       console.log(`Progress: ${status.progress}`);
                       console.log(`Instruction: ${status.stepInstructions}`);
                       console.log(`Distance to step end: ${status.distanceInFeet.toFixed(0)} ft`);
                       console.log(`Current location: ${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`);
                       
                       // Add turn information to console output
                       if (status.isTurnStep) {
                           console.log(`🔄 TURN STEP: ${status.turnDirection.toUpperCase()} turn ahead`);
                       }
                       
                       console.log("=========================");

                       // Display basic navigation info on glasses (no turn alerts)
                       const displayText = `${status.progress}\n\n${status.stepInstructions}\n\nDistance: ${status.distanceInFeet.toFixed(0)} ft`;
                       session.layouts.showTextWall(displayText);
                   }

                   // Handle step completion
                   if (update.stepCompleted) {
                       if (update.destinationReached) {
                           session.layouts.showTextWall("🎉 You have arrived at your destination!");
                           console.log("🎉 NAVIGATION COMPLETE - Destination reached!");
                           if (navigationInterval) {
                               clearInterval(navigationInterval);
                               navigationInterval = null;
                           }
                       } else {
                           session.layouts.showTextWall(`✅ Step completed!\n\nNext: ${update.nextInstructions}`);
                           console.log(`➡️ Step completed, moving to next step`);
                       }
                   }
               }
           } catch (error) {
               console.error("❌ Error in navigation update:", error);
               session.layouts.showTextWall("❌ Navigation error occurred");
           }
       }, 1000); // Update every second

       // Session cleanup
       session.events.onDisconnected(() => {
           console.log(`🔌 Navigation session ${sessionId} disconnected.`);
           session.logger.info(`Navigation session ${sessionId} disconnected.`);
           stopLocationUpdates();
           if (navigationInterval) {
               clearInterval(navigationInterval);
           }
           navigation.stopNavigation();
       });
   }
}

// Create and start the navigation app server
const server = new LiveNavigationApp({
   packageName: PACKAGE_NAME,
   apiKey: MENTRAOS_API_KEY,
   port: PORT
});

console.log("🚀 Starting Live Navigation server...");
server.start().then(() => {
   console.log(`✅ Navigation server started successfully on port ${PORT}`);
   console.log("📱 Waiting for device connections...");
   console.log("🗺️ Turn-by-turn navigation will begin when a session connects");
}).catch(err => {
   console.error("❌ Failed to start navigation server:", err);
});

