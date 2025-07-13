import * as fs from 'fs';
import * as path from 'path';

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

interface RouteData {
    routes: Array<{
        legs: Array<{
            steps: RouteStep[];
        }>;
    }>;
}

// Navigation class to handle turn-by-turn navigation
export class LiveNavigation {
    private routeSteps: RouteStep[] = [];
    private currentStepIndex: number = 0;
    private isActive: boolean = false;
    private arrivalThreshold: number = 20; // 20 feet threshold for step completion

    constructor() {
        this.loadRouteData();
    }

    // Load route data from output.json
    private loadRouteData(): void {
        try {
            const routeData: RouteData = JSON.parse(
                fs.readFileSync(path.join(__dirname, '../output.json'), 'utf8')
            );
            this.routeSteps = routeData.routes[0].legs[0].steps;
            console.log(`🗺️ Loaded ${this.routeSteps.length} navigation steps`);
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
                progress: ""
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

        return {
            isActive: true,
            currentStep,
            distanceToStep,
            distanceInFeet,
            stepInstructions,
            isStepCompleted,
            isDestinationReached: false,
            progress
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

        // Check if current step is completed
        if (status.isStepCompleted) {
            console.log(`🎯 Step ${this.currentStepIndex + 1} completed!`);
            this.currentStepIndex++;
            
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
    public getRouteSummary(): {
        totalSteps: number;
        totalDistance: string;
        totalDuration: string;
        startAddress: string;
        endAddress: string;
    } {
        if (this.routeSteps.length === 0) {
            return {
                totalSteps: 0,
                totalDistance: "0 ft",
                totalDuration: "0 min",
                startAddress: "",
                endAddress: ""
            };
        }

        const totalDistance = this.routeSteps.reduce((sum, step) => sum + step.distance.value, 0);
        const totalDuration = this.routeSteps.reduce((sum, step) => sum + step.duration.value, 0);
        
        return {
            totalSteps: this.routeSteps.length,
            totalDistance: `${Math.round(totalDistance * 3.28084)} ft`,
            totalDuration: `${Math.round(totalDuration / 60)} min`,
            startAddress: "3263 Cade Dr, Fremont, CA 94536, USA",
            endAddress: "35238 Erving Ct, Fremont, CA 94536, USA"
        };
    }
} 