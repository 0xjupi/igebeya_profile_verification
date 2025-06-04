// faceapi-module.js
import * as faceapi from 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api';

// Preload models
export async function loadFaceAPIModels() {
    await faceapi.nets.tinyFaceDetector.loadFromUri('/');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/');
    // await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
    console.log('FaceAPI models loaded successfully');
}

// Export the faceapi library for reuse
export { faceapi };
