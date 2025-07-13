import { AppServer, AppSession, createTranscriptionStream } from '@mentra/sdk';
import { GoogleDirectionsAPI } from './google-directions';

// Load configuration from environment variables
const PACKAGE_NAME = process.env.PACKAGE_NAME || "com.example.geminibuttontest";
const PORT = parseInt(process.env.PORT || "3001");
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY || "demo_key";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

console.log("=== MentraOS Gemini Button Test ===");
console.log(`Package Name: ${PACKAGE_NAME}`);
console.log(`Port: ${PORT}`);
console.log(`API Key: ${MENTRAOS_API_KEY ? "Set" : "Not set"}`);
console.log(`Gemini API Key: ${GEMINI_API_KEY ? "Set" : "Not set"}`);
console.log(`ElevenLabs Voice ID: ${ELEVENLABS_VOICE_ID ? "Set" : "Not set"}`);
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

if (!ELEVENLABS_VOICE_ID) {
    console.warn("⚠️ ELEVENLABS_VOICE_ID not set - TTS will be disabled");
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
       
       const googleDirections = new GoogleDirectionsAPI();

       // Transcription state
       let isListening = false;
       createTranscriptionStream('en-US');
       console.log("🎤 Created English transcription stream");

       // More flexible prompt for Gemini
       const createPrompt = (context: string) => {
           return `You are a helpful assistant. Please respond naturally to the user's request based on the following context.
           
Context:
${context}
`;
       };
       
       // Listen for final transcription data
       session.events.onTranscription(async (data) => {
           if (isListening && data.isFinal) {
               isListening = false; // Stop listening once we have a final result
               const userPrompt = data.text;
               console.log(`✅ FINAL TRANSCRIPTION: "${userPrompt}"`);

               if (!geminiClient) {
                   console.log("❌ Gemini not available - no API key");
                   session.layouts.showTextWall("❌ Gemini not available");
                   return;
               }

               try {
                   // Get current location with high accuracy
                   session.layouts.showTextWall("🤔 Thinking...");
                   console.log("📍 Getting current location...");
                   let currentLocation;
                   
                   try {
                       const location = await session.location.getLatestLocation({ accuracy: 'high' });
                       currentLocation = {
                           latitude: location.lat,
                           longitude: location.lng
                       };
                       console.log(`📍 Location obtained: ${location.lat}, ${location.lng}`);
                   } catch (locationError) {
                       console.log("⚠️ Could not get precise location, using fallback coordinates");
                       currentLocation = {
                           latitude: 37.7749,  // San Francisco coordinates
                           longitude: -122.4194
                       };
                       console.log(`📍 Using fallback location: ${currentLocation.latitude}, ${currentLocation.longitude}`);
                   }

                   let response: string;

                   // Check if the user is asking for the nearest place
                   const nearestMatch = userPrompt.toLowerCase().match(/where is the nearest (.+)/);
                   if (nearestMatch && nearestMatch[1]) {
                       const placeQuery = nearestMatch[1].trim();
                       console.log(`🔎 User is asking for the nearest: "${placeQuery}"`);
                       
                       const nearestPlace = await googleDirections.findNearest(placeQuery, {
                           lat: currentLocation.latitude,
                           lng: currentLocation.longitude
                       });

                       if (nearestPlace) {
                           const context = `The user wants to know where the nearest ${placeQuery} is. I found a place called "${nearestPlace.name}" at ${nearestPlace.vicinity}. Please tell them this in a friendly way.`;
                           const prompt = createPrompt(context);
                           response = await geminiClient.generateResponse(prompt);
                       } else {
                           const context = `The user asked for the nearest ${placeQuery}, but I couldn't find anything nearby. Please apologize and let them know.`;
                           const prompt = createPrompt(context);
                           response = await geminiClient.generateResponse(prompt);
                       }
                   } else {
                       // If not a "nearest" query, use the general prompt
                       const prompt = createPrompt(`The user's location is ${currentLocation.latitude}, ${currentLocation.longitude}. The user said: "${userPrompt}"`);
                       response = await geminiClient.generateResponse(prompt);
                   }
                   
                   session.layouts.showTextWall(response);

                   // Speak the response using ElevenLabs
                   if (ELEVENLABS_VOICE_ID) {
                       console.log(`️ Speaking response with ElevenLabs...`);
                       await session.audio.speak(response, {
                           voice_id: ELEVENLABS_VOICE_ID
                       });
                       console.log(`✅ Response spoken.`);
                   } else {
                       console.log("🔇 TTS disabled - no voice ID provided");
                   }

                   console.log(`🎯 FINAL RESULT:`);
                   console.log(`Location: ${currentLocation.latitude}, ${currentLocation.longitude}`);
                   console.log(`Response: "${response}"`);
                   console.log(`---`);
                   
               } catch (error) {
                   console.error("❌ Error:", error);
                   session.layouts.showTextWall("❌ Error occurred");
               }
           }
       });

       // Listen for button presses to toggle listening
       session.events.onButtonPress(async (data) => {
           console.log(`🔘 BUTTON PRESSED! (Type: ${data.pressType})`);
           
           if (data.pressType === 'short') {
               if (!isListening) {
                   isListening = true;
                   console.log(`🎤 STARTED LISTENING - Speak now!`);
                   session.layouts.showTextWall("🎤 Listening...");
               } else {
                   isListening = false;
                   console.log(`🛑 STOPPED LISTENING`);
                   session.layouts.showTextWall("Press to speak");
               }
           }
       });

       // Listen for session events
       session.events.onConnected(() => {
           console.log(`🔗 Session ${sessionId} connected`);
           session.layouts.showTextWall("Press a button to talk to Gemini");
       });

       session.events.onDisconnected(() => {
           console.log(`🔌 Session ${sessionId} disconnected`);
       });

       // Log instructions
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
   if (ELEVENLABS_VOICE_ID) {
        console.log("🎤 ElevenLabs TTS is enabled");
   } else {
        console.log("🔇 ElevenLabs TTS is disabled - set ELEVENLABS_VOICE_ID to enable");
   }
}).catch(err => {
   console.error("❌ Failed to start server:", err);
}); 