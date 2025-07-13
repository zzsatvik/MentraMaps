import { AppServer, AppSession } from '@mentra/sdk';

// Load configuration from environment variables
const PACKAGE_NAME = process.env.PACKAGE_NAME || "com.example.myfirstmentraosapp";
const PORT = parseInt(process.env.PORT || "3000");
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY;

if (!MENTRAOS_API_KEY) {
    console.error("MENTRAOS_API_KEY environment variable is required");
    process.exit(1);
}

/**
 * MyMentraOSApp - A simple MentraOS application that gets location once
 * Extends AppServer to handle sessions and user interactions
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

        // Display "Hello, World!" on the glasses
        session.layouts.showTextWall("Hello, World!");

        // Get location once
        try {
            const location = await session.location.getLatestLocation({ accuracy: 'tenMeters' });
            session.logger.info(`Location: ${location.lat}, ${location.lng}`);
            session.layouts.showTextWall(`Location: ${location.lat}, ${location.lng}`);
        } catch (error) {
            console.error("Could not get location:", error);
        }

        // Log when the session is disconnected
        session.events.onDisconnected(() => {
            session.logger.info(`Session ${sessionId} disconnected.`);
        });
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
