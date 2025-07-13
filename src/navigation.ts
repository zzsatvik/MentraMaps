import { GoogleDirectionsAPI } from './google-directions';

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
    
    // Turn alert thresholds
    private turnAlert100Feet: number = 100; // 100 feet before turn
    private turnAlert15Feet: number = 15;   // 15 feet before turn
    
    // Track which alerts have been shown to avoid duplicates
    private alertsShown: {
        [stepIndex: number]: {
            alert100Feet: boolean;
            alert15Feet: boolean;
        }
    } = {};

    constructor() {
        this.googleDirections = new GoogleDirectionsAPI();
        this.loadRouteData();
    }

    // Load route data from Google Directions API
    private async loadRouteData(): Promise<void> {
        try {
            this.routeSteps = await this.googleDirections.fetchRouteData();
            console.log(`🗺️ Loaded ${this.routeSteps.length} navigation steps from Google Directions API`);
            
            // Initialize alert tracking for each step
            this.routeSteps.forEach((_, index) => {
                this.alertsShown[index] = {
                    alert100Feet: false,
                    alert15Feet: false
                };
            });
        } catch (error) {
            console.error("❌ Error loading route data:", error);
            this.routeSteps = [];
        }
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

    // Check and trigger turn alerts
    private checkTurnAlerts(userLocation: Location): void {
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
        const turnDirection = this.getTurnDirection(currentStep);

        // Check 100 feet alert
        if (distanceInFeet <= this.turnAlert100Feet && 
            distanceInFeet > this.turnAlert15Feet && 
            !this.alertsShown[this.currentStepIndex].alert100Feet) {
            
            console.log(`🚨 TURN ALERT: Turn ${turnDirection} in 100 feet!`);
            this.alertsShown[this.currentStepIndex].alert100Feet = true;
        }

        // Check 15 feet alert
        if (distanceInFeet <= this.turnAlert15Feet && 
            !this.alertsShown[this.currentStepIndex].alert15Feet) {
            
            console.log(`🚨 TURN ALERT: Turn ${turnDirection} in 15 feet!`);
            this.alertsShown[this.currentStepIndex].alert15Feet = true;
        }
    }

    // Start navigation
    public startNavigation(): void {
        this.currentStepIndex = 0;
        this.isActive = true;
        console.log("🚶 Navigation started");
    }

    // Stop navigation
    public stopNavigation(): void {
        this.isActive = false;
        console.log("🛑 Navigation stopped");
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
    public updateNavigation(userLocation: Location): {
        stepCompleted: boolean;
        destinationReached: boolean;
        nextInstructions: string;
        status: any;
    } {
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
        this.checkTurnAlerts(userLocation);

        // Check if current step is completed
        if (status.isStepCompleted) {
            console.log(`🎯 Step ${this.currentStepIndex + 1} completed!`);
            this.currentStepIndex++;
            
            // Reset alerts for the next step
            if (this.currentStepIndex < this.routeSteps.length) {
                this.alertsShown[this.currentStepIndex] = {
                    alert100Feet: false,
                    alert15Feet: false
                };
            }
            
            // Check if destination is reached
            if (this.currentStepIndex >= this.routeSteps.length) {
                console.log("🎉 Destination reached!");
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

    // Get route summary
    public async getRouteSummary(): Promise<{
        totalSteps: number;
        totalDistance: string;
        totalDuration: string;
        startAddress: string;
        endAddress: string;
    }> {
        try {
            const summary = await this.googleDirections.getRouteSummary();
            return {
                totalSteps: summary.totalSteps,
                totalDistance: summary.totalDistance,
                totalDuration: summary.totalDuration,
                startAddress: summary.startAddress,
                endAddress: summary.endAddress
            };
        } catch (error) {
            console.error("Error getting route summary:", error);
            return {
                totalSteps: this.routeSteps.length,
                totalDistance: "Unknown",
                totalDuration: "Unknown",
                startAddress: "Unknown",
                endAddress: "Unknown"
            };
        }
    }

    // Refresh route data (useful for getting updated routes)
    public async refreshRoute(): Promise<void> {
        console.log("🔄 Refreshing route data...");
        await this.loadRouteData();
        console.log(`✅ Route refreshed: ${this.routeSteps.length} steps loaded`);
    }
} 