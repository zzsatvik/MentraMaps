/**
 * Navigation utilities for calculating direction and distance
 */

export interface NavigationStep {
  direction: string;
  distance: number; // meters
  bearing: number; // degrees
  instruction: string;
}

/**
 * Calculate bearing between two coordinates
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const toDeg = (rad: number) => rad * (180 / Math.PI);

  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  let bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/**
 * Calculate distance between coordinates (Haversine formula)
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => deg * (Math.PI / 180);

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Convert bearing to direction
 */
export function bearingToDirection(bearing: number): string {
  if (bearing >= 337.5 || bearing < 22.5) return 'North';
  if (bearing >= 22.5 && bearing < 67.5) return 'Northeast';
  if (bearing >= 67.5 && bearing < 112.5) return 'East';
  if (bearing >= 112.5 && bearing < 157.5) return 'Southeast';
  if (bearing >= 157.5 && bearing < 202.5) return 'South';
  if (bearing >= 202.5 && bearing < 247.5) return 'Southwest';
  if (bearing >= 247.5 && bearing < 292.5) return 'West';
  if (bearing >= 292.5 && bearing < 337.5) return 'Northwest';
  return 'North';
}

/**
 * Format distance for display
 */
export function formatDistance(distance: number): string {
  if (distance < 1000) {
    return `${Math.round(distance)} meters`;
  } else {
    return `${(distance / 1000).toFixed(1)} kilometers`;
  }
}

/**
 * Process coordinates to navigation steps
 */
export function processNavigationSteps(
  coordinates: [number, number][], 
  instructions: string[]
): NavigationStep[] {
  const steps: NavigationStep[] = [];
  const keyPoints = extractKeyPoints(coordinates);
  
  for (let i = 0; i < keyPoints.length - 1; i++) {
    const [lat1, lon1] = keyPoints[i];
    const [lat2, lon2] = keyPoints[i + 1];
    
    const distance = calculateDistance(lat1, lon1, lat2, lon2);
    const bearing = calculateBearing(lat1, lon1, lat2, lon2);
    const direction = bearingToDirection(bearing);
    
    const instruction = instructions[i] || `Walk ${direction} for ${formatDistance(distance)}`;
    
    steps.push({
      direction,
      distance,
      bearing,
      instruction
    });
  }
  
  return steps;
}

/**
 * Extract key points (start, turns, end)
 */
function extractKeyPoints(coordinates: [number, number][]): [number, number][] {
  if (coordinates.length <= 2) return coordinates;
  
  const keyPoints: [number, number][] = [];
  keyPoints.push(coordinates[0]); // Start
  
  // Find significant turns (>15 degrees)
  for (let i = 1; i < coordinates.length - 1; i++) {
    const prev = coordinates[i - 1];
    const curr = coordinates[i];
    const next = coordinates[i + 1];
    
    const bearing1 = calculateBearing(prev[0], prev[1], curr[0], curr[1]);
    const bearing2 = calculateBearing(curr[0], curr[1], next[0], next[1]);
    
    const directionChange = Math.abs(bearing2 - bearing1);
    const normalizedChange = Math.min(directionChange, 360 - directionChange);
    
    if (normalizedChange > 15) {
      keyPoints.push(curr);
    }
  }
  
  keyPoints.push(coordinates[coordinates.length - 1]); // End
  return keyPoints;
} 