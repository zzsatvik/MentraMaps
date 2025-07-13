import { GoogleMapsDirections } from './directions';

/**
 * Standalone example of using Google Maps Directions API
 * This file can be run independently to test directions functionality
 */
async function main(): Promise<void> {
  console.log('🚗 Google Maps Directions Example\n');

  // TODO: Replace with your actual Google Maps API key
  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  
  // TODO: Replace with your desired start and end points
  // You can use coordinates (lat,lng) or addresses
  const START_POINT = '37.760151,-122.394363'; // Example: New York City coordinates
  const END_POINT = '37.795118,-122.396055';  // Example: Los Angeles coordinates
  
  // Alternative examples using addresses:
  // const START_POINT = 'New York, NY';
  // const END_POINT = 'Los Angeles, CA';
  
  // const START_POINT = 'Times Square, New York, NY';
  // const END_POINT = 'Hollywood Boulevard, Los Angeles, CA';

  if (!API_KEY) {
    console.error('❌ Please set the GOOGLE_MAPS_API_KEY environment variable');
    console.error('   Get your API key from: https://console.cloud.google.com/apis/credentials');
    process.exit(1);
  }

  const directionsService = new GoogleMapsDirections(API_KEY);
  
  try {
    console.log('📍 Getting directions...');
    console.log(`   From: ${START_POINT}`);
    console.log(`   To: ${END_POINT}`);
    console.log('   Mode: Walking\n');

    // Get walking directions
    const walkingDirections = await directionsService.getDirections(START_POINT, END_POINT, 'walking');
    directionsService.logDirections(walkingDirections);

  } catch (error) {
    console.error('❌ Failed to get directions:', error);
    
    if (error instanceof Error && error.message.includes('API key')) {
      console.error('\n💡 Make sure your API key is valid and has the Directions API enabled');
      console.error('   Enable Directions API: https://console.cloud.google.com/apis/library/directions-backend.googleapis.com');
    }
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { main }; 