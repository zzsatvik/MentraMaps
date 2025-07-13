import { AppServer, AppSession, StreamType, createTranscriptionStream } from '@mentra/sdk';

// Load configuration from environment variables
const PACKAGE_NAME = process.env.PACKAGE_NAME || "com.example.transcriptiontest";
const PORT = parseInt(process.env.PORT || "3002");
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY || "demo_key";

console.log("=== MentraOS Transcription Test ===");
console.log(`Package Name: ${PACKAGE_NAME}`);
console.log(`Port: ${PORT}`);
console.log(`API Key: ${MENTRAOS_API_KEY ? "Set" : "Not set"}`);
console.log("===================================");

if (!MENTRAOS_API_KEY || MENTRAOS_API_KEY === "demo_key") {
   console.error("MENTRAOS_API_KEY environment variable is required");
   console.error("Please set it with: export MENTRAOS_API_KEY=your_actual_api_key");
   console.error("For now, using demo key for testing...");
}

/**
 * Transcription Test App - Listens for button presses and transcribes speech
 */
class TranscriptionTestApp extends AppServer {
   protected async onSession(session: AppSession, sessionId: string, userId: string): Promise<void> {
       console.log(`🎉 NEW TRANSCRIPTION SESSION CONNECTED!`);
       console.log(`Session ID: ${sessionId}`);
       console.log(`User ID: ${userId}`);
       session.logger.info(`New transcription session: ${sessionId} for user ${userId}`);

       // Track transcription state
       let isListening = false;
       let currentTranscription = "";
       let voiceActive = false;

       // Create English transcription stream
       const englishTranscriptionStream = createTranscriptionStream('en-US');
       console.log("🎤 Created English transcription stream");

       // Subscribe to voice activity detection
       const unsubscribeVoiceActivity = session.events.onVoiceActivity((data) => {
           const isSpeaking = data.status === true || data.status === "true";
           voiceActive = isSpeaking;
           
           console.log(`🎤 Voice Activity: ${isSpeaking ? 'SPEAKING' : 'SILENT'} (status: ${data.status})`);
           
           if (isListening) {
               if (isSpeaking) {
                   console.log(`🎤 Voice detected - user is speaking`);
               } else {
                   console.log(`🔇 Voice stopped - user stopped speaking`);
               }
           }
       });

       // Subscribe to transcription events
       const unsubscribeTranscription = session.events.onTranscription((data) => {
           console.log(`🎤 Transcription event received: "${data.text}" (Final: ${data.isFinal})`);
           
           if (isListening) {
               if (data.isFinal) {
                   // Final transcription received
                   currentTranscription = data.text;
                   console.log(`✅ FINAL TRANSCRIPTION: "${currentTranscription}"`);
                   console.log(`---`);
                   isListening = false;
               } else {
                   // Partial transcription (real-time)
                   console.log(`🔄 Partial: "${data.text}"`);
               }
           } else {
               console.log(`📝 Transcription received but not listening: "${data.text}"`);
           }
       });

       // Also try the generic event handler for transcription
       const unsubscribeGenericTranscription = session.events.on(StreamType.TRANSCRIPTION, (data) => {
           console.log(`🎤 Generic transcription event:`, data);
       });

       console.log("🎤 Voice activity and transcription listeners set up");

       // Listen for button presses
       session.events.onButtonPress(async (data) => {
           console.log(`🔘 BUTTON PRESSED!`);
           console.log(`Button ID: ${data.buttonId}`);
           console.log(`Press Type: ${data.pressType}`);
           console.log(`Full button data:`, JSON.stringify(data, null, 2));
           console.log(`Timestamp: ${new Date().toISOString()}`);

           if (data.pressType === 'long') {
               // Long press - start listening
               if (!isListening) {
                   isListening = true;
                   currentTranscription = "";
                   console.log(`🎤 STARTED LISTENING - Speak now!`);
                   console.log(`📝 Hold the button and speak, release when done`);
                   console.log(`🎤 Waiting for transcription events...`);
                   console.log(`🎤 Current voice activity: ${voiceActive ? 'SPEAKING' : 'SILENT'}`);
               } else {
                   console.log(`⚠️ Already listening, ignoring long press`);
               }
           } else if (data.pressType === 'short') {
               // Short press - stop listening if currently listening
               if (isListening) {
                   isListening = false;
                   console.log(`🛑 STOPPED LISTENING`);
                   if (currentTranscription) {
                       console.log(`📝 Final result: "${currentTranscription}"`);
                   } else {
                       console.log(`📝 No speech detected`);
                   }
                   console.log(`---`);
               } else {
                   console.log(`ℹ️ Short press - use long press to start listening`);
               }
           }
       });

       // Listen for session events
       session.events.onConnected(() => {
           console.log(`🔗 Session ${sessionId} connected`);
       });

       session.events.onDisconnected(() => {
           console.log(`🔌 Session ${sessionId} disconnected`);
           // Clean up listeners
           unsubscribeTranscription();
           unsubscribeVoiceActivity();
           unsubscribeGenericTranscription();
       });

       // Log instructions
       console.log("📋 Instructions:");
       console.log("- LONG PRESS any button to start listening");
       console.log("- Speak while holding the button");
       console.log("- Release the button when done speaking");
       console.log("- Or SHORT PRESS to stop listening early");
       console.log("🚀 Ready to transcribe speech!");
   }
}

// Create and start the app server
const server = new TranscriptionTestApp({
   packageName: PACKAGE_NAME,
   apiKey: MENTRAOS_API_KEY,
   port: PORT
});

console.log("🚀 Starting Transcription Test server...");
server.start().then(() => {
   console.log(`✅ Transcription server started successfully on port ${PORT}`);
   console.log("📱 Waiting for device connections...");
   console.log("🎤 Long press any button to start speech transcription!");
}).catch(err => {
   console.error("❌ Failed to start transcription server:", err);
}); 