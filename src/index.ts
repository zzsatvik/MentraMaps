import express, { Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { decodePolyline, cleanInstructions } from './utils/polyline.js';
import { processNavigationSteps } from './utils/navigation.js';
import type { 
  GoogleMapsDirectionsResponse, 
  DirectionsResponse
} from './types/index.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (CSS, JS)
app.use(express.static('public'));

// Root endpoint - serves the main page
app.get('/', (_req: Request, res: Response) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mentra Maps - Navigation</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .form-section {
            padding: 40px;
        }
        
        .form-group {
            margin-bottom: 25px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
        }
        
        input[type="text"] {
            width: 100%;
            padding: 15px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s ease;
        }
        
        input[type="text"]:focus {
            outline: none;
            border-color: #4facfe;
        }
        
        .submit-btn {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s ease;
        }
        
        .submit-btn:hover {
            transform: translateY(-2px);
        }
        
        .submit-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .loading {
            text-align: center;
            padding: 20px;
            color: #666;
        }
        
        .results {
            padding: 40px;
            border-top: 1px solid #e1e5e9;
        }
        
        .results h3 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.5rem;
        }
        
        .route-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
        }
        
        .route-info p {
            margin-bottom: 10px;
            font-size: 1.1rem;
        }
        
        .instructions {
            margin-bottom: 25px;
        }
        
        .instruction-step {
            background: white;
            border-left: 4px solid #4facfe;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 0 8px 8px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .step-number {
            font-weight: 600;
            color: #4facfe;
            margin-right: 10px;
        }
        
        .error {
            background: #fee;
            color: #c33;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #c33;
        }
        
        .coordinates-info {
            background: #f0f8ff;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 0.9rem;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧭 Mentra Maps</h1>
            <p>Get walking directions with coordinates for navigation</p>
        </div>
        
        <div class="form-section">
            <form id="directionsForm">
                <div class="form-group">
                    <label for="origin">Starting Point:</label>
                    <input type="text" id="origin" name="origin" placeholder="e.g., Times Square, NY" required>
                </div>
                
                <div class="form-group">
                    <label for="destination">Destination:</label>
                    <input type="text" id="destination" name="destination" placeholder="e.g., Central Park, NY" required>
                </div>
                
                <button type="submit" class="submit-btn" id="submitBtn">
                    Get Directions
                </button>
            </form>
            
            <div id="loading" class="loading" style="display: none;">
                <p>🔄 Getting directions...</p>
            </div>
        </div>
        
        <div id="results" class="results" style="display: none;"></div>
    </div>

    <script>
        const form = document.getElementById('directionsForm');
        const loading = document.getElementById('loading');
        const results = document.getElementById('results');
        const submitBtn = document.getElementById('submitBtn');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const origin = document.getElementById('origin').value;
            const destination = document.getElementById('destination').value;
            
            // Show loading
            loading.style.display = 'block';
            results.style.display = 'none';
            submitBtn.disabled = true;
            
            try {
                const response = await fetch(\`/directions?origin=\${encodeURIComponent(origin)}&destination=\${encodeURIComponent(destination)}\`);
                const data = await response.json();
                
                if (response.ok) {
                    displayResults(data);
                } else {
                    displayError(data.message || 'Failed to get directions');
                }
            } catch (error) {
                displayError('Network error. Please try again.');
            } finally {
                loading.style.display = 'none';
                submitBtn.disabled = false;
            }
        });

        function displayResults(data) {
            const instructionsHtml = data.instructions.map((instruction, index) => 
                \`<div class="instruction-step">
                    <span class="step-number">\${index + 1}.</span>
                    \${instruction}
                </div>\`
            ).join('');

            const navigationStepsHtml = data.navigationSteps.map((step, index) => 
                \`<div class="instruction-step">
                    <span class="step-number">\${index + 1}.</span>
                    <strong>\${step.direction}</strong> for <strong>\${Math.round(step.distance)} meters</strong>
                    <br><em>\${step.instruction}</em>
                </div>\`
            ).join('');

            const coordinatesCount = data.coordinates.length;
            const navigationStepsCount = data.navigationSteps.length;
            
            results.innerHTML = \`
                <h3>🗺️ Walking Directions</h3>
                
                <div class="route-info">
                    <p><strong>Total Distance:</strong> \${data.totalDistance}</p>
                    <p><strong>Estimated Time:</strong> \${data.totalDuration}</p>
                    <p><strong>Navigation Steps:</strong> \${navigationStepsCount} key points</p>
                    <p><strong>Total Coordinates:</strong> \${coordinatesCount} detailed points</p>
                </div>
                
                <div class="instructions">
                    <h3>🧭 Navigation Steps (Direction + Distance)</h3>
                    \${navigationStepsHtml}
                </div>
                
                <div class="instructions">
                    <h3>📋 Original Instructions</h3>
                    \${instructionsHtml}
                </div>
                
                <div class="coordinates-info">
                    <h3>📍 Key Coordinates (Navigation Points)</h3>
                    <p>\${data.navigationSteps.map(step => 
                        \`[\${step.bearing.toFixed(1)}° \${step.direction} - \${Math.round(step.distance)}m]\`
                    ).join(', ')}</p>
                </div>
            \`;
            
            results.style.display = 'block';
        }

        function displayError(message) {
            results.innerHTML = \`
                <div class="error">
                    <h3>❌ Error</h3>
                    <p>\${message}</p>
                </div>
            \`;
            results.style.display = 'block';
        }
    </script>
</body>
</html>`;
  
  res.send(html);
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Mentra Maps API is running' });
});

// Directions endpoint
app.get('/directions', async (req: Request, res: Response) => {
  try {
    const { origin, destination } = req.query;
    
    // Validate required parameters
    if (!origin || !destination || typeof origin !== 'string' || typeof destination !== 'string') {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Both origin and destination are required as strings'
      });
    }

    // Validate API key
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'Google Maps API key not configured'
      });
    }

    // Call Google Maps Directions API
    const response = await axios.get<GoogleMapsDirectionsResponse>(
      'https://maps.googleapis.com/maps/api/directions/json',
      {
        params: {
          origin: origin,
          destination: destination,
          mode: 'walking',
          key: apiKey
        }
      }
    );

    const data = response.data;

    // Check if the API request was successful
    if (data.status !== 'OK') {
      return res.status(400).json({
        error: 'Directions API error',
        message: `Google Maps API returned status: ${data.status}`,
        details: 'No additional details available'
      });
    }

    // Check if routes were found
    if (!data.routes || data.routes.length === 0) {
      return res.status(404).json({
        error: 'No route found',
        message: 'No walking route found between the specified locations'
      });
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    // Extract and clean instructions
    const instructions = leg.steps.map(step => 
      cleanInstructions(step.html_instructions)
    );

    // Decode polyline coordinates for each step
    const coordinates: [number, number][] = [];
    leg.steps.forEach(step => {
      const stepCoordinates = decodePolyline(step.polyline.points);
      coordinates.push(...stepCoordinates);
    });

    // Process coordinates into navigation steps with direction and distance
    const navigationSteps = processNavigationSteps(coordinates, instructions);

    // Create response object
    const directionsResponse: DirectionsResponse = {
      instructions,
      coordinates,
      navigationSteps,
      totalDistance: leg.distance.text,
      totalDuration: leg.duration.text
    };

    return res.json(directionsResponse);

  } catch (error) {
    console.error('Error fetching directions:', error);
    
    if (axios.isAxiosError(error)) {
      return res.status(500).json({
        error: 'External API error',
        message: 'Failed to fetch directions from Google Maps API',
        details: error.message
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT} — use ngrok to expose this endpoint`);
  console.log('');
  console.log('📋 Example usage:');
  console.log(`curl "http://localhost:${PORT}/directions?origin=Times+Square,NY&destination=Central+Park,NY"`);
  console.log('');
  console.log('🔑 Make sure to set your GOOGLE_MAPS_API_KEY in the .env file');
  console.log('   Get your API key from: https://console.cloud.google.com/');
  console.log('   Enable the "Directions API" for your project');
}); 