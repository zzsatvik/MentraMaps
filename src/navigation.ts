import { GoogleDirectionsAPI } from './google-directions';
import { beepData } from './beep';

// Types for the route data
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

// Navigation class to handle turn-by-turn navigation
export class LiveNavigation {
    private routeSteps: RouteStep[] = [];
    private currentStepIndex: number = 0;
    private isActive: boolean = false;
    private arrivalThreshold: number = 20; // 20 feet threshold for step completion
    private googleDirections: GoogleDirectionsAPI;
    private isRouteLoaded: boolean = false;
    
    // Turn alert thresholds
    private turnAlert100Feet: number = 100; // 100 feet before turn
    private turnAlert20Feet: number = 20;   // 20 feet before turn (changed from 15)
    
    // Track which alerts have been shown to avoid duplicates
    private alertsShown: {
        [stepIndex: number]: {
            alert100Feet: boolean;
            alert20Feet: boolean;  // changed from alert15Feet
        }
    } = {};

    // ElevenLabs TTS configuration
    private elevenLabsVoiceId: string;
    private audioSession: any = null; // Will be set by the main app
    // Beeping configuration for blind-friendly turn awareness
    private beepStartMeters: number = 200; // Begin beeping within 200 m of the turn
    private beepPeriodMs: number = 2000;   // Beep cadence = 2 s
    private lastBeepTime: number = 0;      // Timestamp of last beep (ms)

    constructor(elevenLabsVoiceId?: string) {
        this.googleDirections = new GoogleDirectionsAPI();
        this.elevenLabsVoiceId = elevenLabsVoiceId || process.env.ELEVENLABS_VOICE_ID || '';
        // Don't load route data immediately - wait for user location
    }

    // Set audio session for TTS functionality
    public setAudioSession(audioSession: any): void {
        this.audioSession = audioSession;
    }

    // Load route data from Google Directions API using user's current location
    public async loadRouteData(userLocation: Location): Promise<void> {
        try {
            // Set the user's current location as the origin
            this.googleDirections.setCurrentLocation(userLocation);
            
            this.routeSteps = await this.googleDirections.fetchRouteData();
            console.log(`🗺️ Loaded ${this.routeSteps.length} navigation steps from Google Directions API`);
            
            // Initialize alert tracking for each step
            this.routeSteps.forEach((_, index) => {
                this.alertsShown[index] = {
                    alert100Feet: false,
                    alert20Feet: false  // changed from alert15Feet
                };
            });
            
            this.isRouteLoaded = true;
        } catch (error) {
            console.error("❌ Error loading route data:", error);
            this.routeSteps = [];
            this.isRouteLoaded = false;
        }
    }

    // Check if route is loaded
    public isRouteReady(): boolean {
        return this.isRouteLoaded && this.routeSteps.length > 0;
    }

    // Calculate distance between two points using Haversine formula (in meters)
    private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c * 1000; // Convert to meters
    }

    // Convert meters to feet
    private metersToFeet(meters: number): number {
        return meters * 3.28084;
    }

    // Clean HTML instructions for display
    private cleanInstructions(htmlInstructions: string): string {
        return htmlInstructions
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ') // Replace HTML entities
            .trim();
    }

    // Check if a step involves a turn
    private isTurnStep(step: RouteStep): boolean {
        return step.maneuver === 'turn-left' || 
               step.maneuver === 'turn-right' ||
               step.html_instructions.toLowerCase().includes('turn left') ||
               step.html_instructions.toLowerCase().includes('turn right');
    }

    // Get turn direction from step
    private getTurnDirection(step: RouteStep): string {
        if (step.maneuver === 'turn-left' || step.html_instructions.toLowerCase().includes('turn left')) {
            return 'left';
        } else if (step.maneuver === 'turn-right' || step.html_instructions.toLowerCase().includes('turn right')) {
            return 'right';
        }
        return 'unknown';
    }

    // Speak text using ElevenLabs TTS
    private async speakText(text: string, priority: 'high' | 'normal' = 'normal'): Promise<void> {
        if (!this.audioSession || !this.elevenLabsVoiceId) {
            console.log(`️ TTS not available: "${text}"`);
            return;
        }

        try {
            console.log(`️ Speaking: "${text}"`);
            
            const result = await this.audioSession.speak(text, {
                voice_id: this.elevenLabsVoiceId,
                model_id: priority === 'high' ? 'eleven_flash_v2_5' : 'eleven_turbo_v2_5',
                voice_settings: {
                    stability: priority === 'high' ? 0.8 : 0.6,
                    similarity_boost: 0.85,
                    style: 0.5,
                    use_speaker_boost: false,
                    speed: 0.95
                }
            });

            if (result.success) {
                console.log(`✅ TTS successful: "${text}"`);
            } else {
                console.error(`❌ TTS failed: ${result.error}`);
            }
        } catch (error) {
            console.error(`❌ TTS error: ${error}`);
        }
    }

    // Play a short beep sound at the requested loudness (0-1)
    private async playBeep(volume: number): Promise<void> {
        if (!this.audioSession) return;

        try {
            await this.audioSession.playAudio({
                data: beepData,
                mimeType: 'audio/mpeg',
                volume: Math.max(0, Math.min(1, volume))
            });
            console.log(`🔔 Beep! (vol=${volume.toFixed(2)})`);
        } catch (error) {
            console.error('❌ Beep error:', error);
        }
    }

    // Check and trigger turn alerts
    private async checkTurnAlerts(userLocation: Location): Promise<void> {
        if (this.currentStepIndex >= this.routeSteps.length) return;

        const currentStep = this.routeSteps[this.currentStepIndex];
        
        // Only check for turns
        if (!this.isTurnStep(currentStep)) return;

        const distanceToStep = this.calculateDistance(
            userLocation.lat,
            userLocation.lng,
            currentStep.end_location.lat,
            currentStep.end_location.lng
        );
        const distanceInFeet = this.metersToFeet(distanceToStep);
        // ────────────────────────────────────────────────
        // Continuous beeping feedback as the user approaches the turn
        const now = Date.now();
        if (distanceToStep <= this.beepStartMeters && (now - this.lastBeepTime >= this.beepPeriodMs)) {
            const volume = 1 - (distanceToStep / this.beepStartMeters);
            await this.playBeep(volume);
            this.lastBeepTime = now;
        }
        const turnDirection = this.getTurnDirection(currentStep);

        // Check 100 feet alert
        if (distanceInFeet <= this.turnAlert100Feet && 
            distanceInFeet > this.turnAlert20Feet &&  // changed from turnAlert15Feet
            !this.alertsShown[this.currentStepIndex].alert100Feet) {
            
            const alertMessage = `Turn ${turnDirection} in 100 feet`;
            console.log(`🚨 TURN ALERT: ${alertMessage}!`);
            await this.speakText(alertMessage, 'high');
            this.alertsShown[this.currentStepIndex].alert100Feet = true;
        }

        // Check 20 feet alert (changed from 15 feet)
        if (distanceInFeet <= this.turnAlert20Feet && 
            !this.alertsShown[this.currentStepIndex].alert20Feet) {  // changed from alert15Feet
            
            const alertMessage = `Turn ${turnDirection} in 20 feet`;  // changed message
            console.log(`🚨 TURN ALERT: ${alertMessage}!`);
            await this.speakText(alertMessage, 'high');
            this.alertsShown[this.currentStepIndex].alert20Feet = true;  // changed from alert15Feet
        }
    }

    // Start navigation - now requires route to be loaded first
    public async startNavigation(): Promise<void> {
        if (!this.isRouteReady()) {
            console.error("❌ Cannot start navigation - route not loaded");
            return;
        }
        
        this.currentStepIndex = 0;
        this.isActive = true;
        console.log("🚀 Navigation started");
        
        // Speak welcome message with route summary
        if (this.routeSteps.length > 0) {
            const totalSteps = this.routeSteps.length;
            const totalDistance = this.routeSteps.reduce((sum, step) => sum + step.distance.value, 0);
            const distanceInMiles = (totalDistance * 3.28084 / 5280).toFixed(1); // Convert meters to miles
            
            const welcomeMessage = `Navigation started. Your route has ${totalSteps} step${totalSteps > 1 ? 's' : ''} and is ${distanceInMiles} mile${distanceInMiles !== '1.0' ? 's' : ''} long.`;
            
            console.log(`🎤 Speaking welcome: "${welcomeMessage}"`);
            await this.speakText(welcomeMessage);
            
            // Also speak the first instruction
            const firstStep = this.routeSteps[0];
            const firstInstruction = this.cleanInstructions(firstStep.html_instructions);
            console.log(`🎤 Speaking first instruction: "${firstInstruction}"`);
            await this.speakText(firstInstruction);
        }
    }

    // Stop navigation
    public stopNavigation(): void {
        this.isActive = false;
        console.log(" Navigation stopped");
        // Ensure any pending beeps are halted
        this.lastBeepTime = 0;
    }

    // Get current navigation status
    public getNavigationStatus(userLocation: Location): {
        isActive: boolean;
        currentStep: RouteStep | null;
        distanceToStep: number;
        distanceInFeet: number;
        stepInstructions: string;
        isStepCompleted: boolean;
        isDestinationReached: boolean;
        progress: string;
        isTurnStep: boolean;
        turnDirection: string;
    } {
        if (!this.isActive || this.currentStepIndex >= this.routeSteps.length) {
            return {
                isActive: false,
                currentStep: null,
                distanceToStep: 0,
                distanceInFeet: 0,
                stepInstructions: "",
                isStepCompleted: false,
                isDestinationReached: this.currentStepIndex >= this.routeSteps.length,
                progress: "",
                isTurnStep: false,
                turnDirection: ""
            };
        }

        const currentStep = this.routeSteps[this.currentStepIndex];
        const distanceToStep = this.calculateDistance(
            userLocation.lat,
            userLocation.lng,
            currentStep.end_location.lat,
            currentStep.end_location.lng
        );
        const distanceInFeet = this.metersToFeet(distanceToStep);
        const stepInstructions = this.cleanInstructions(currentStep.html_instructions);
        const isStepCompleted = distanceInFeet <= this.arrivalThreshold;
        const progress = `Step ${this.currentStepIndex + 1}/${this.routeSteps.length}`;
        const isTurnStep = this.isTurnStep(currentStep);
        const turnDirection = this.getTurnDirection(currentStep);

        return {
            isActive: true,
            currentStep,
            distanceToStep,
            distanceInFeet,
            stepInstructions,
            isStepCompleted,
            isDestinationReached: false,
            progress,
            isTurnStep,
            turnDirection
        };
    }

    // Update navigation based on user location
    public async updateNavigation(userLocation: Location): Promise<{
        stepCompleted: boolean;
        destinationReached: boolean;
        nextInstructions: string;
        status: any;
    }> {
        const status = this.getNavigationStatus(userLocation);
        
        if (!status.isActive) {
            return {
                stepCompleted: false,
                destinationReached: false,
                nextInstructions: "",
                status
            };
        }

        // Check for turn alerts
        await this.checkTurnAlerts(userLocation);

        // Check if current step is completed
        if (status.isStepCompleted) {
            console.log(`🎯 Step ${this.currentStepIndex + 1} completed!`);
            this.currentStepIndex++;
            
            // Reset alerts for the next step
            if (this.currentStepIndex < this.routeSteps.length) {
                this.alertsShown[this.currentStepIndex] = {
                    alert100Feet: false,
                    alert20Feet: false  // changed from alert15Feet
                };
            }
            
            // Check if destination is reached
            if (this.currentStepIndex >= this.routeSteps.length) {
                console.log("🎉 Destination reached!");
                await this.speakText("You have arrived at your destination!");
                this.stopNavigation();
                return {
                    stepCompleted: true,
                    destinationReached: true,
                    nextInstructions: "You have arrived at your destination!",
                    status: this.getNavigationStatus(userLocation)
                };
            } else {
                // Move to next step
                const nextStep = this.routeSteps[this.currentStepIndex];
                const nextInstructions = this.cleanInstructions(nextStep.html_instructions);
                console.log(`➡️ Moving to step ${this.currentStepIndex + 1}: ${nextInstructions}`);
                
                // Speak the new direction instruction
                await this.speakText(nextInstructions);
                
                return {
                    stepCompleted: true,
                    destinationReached: false,
                    nextInstructions,
                    status: this.getNavigationStatus(userLocation)
                };
            }
        }

        return {
            stepCompleted: false,
            destinationReached: false,
            nextInstructions: "",
            status
        };
    }

    // Get route summary - now checks if route is loaded
    public async getRouteSummary(): Promise<{
        totalSteps: number;
        totalDistance: string;
        totalDuration: string;
        startAddress: string;
        endAddress: string;
    }> {
        if (!this.isRouteReady()) {
            return {
                totalSteps: 0,
                totalDistance: "Route not loaded",
                totalDuration: "Route not loaded",
                startAddress: "Route not loaded",
                endAddress: "Route not loaded"
            };
        }
        
        return await this.googleDirections.getRouteSummary();
    }

    // Refresh route with new user location
    public async refreshRoute(userLocation: Location): Promise<void> {
        console.log("🔄 Refreshing route with new user location...");
        await this.loadRouteData(userLocation);
    }
} 