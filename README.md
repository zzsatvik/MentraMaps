# MentraMaps is a navigation tool aimed to assist visually impaired and blind people with everyday navigation, built using the MentraOS SDK.
- some outdated files still exist in this commit

# Requirements
- Google directions API, Gemini API, Roboflow API, Elevenlabs API, MentraOS API. Also requires a pair of Mentra live glasses and its appropriate app configured with the glasses.

# How it works
- gemini-button-test gives ai a custom prompt and location and turns it into a navigation tool that spits out an answer using a button that fires up the navigation system
- navigation.ts and the other directions work as a working integration of google maps with a small alert feature
- integrated with roboflow to detect obstacles in the way

# Other notes
- starting and ending location is hardcoded right now for ease of testing
