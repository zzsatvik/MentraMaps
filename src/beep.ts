import { readFileSync } from 'fs';

// Load the beep sound once at startup so it can be reused efficiently across sessions.
// The file path is relative to the project root.
export const beepData = readFileSync('assets/bee-329314.mp3'); 