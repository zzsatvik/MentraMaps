import { AppServer, AppSession } from '@mentra/sdk';

// Load configuration from environment variables
const PACKAGE_NAME = process.env.PACKAGE_NAME || "com.example.geminibuttontest";
const PORT = parseInt(process.env.PORT || "3001");
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY || "demo_key";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

console.log("=== MentraOS Gemini Button Test ===");
console.log(`Package Name: ${PACKAGE_NAME}`);
console.log(`Port: ${PORT}`);
console.log(`API Key: ${MENTRAOS_API_KEY ? "Set" : "Not set"}`);
console.log(`Gemini API Key: ${GEMINI_API_KEY ? "Set" : "Not set"}`);
console.log("===================================");

if (!MENTRAOS_API_KEY || MENTRAOS_API_KEY === "demo_key") {
   console.error("MENTRAOS_API_KEY environment variable is required");
   console.error("Please set it with: export MENTRAOS_API_KEY=your_actual_api_key");
   console.error("For now, using demo key for testing...");
}

if (!GEMINI_API_KEY) {
   console.error("GEMINI_API_KEY environment variable is required");
   console.error("Please set it with: export GEMINI_API_KEY=your_gemini_api_key");
   console.error("Gemini functionality will be disabled...");
}

// Simple Gemini API client
class GeminiClient {
    private apiKey: string;
    private baseUrl: string = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async generateResponse(prompt: string): Promise<string> {
        try {
            console.log(`🤖 Sending prompt to Gemini: "${prompt}"`);
            
            const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Gemini API error: ${response.status} - ${errorText}`);
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const generatedText = data.candidates[0].content.parts[0].text;
                console.log(`✅ Gemini response: "${generatedText}"`);
                return generatedText;
            } else {
                throw new Error('No response generated from Gemini');
            }
        } catch (error) {
            console.error("❌ Gemini API error:", error);
            return "Sorry, I couldn't generate a response right now.";
        }
    }
}

/**
 * Gemini Button Test App - Listens for button presses and generates responses
 */
class GeminiButtonTestApp extends AppServer {
   protected async onSession(session: AppSession, sessionId: string, userId: string): Promise<void> {
       console.log(`🎉 NEW SESSION CONNECTED!`);
       console.log(`Session ID: ${sessionId}`);
       console.log(`User ID: ${userId}`);
       session.logger.info(`New session: ${sessionId} for user ${userId}`);

       // Initialize Gemini client if API key is available
       let geminiClient: GeminiClient | null = null;
       if (GEMINI_API_KEY) {
           geminiClient = new GeminiClient(GEMINI_API_KEY);
           console.log("🤖 Gemini client initialized");
       } else {
           console.log("⚠️ Gemini client not initialized - no API key");
       }

       // Custom user prompt - change this to whatever you want to ask!
       const userPrompt = "Where is the nearest coffee shop?";

       // Track if we've already processed a request
       let hasProcessed = false;

       // Navigation-focused prompt template
       const createNavigationPrompt = (userLocation: { latitude: number; longitude: number }) => {
           return `You are an assistant but also a primary navigation tool. 

If asked with something like "where the nearest ___ is" or something along those lines, answer with an address.

If asked with "how you can get to some place" or something along those lines, answer with a placeholder "bob".

If needed, the user's exact location in coordinates is: ${userLocation.latitude}, ${userLocation.longitude}

Please respond naturally and helpfully to any navigation-related questions.

Here is the user's prompt: ${userPrompt}`;
       };

       // Listen for button presses
       session.events.onButtonPress(async (data) => {
           console.log(`🔘 BUTTON PRESSED!`);
           console.log(`Button ID: ${data.buttonId}`);
           console.log(`Full button data:`, JSON.stringify(data, null, 2));
           console.log(`Timestamp: ${new Date().toISOString()}`);

           // Only process the first button press, ignore all others
           if (hasProcessed) {
               console.log("⏳ Already processed a request, ignoring this button press");
               return;
           }

           if (!geminiClient) {
               console.log("❌ Gemini not available - no API key");
               return;
           }

           hasProcessed = true;

           try {
               // Try to get current location with high accuracy
               console.log("📍 Getting current location...");
               let currentLocation;
               
               try {
                   const location = await session.location.getLatestLocation({ accuracy: 'high' });
                   currentLocation = {
                       latitude: location.lat,
                       longitude: location.lng
                   };
                   console.log(` Location obtained: ${location.lat}, ${location.lng}`);
               } catch (locationError) {
                   console.log("⚠️ Could not get precise location, using fallback coordinates");
                   // Fallback to a default location (you can change this)
                   currentLocation = {
                       latitude: 37.7749,  // San Francisco coordinates
                       longitude: -122.4194
                   };
                   console.log(` Using fallback location: ${currentLocation.latitude}, ${currentLocation.longitude}`);
               }

               // Create prompt with location
               const navigationPrompt = createNavigationPrompt(currentLocation);
               console.log(`📝 Using navigation prompt with location: ${currentLocation.latitude}, ${currentLocation.longitude}`);

               // Generate response from Gemini
               const response = await geminiClient.generateResponse(navigationPrompt);
               
               console.log(`🎯 FINAL RESULT:`);
               console.log(`Location: ${currentLocation.latitude}, ${currentLocation.longitude}`);
               console.log(`Response: "${response}"`);
               console.log(`---`);
               
           } catch (error) {
               console.error("❌ Error:", error);
               // Reset the flag if there's an error so user can try again
               hasProcessed = false;
           }
       });

       // Listen for session events
       session.events.onConnected(() => {
           console.log(`🔗 Session ${sessionId} connected`);
       });

       session.events.onDisconnected(() => {
           console.log(`🔌 Session ${sessionId} disconnected`);
       });

       // Log available buttons (if any)
       console.log("📋 Available buttons to press:");
       console.log("- Any button on your Mentra glasses");
       console.log("- Each press will generate a different response");
       console.log("🚀 Ready to receive button presses!");
   }
}

// Create and start the app server
const server = new GeminiButtonTestApp({
   packageName: PACKAGE_NAME,
   apiKey: MENTRAOS_API_KEY,
   port: PORT
});

console.log("🚀 Starting Gemini Button Test server...");
server.start().then(() => {
   console.log(`✅ Server started successfully on port ${PORT}`);
   console.log("📱 Waiting for device connections...");
   console.log("🔘 Press any button on your Mentra glasses to test Gemini!");
   if (GEMINI_API_KEY) {
       console.log("🤖 Gemini API is enabled");
   } else {
       console.log("⚠️ Gemini API is disabled - set GEMINI_API_KEY to enable");
   }
}).catch(err => {
   console.error("❌ Failed to start server:", err);
}); 