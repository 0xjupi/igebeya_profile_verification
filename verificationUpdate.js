document.getElementById('loading-overlay').style.display = 'flex';

// Import and initialize face API
import {faceapi, loadFaceAPIModels} from './faceapi-module.js';

// After models are loaded, hide the overlay
loadFaceAPIModels().then(() => {
    document.getElementById('loading-overlay').style.display = 'none';
}).catch(error => {
    alert(error);
    console.error('Error loading face API models:', error);
    document.getElementById('loading-overlay').style.display = 'none';
});


const tg = window.Telegram.WebApp;
// const platform = tg.platform;
// alert(platform);
const chatId = tg.initDataUnsafe.user.id;

// Track page history
function updatePageHistory(pageName) {
    // Retrieve existing history from localStorage or initialize an empty array
    let pageHistory = JSON.parse(localStorage.getItem('pageHistory')) || [];

    // Add the current page to the history
    pageHistory.push(pageName);

    // Save the updated history back to localStorage
    localStorage.setItem('pageHistory', JSON.stringify(pageHistory));
}

updatePageHistory('verificationUpdate.html');

function getPageHistory() {
    return JSON.parse(localStorage.getItem('pageHistory')) || [];
}

let pageHistory = getPageHistory();

// Notification badge
function showNotification(message, type = 'success', position = 'top') {
    // Check if a notification already exists
    if (position === 'center') {
        let existingNotification = document.getElementById('notification-badge');
        if (existingNotification) {
            existingNotification.remove(); // Remove the old notification
        }

        // Create the notification element
        const notification = document.createElement('div');
        notification.id = 'notification-badge';
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Append the notification to the body
        document.body.appendChild(notification);

        // Set a timeout to remove the notification after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    } else {
        let existingNotification = document.getElementById('notification-badge-top');
        if (existingNotification) {
            existingNotification.remove(); // Remove the old notification
        }

        // Create the notification element
        const notification = document.createElement('div');
        notification.id = 'notification-badge-top';
        notification.className = `notification-top ${type}`;
        notification.textContent = message;

        // Append the notification to the body
        document.body.appendChild(notification);

        // Set a timeout to remove the notification after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadFaceAPIModels();
    let livenessCheckInProgress = false;
    const maxImageWidth = 1280;
    const maxImageHeight = 800;

    const dropdown = document.getElementById('document-dropdown-trigger');
    const documentList = document.getElementById('document-list');
    const selectedDocument = document.getElementById('selected-document');
    const documentTypeInput = document.getElementById('document-type');
    const passportSection = document.querySelector('.passport');
    const faydaSection = document.querySelector('.fayda');
    const submitBtn = document.getElementById('submit-btn');
    const container = document.querySelector('.container');
    const barContainer = document.querySelector('.bar-container');

    // Camera elements
    const cameraOverlay = document.getElementById('camera-overlay');
    const video = document.getElementById('camera-video');
    const cameraLabel = document.getElementById('camera-label');
    const canvas = document.getElementById('capture-canvas');
    const captureBtn = document.getElementById('take-photo');
    const cancelBtn = document.getElementById('cancel-capture');

    // Capture buttons
    const passportCaptureBtn = document.getElementById('passport-capture-btn');
    const idFrontCaptureBtn = document.getElementById('id-front-capture-btn');
    const idBackCaptureBtn = document.getElementById('id-back-capture-btn');
    const selfieCaptureBtn = document.getElementById('selfie-capture-btn');

    // Retake buttons
    const passportRetakeBtn = document.getElementById('passport-retake-btn');
    const idFrontRetakeBtn = document.getElementById('id-front-retake-btn');
    const idBackRetakeBtn = document.getElementById('id-back-retake-btn');
    const selfieRetakeBtn = document.getElementById('selfie-retake-btn');

    // Preview elements
    const passportPreview = document.getElementById('passport-preview');
    const idFrontPreview = document.getElementById('id-front-preview');
    const idBackPreview = document.getElementById('id-back-preview');
    const livePreview = document.getElementById('live-preview');

    // Verification footer
    const verificationFooter = document.querySelector('.verification-footer');

    // Current capture target
    let currentCaptureTarget = null;
    let stream = null;

    // Notification cooldown timing when no face detected
    let lastNotificationTime = 0;
    const notificationCooldown = 3000; // 3 seconds


    // Handle back button click event
    tg.onEvent('backButtonClicked', function () {
        // Go to the previous page using Telegram's built-in back button functionality
        if (pageHistory.length > 0) {
            // Navigate back by removing the last page from history
            pageHistory.pop();
            const previousPage = pageHistory.pop();

            // Manually navigate to the previous page. shop, sell, item-details
            // window.location.href = previousPage;

            // If the previous page is home.html, switch to close button
            if (previousPage === 'shop.html') {
                localStorage.removeItem('pageHistory');
                let pageHistory = [];
                pageHistory.push('shop.html')
                localStorage.setItem('pageHistory', JSON.stringify(pageHistory));
                tg.BackButton.hide();
                window.history.back();
            } else {
                window.history.back();
            }
        } else {
            tg.BackButton.hide();
            window.history.back();
        }

    });

    // Step progress indicator functionality
    function updateStepProgress() {
        const documentSelected = documentTypeInput.value !== '';
        const documentComplete = isDocumentSectionComplete();
        const selfieComplete = isSelfieComplete();

        const stepDocument = document.getElementById('step-document');
        const stepSelfie = document.getElementById('step-selfie');
        const stepReview = document.getElementById('step-review');

        const selfieOverlay = document.querySelector(".selfie");
        const passportOverlay = document.querySelector(".passport");
        const faydaOverlay = document.querySelector(".fayda");
        const docOptions = document.querySelector(".doc-type-options");

        // Document step
        if (documentSelected) {
            stepDocument.classList.add('active');
            if (documentComplete) {
                const firstStep = document.querySelector('.step:first-child');

                if (firstStep) {
                    const stepLine = firstStep.querySelector('.step-line');
                    if (stepLine) {
                        stepLine.style.backgroundColor = '#10b981';
                    }
                }

                stepDocument.classList.add('completed');
                stepSelfie.classList.add('active');

                docOptions.classList.add('hidden');
                selfieOverlay.classList.remove('hidden');
            }
        } else {
            stepDocument.classList.add('active');
            stepDocument.classList.remove('completed');
            stepSelfie.classList.remove('active');
        }

        // Selfie step
        if (selfieComplete && documentComplete) {
            const secondStep = document.querySelector('.step:nth-child(2)');

            if (secondStep) {
                const stepLine = secondStep.querySelector('.step-line');
                if (stepLine) {
                    stepLine.style.backgroundColor = '#10b981';
                }
            }
            stepSelfie.classList.add('completed');
            stepReview.classList.add('active');

        } else {
            stepSelfie.classList.remove('completed');
            stepReview.classList.remove('active');
        }
    }

    function isDocumentSectionComplete() {
        const documentType = documentTypeInput.value;
        if (documentType === 'Passport') {
            if (document.getElementById('passport-preview').style.display !== 'none') {
                passportCaptureBtn.classList.add('hidden');
                passportRetakeBtn.classList.remove('hidden');
            }
            return document.getElementById('passport-preview').style.display !== 'none';
        } else if (documentType === 'Fayda') {
            if (document.getElementById('id-front-preview').style.display !== 'none') {
                !idFrontCaptureBtn.classList.contains('hidden') ? idFrontCaptureBtn.classList.add('hidden') : null;
                idFrontRetakeBtn.classList.remove('hidden');
            }
            if (document.getElementById('id-back-preview').style.display !== 'none') {
                !idBackCaptureBtn.classList.contains('hidden') ? idBackCaptureBtn.classList.add('hidden') : null;
                idBackRetakeBtn.classList.remove('hidden');
            }
            return document.getElementById('id-front-preview').style.display !== 'none' &&
                document.getElementById('id-back-preview').style.display !== 'none';
        }
        return false;
    }

    function isSelfieComplete() {
        if (document.getElementById('live-preview').style.display !== 'none') {
            selfieCaptureBtn.classList.add('hidden');
            selfieRetakeBtn.classList.remove('hidden');
        }
        return document.getElementById('live-preview').style.display !== 'none';
    }

    // Update document selection styling
    const documentDropdown = document.getElementById('document-dropdown-trigger');
    if (documentDropdown) {
        documentDropdown.addEventListener('click', function () {
            const docList = document.getElementById('document-list');
            document.getElementById('fas_arrow').classList.toggle('fa-chevron-down');
            document.getElementById('fas_arrow').classList.toggle('fa-chevron-up');
            docList.classList.contains("hidden") ? docList.classList.remove('hidden') : docList.classList.add('hidden');
        });
    }

    // Add event listener to document list
    documentList.addEventListener('click', function (e) {
        if (e.target.tagName === 'LI') {
            const docType = e.target.getAttribute('data-document');
            selectedDocument.textContent = e.target.textContent;
            documentTypeInput.value = docType;
            documentList.classList.add('hidden');
        }
    });

    // Add observer for document selection changes
    if (documentTypeInput) {
        const observer = new MutationObserver(function (mutations) {
            updateStepProgress();

            // Add animation to the selected document section
            const documentType = documentTypeInput.value;
            const fayda = document.querySelector('.fayda');
            const pass = document.querySelector('.passport');
            if (documentType === 'Passport') {
                pass.classList.remove('hidden');
                !fayda.classList.contains("hidden") ? fayda.classList.add('hidden') : null;
                pass.classList.add('active');
            } else if (documentType === 'Fayda') {
                fayda.classList.remove('hidden');
                !pass.classList.contains("hidden") ? pass.classList.add('hidden') : null;
                fayda.classList.add('active');
            }
        });

        observer.observe(documentTypeInput, {attributes: true});
    }

    // // Enhance image preview handling
    // const previewImages = document.querySelectorAll('.preview');
    // previewImages.forEach(img => {
    //     img.addEventListener('load', function () {
    //         if (this.src && this.src !== '#') {
    //             const section = this.closest('.passport-bio, .fayda-front, .fayda-back, .selfie');
    //             if (section) {
    //                 section.classList.add('completed');
    //                 updateStepProgress();
    //             }
    //         }
    //     });
    // });

    // // Add observer for submit button status
    // const submitBtn = document.getElementById('submit-btn');
    // if (submitBtn) {
    //     const observer = new MutationObserver(function (mutations) {
    //         if (!submitBtn.disabled) {
    //             submitBtn.classList.add('active');
    //         } else {
    //             submitBtn.classList.remove('active');
    //         }
    //     });
    //
    //     observer.observe(submitBtn, {attributes: true});
    // }

    // Initialize the step progress
    updateStepProgress();

    async function validateLivenessTaskFrontend(task) {
        const videoElement = document.getElementById("camera-video");
        const tasks = {
            // "Blink your eyes": checkBlink,
            // "Turn your head to the left": checkHeadTurnLeft,
            // "Turn your head to the right": checkHeadTurnRight,
            "Open your mouth": checkMouthOpen
        };

        // Clear any existing interval
        if (window.livenessCheckInterval) {
            clearInterval(window.livenessCheckInterval);
        }

        // Remove any existing 'play' event listener
        if (window.livenessPlayHandler) {
            videoElement.removeEventListener('play', window.livenessPlayHandler);
        }

        // Create a named handler function
        window.livenessPlayHandler = async () => {
            const canvasFaceAPI = faceapi.createCanvasFromMedia(videoElement);
            // document.body.append(canvas); // Optional: Debugging overlay

            const displaySize = {
                width: videoElement.videoWidth,
                height: videoElement.videoHeight
            };

            // Ensure we have valid dimensions before continuing
            if (displaySize.width === 0 || displaySize.height === 0) {
                console.error("Video dimensions not available yet");
                return;
            }

            faceapi.matchDimensions(canvasFaceAPI, displaySize);

            let taskCompleted = false;

            // Store the interval in the global variable
            window.livenessCheckInterval = setInterval(async () => {
                const detections = await faceapi.detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks(); // Get facial landmarks

                // If no face is detected, skip processing
                if (!detections) {
                    console.log("No face detected");
                    const currentTime = Date.now();
                    if (currentTime - lastNotificationTime > notificationCooldown) {
                        const errorMessages = [
                            "Position your face is inside the circle.",
                            "Make sure your face is well lit.",
                        ];

                        // Randomly select one message
                        const randomMessage = errorMessages[Math.floor(Math.random() * errorMessages.length)];

                        // Show randomly selected notification
                        showNotification(randomMessage, "error", "center");

                        // Update the last notification time
                        lastNotificationTime = currentTime;
                    }

                    livenessCheckInProgress = false;
                    return;
                }

                const resizedDetections = faceapi.resizeResults(detections, displaySize);

                // Complete the specified liveness task
                if (tasks[task]) {
                    console.log(`Checking task: ${task}`);
                    taskCompleted = tasks[task](resizedDetections.landmarks);
                }

                // Stop checking once task is completed
                if (taskCompleted) {
                    document.getElementById('camera-helper-text').textContent = '👇';
                    // Clear any existing interval
                    if (window.livenessCheckInterval) {
                        clearInterval(window.livenessCheckInterval);
                        window.livenessCheckInterval = null;
                    }

                    // Remove any existing 'play' event listener
                    if (window.livenessPlayHandler) {
                        videoElement.removeEventListener('play', window.livenessPlayHandler);
                        window.livenessPlayHandler = null;
                    }

                    // Reset the liveness check status
                    livenessCheckInProgress = false;

                    console.log(`Task completed: ${task}`);
                    showNotification("Task completed! You May Take a Selfie Now.", "popupSuccess", "center");
                    captureBtn.classList.remove("hidden");
                }
            }, 500);
        };

        // Add the new event listener
        videoElement.addEventListener('play', window.livenessPlayHandler);
    }

    // Check specific task
    // function checkBlink(landmarks) {
    //     // Get the eye height coordinates
    //     const leftEye = landmarks.getLeftEye();
    //     const rightEye = landmarks.getRightEye();
    //
    //     // Calculate the eye openness based on vertical/horizontal distance ratio
    //     const leftOpenness = getEyeOpenness(leftEye);
    //     const rightOpenness = getEyeOpenness(rightEye);
    //
    //     // Define threshold for blinking (eyes must be "closed")
    //     return leftOpenness < 0.25 && rightOpenness < 0.25;
    // }

    // function getEyeOpenness(eye) {
    //     const vertical = dist(eye[1], eye[5]) + dist(eye[2], eye[4]); // Vertical eye distance
    //     const horizontal = dist(eye[0], eye[3]);                     // Horizontal eye distance
    //     return vertical / (2 * horizontal);                         // Openness ratio
    // }

    // function checkSmile(landmarks) {
    //     const mouth = landmarks.getMouth();
    //     const lipDistance = dist(mouth[13], mouth[19]);  // Vertical lip distance (open)
    //     const lipWidth = dist(mouth[0], mouth[6]);      // Horizontal lip distance (width)
    //     return lipDistance / lipWidth > 0.3;            // Smile when lips stretch wide enough
    // }

    // function checkHeadTurnLeft(landmarks) {
    //     // Compare the x-coordinates of key face landmarks to track head turning
    //     const nose = landmarks.getNose();
    //     const leftEye = landmarks.getLeftEye();
    //     const rightEye = landmarks.getRightEye();
    //
    //     // Turning left when nose is closer to right eye than to left eye
    //     return nose[0].x > rightEye[0].x;
    // }
    //
    // function checkHeadTurnRight(landmarks) {
    //     const nose = landmarks.getNose();
    //     const leftEye = landmarks.getLeftEye();
    //     const rightEye = landmarks.getRightEye();
    //
    //     // Turning right when nose is closer to left eye than to right eye
    //     return nose[0].x < leftEye[0].x;
    // }

    function checkMouthOpen(landmarks) {
        const mouth = landmarks.getMouth();
        const mouthOpenRatio = dist(mouth[13], mouth[19]) / dist(mouth[0], mouth[6]);
        return mouthOpenRatio > 0.5;
    }

    // Helper function to calculate distance
    function dist(point1, point2) {
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Initialize camera access
    async function initCamera() {
        try {
            // Stop any existing stream
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            // Request camera access with preferred settings
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: currentCaptureTarget === 'selfie' ? 'user' : 'environment',
                    width: {ideal: 1920},
                    height: {ideal: 1080}
                }
            });

            video.srcObject = stream;

            // Apply horizontal flip for selfie mode
            if (currentCaptureTarget === 'selfie') {
                video.style.transform = 'scaleX(-1)';
            } else {
                video.style.transform = 'scaleX(1)';
            }

            // Set video dimensions for proper aspect ratio after metadata is loaded
            video.onloadedmetadata = () => {
                const videoAspect = video.videoWidth / video.videoHeight;
                const containerWidth = document.querySelector('.camera-container').offsetWidth;
                video.style.height = (containerWidth / videoAspect) + 'px';
            };
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Could not access camera. Please ensure camera permissions are granted.');
        }
    }

    // Function to resize an image
    // function resizeImage(imageSource, maxWidth, maxHeight, quality, callback) {
    //     // Create a new image from the data URL
    //     const img = new Image();
    //
    //     img.onload = function () {
    //         // Create a canvas for resizing
    //         const canvas = document.createElement('canvas');
    //
    //         // Calculate new dimensions while maintaining aspect ratio
    //         let width = img.width;
    //         let height = img.height;
    //
    //         if (width > maxWidth) {
    //             height = Math.round(height * (maxWidth / width));
    //             width = maxWidth;
    //         }
    //
    //         if (height > maxHeight) {
    //             width = Math.round(width * (maxHeight / height));
    //             height = maxHeight;
    //         }
    //
    //         // Set canvas dimensions
    //         canvas.width = width;
    //         canvas.height = height;
    //
    //         // Draw the resized image on canvas
    //         const ctx = canvas.getContext('2d');
    //         ctx.drawImage(img, 0, 0, width, height);
    //
    //         // Convert canvas to blob
    //         canvas.toBlob(function (blob) {
    //             callback(blob);
    //         }, 'image/jpeg', quality);
    //     };
    //
    //     // Set the source of the image to the data URL
    //     img.src = imageSource;
    // }

    // FUnctio to crop
    function cropImage(imageSource, cropWidth, cropHeight, quality, callback) {
        // Create a new image from the data URL
        const img = new Image();

        img.onload = function () {
            // Create a canvas for cropping
            const canvas = document.createElement('canvas');

            // Set canvas dimensions to the crop size
            canvas.width = cropWidth;
            canvas.height = cropHeight;

            // Calculate the center of the image
            const sourceX = Math.max(0, (img.width - cropWidth) / 2);
            const sourceY = Math.max(0, (img.height - cropHeight) / 2);

            // Draw only the portion we want to keep (center crop)
            const ctx = canvas.getContext('2d');
            ctx.drawImage(
                img,
                sourceX, sourceY,
                cropWidth, cropHeight,
                0, 0,
                cropWidth, cropHeight
            );

            // Convert canvas to blob
            canvas.toBlob(function (blob) {
                callback(blob);
            }, 'image/jpeg', quality);
        };

        // Set the source of the image to the data URL
        img.src = imageSource;
    }

    // Function to rotate crop image
    function rotateAndCropImage(imageSource, cropWidth, cropHeight, quality, callback) {
        // Create a new image from the data URL
        const img = new Image();

        img.onload = function () {
            // Create a canvas for rotating and cropping
            const canvas = document.createElement('canvas');

            // For 90 degrees counterclockwise rotation, we need to swap width and height
            // and ensure our canvas is large enough for the rotated image
            canvas.width = cropWidth;
            canvas.height = cropHeight;

            const ctx = canvas.getContext('2d');

            // First we'll create a temporary canvas for rotation
            const rotationCanvas = document.createElement('canvas');
            // Swap width and height for the rotation
            rotationCanvas.width = img.height;
            rotationCanvas.height = img.width;
            const rotationCtx = rotationCanvas.getContext('2d');

            // Rotate 90 degrees counterclockwise
            rotationCtx.translate(0, img.width);
            rotationCtx.rotate(-Math.PI / 2);
            rotationCtx.drawImage(img, 0, 0);

            // Now crop from the rotated image
            // Calculate the center of the rotated image
            const sourceX = Math.max(0, (rotationCanvas.width - cropWidth) / 2);
            const sourceY = Math.max(0, (rotationCanvas.height - cropHeight) / 2);

            // Draw only the portion we want to keep (center crop) from the rotated image
            ctx.drawImage(
                rotationCanvas,
                sourceX, sourceY,
                cropWidth, cropHeight,
                0, 0,
                cropWidth, cropHeight
            );

            // Convert canvas to blob
            canvas.toBlob(function (blob) {
                callback(blob);
            }, 'image/jpeg', quality);
        };

        // Set the source of the image to the data URL
        img.src = imageSource;
    }


    // Handle capture button clicks
    passportCaptureBtn.addEventListener('click', () => startCapture('passport'));
    idFrontCaptureBtn.addEventListener('click', () => startCapture('id-front'));
    idBackCaptureBtn.addEventListener('click', () => startCapture('id-back'));
    selfieCaptureBtn.addEventListener('click', () => startCapture('selfie'));

    // Handle retake button clicks
    passportRetakeBtn.addEventListener('click', () => startCapture('passport'));
    idFrontRetakeBtn.addEventListener('click', () => startCapture('id-front'));
    idBackRetakeBtn.addEventListener('click', () => startCapture('id-back'));
    selfieRetakeBtn.addEventListener('click', () => startCapture('selfie'));


    function startCapture(target) {
        currentCaptureTarget = target;
        const cameraGuide = document.getElementById('camera-guide');
        const helperText = document.getElementById('camera-helper-text');

        // Remove existing classes
        cameraGuide.innerHTML = ``;
        cameraGuide.classList.remove('camera-guide-circle'); // 'camera-guide-rect',

        // Liveness tasks definition
        const livenessTasks = [
            // "Blink your eyes",
            // "Turn your head to the left",
            // "Turn your head to the right",
            "Open your mouth"
        ];

        const randomTask = livenessTasks[Math.floor(Math.random() * livenessTasks.length)];

        // Set appropriate label and guide style
        switch (target) {
            case 'passport':
                captureBtn.classList.contains("hidden") ? captureBtn.classList.remove("hidden") : null;
                cameraLabel.textContent = 'Capture Passport Bio Page';
                // cameraGuide.classList.add('camera-guide-passport');
                const passGuide = document.createElement("div");
                passGuide.classList.add("camera-guide-passport");

                passGuide.innerHTML = `
                    <span class="photo-label">Photo</span>
                    <span class="mrz-label">MRZ</span>
                    <div class="mrz-area">
                        <P>
                            P&lt;ETHABEBEBE&lt;&lt;BESO&lt;BELA&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
                            EP00000000ETH000000M000000&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;00
                        </P>
                    </div>`;
                cameraGuide.appendChild(passGuide);
                helperText.textContent = 'Position your passport within the frame';
                break;
            case 'id-front':
                captureBtn.classList.contains("hidden") ? captureBtn.classList.remove("hidden") : null;
                cameraLabel.textContent = 'Capture ID Front Side';
                // cameraGuide.classList.add('camera-guide-rect');
                const idFrontGuide = document.createElement("div");
                idFrontGuide.classList.add("camera-guide-id-front");

                idFrontGuide.innerHTML = `
                    <div class="id-label-1"></div>
                    <div class="id-label-2"></div>
                    <div class="id-label-3"></div>
                    `;
                cameraGuide.appendChild(idFrontGuide);
                helperText.textContent = 'Position your ID Front within the frame';
                break;
            case 'id-back':
                captureBtn.classList.contains("hidden") ? captureBtn.classList.remove("hidden") : null;
                cameraLabel.textContent = 'Capture ID Back Side';
                // cameraGuide.classList.add('camera-guide-rect');
                const idBackGuide = document.createElement("div");
                idBackGuide.classList.add("camera-guide-id-back");

                idBackGuide.innerHTML = `
                    <div class="id-back-label-1"></div>
                    <div class="id-back-label-2"></div>
                    `;
                cameraGuide.appendChild(idBackGuide);
                helperText.textContent = 'Position your ID Back within the frame';
                break;
            case 'selfie':
                animateBars();
                // cameraLabel.textContent = 'Capture Your Selfie';
                captureBtn.classList.contains("hidden") ? null : captureBtn.classList.add("hidden");
                cameraGuide.classList.add('camera-guide-circle');
                // helperText.textContent = 'Position your face within the circle';

                helperText.textContent = `Please ${randomTask}`;
                showNotification(`PLease ${randomTask}`, "success", "center");
                // captureBtn.style.display = "none";

                break;
        }

        // Show camera overlay
        cameraOverlay.classList.remove('hidden');

        // Initialize camera
        initCamera();

        if (target === 'selfie') {
            if (!livenessCheckInProgress) {
                console.log(`Starting liveness check...${target}`);
                livenessCheckInProgress = true;
                validateLivenessTaskFrontend(randomTask);
            }
        }

    }

    // Images resized
    let passportImageResized = null;
    let idFrontImageResized = null;
    let idBackImageResized = null;
    let liveImageResized = null;

    // Handle capture photo button
    captureBtn.addEventListener('click', () => {
        barContainer.innerHTML = '';
        // Clear any existing interval
        if (window.livenessCheckInterval) {
            // console.log("Clearing interval");
            clearInterval(window.livenessCheckInterval);
            window.livenessCheckInterval = null;
        }

        // Remove any existing 'play' event listener
        if (window.livenessPlayHandler) {
            // console.log("Removing play handler");
            document.getElementById("camera-video").removeEventListener('play', window.livenessPlayHandler);
            window.livenessPlayHandler = null;
        }

        // Reset the liveness check status
        livenessCheckInProgress = false;

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas (flipping horizontally if it's a selfie)
        const ctx = canvas.getContext('2d');
        if (currentCaptureTarget === 'selfie') {
            ctx.scale(-1, 1);
            ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
            ctx.scale(-1, 1);
        } else {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        // Get image data from canvas
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);

        let containerSelector;

        switch (currentCaptureTarget) {
            case 'passport':
                rotateAndCropImage(imageDataUrl, maxImageWidth, maxImageHeight, 0.8, (blob) => {
                    passportImageResized = blob;
                    passportPreview.src = URL.createObjectURL(blob);
                });

                passportPreview.style.display = 'block';
                containerSelector = '.passport';
                break;
            case 'id-front':
                rotateAndCropImage(imageDataUrl, maxImageWidth, maxImageHeight, 0.8, (blob) => {
                    idFrontImageResized = blob;
                    idFrontPreview.src = URL.createObjectURL(blob);
                });

                idFrontPreview.style.display = 'block';
                containerSelector = '.fayda-front';
                break;
            case 'id-back':
                rotateAndCropImage(imageDataUrl, maxImageWidth, maxImageHeight, 0.8, (blob) => {
                    idBackImageResized = blob;
                    idBackPreview.src = URL.createObjectURL(blob);
                });

                idBackPreview.style.display = 'block';
                containerSelector = '.fayda-back';
                break;
            case 'selfie':
                cropImage(imageDataUrl, 1080, maxImageHeight, 0.8, (blob) => {
                    liveImageResized = blob;
                    livePreview.src = URL.createObjectURL(blob);
                });

                livePreview.style.display = 'block';
                containerSelector = '.selfie';
                break;
        }

        if (containerSelector) {
            // Update checkmark elements inside the specific container
            const container = document.querySelector(containerSelector);
            if (container) {
                // Hide red mark and show green mark
                const redMark = container.querySelector(".check-mark-red");
                const greenMark = container.querySelector(".check-mark-green");
                // const bgMark = container.querySelector(".check-mark-bg");

                if (redMark) redMark.style.display = "none";
                if (greenMark) greenMark.style.display = "block";
                // if (bgMark) bgMark.style.border = "1px solid lightgreen";
            }
        }


        // Stop camera stream and hide overlay
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        cameraOverlay.classList.add('hidden');

        // Check if form is complete
        checkFormCompletion();
        updateStepProgress();
    });

    // Handle cancel button
    cancelBtn.addEventListener('click', () => {
        barContainer.innerHTML = '';
        // Clear any existing interval
        if (window.livenessCheckInterval) {
            console.log("Clearing interval");
            clearInterval(window.livenessCheckInterval);
            window.livenessCheckInterval = null;
        }

        // Remove any existing 'play' event listener
        if (window.livenessPlayHandler) {
            console.log("Removing play handler");
            document.getElementById("camera-video").removeEventListener('play', window.livenessPlayHandler);
            window.livenessPlayHandler = null;
        }

        // Reset the liveness check status
        livenessCheckInProgress = false;

        // Stop camera stream and hide overlay
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        cameraOverlay.classList.add('hidden');
    });

    // Check if all required fields are completed
    function checkFormCompletion() {
        const docType = documentTypeInput.value;
        let isComplete = false;

        if (docType === 'Passport') {
            isComplete = passportPreview.style.display !== 'none' &&
                livePreview.style.display !== 'none';
        } else if (docType === 'Fayda') {
            isComplete = idFrontPreview.style.display !== 'none' &&
                idBackPreview.style.display !== 'none' &&
                livePreview.style.display !== 'none';
        }

        submitBtn.disabled = !isComplete;
    }


    const numBars = 60;
    const radius = 100;
    const minBarLength = 15;
    const maxBarLength = 25;

    function createBars() {

        // Create bars around the circle
        for (let i = 0; i < numBars; i++) {
            const angle = (i * 2 * Math.PI) / numBars;
            const bar = document.createElement('div');
            bar.className = 'bar';

            // Position and rotate each bar to make it perpendicular to the circle
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            bar.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px) rotate(${angle + Math.PI / 2}rad)`;

            barContainer.appendChild(bar);
        }
    }

    // Animate the bars to create a wave effect
    function animateBars() {
        createBars();
        const bars = document.querySelectorAll('.bar');
        bars.forEach((bar, index) => {
            // Create a delayed wave effect
            setTimeout(() => {
                startBarAnimation(bar, index);
            }, index * 70);
        });
    }

    function startBarAnimation(bar, index) {
        let time = 0;
        const speed = 0.005;
        const animate = () => {
            // Calculate wave pattern using sine function
            const wave = Math.sin(time + (index * 0.2));
            const normalizedWave = (wave + 1) / 2; // Convert from -1,1 to 0,1 range

            // Apply length change
            const barLength = minBarLength + normalizedWave * (maxBarLength - minBarLength);
            bar.style.height = `${barLength}px`;

            // Apply color change
            const green = Math.floor(normalizedWave * 200);
            bar.style.backgroundColor = `rgb(100, ${green}, 100)`;

            time += speed;
            requestAnimationFrame(animate);
        };

        animate();
    }

    // Handle submit button
    submitBtn.addEventListener('click', async function () {
        try {
            // Get document type (passport or fayda)
            const docType = documentTypeInput.value;

            // loading state
            submitBtn.querySelector('.spinner').classList.add('active');
            submitBtn.disabled = true;
            submitBtn.querySelector('.btn-text').textContent = 'Processing...';

            // Send data to backend
            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append('documentType', docType);

            if (docType === 'Fayda') {
                formData.append('idFrontImage', idFrontImageResized, 'id_front.jpg');
                formData.append('idBackImage', idBackImageResized, 'id_back.jpg');
            } else if (docType === 'Passport') {
                formData.append('passportImage', passportImageResized, 'passport.jpg');
            }
            formData.append('selfieImage', liveImageResized, 'selfie.jpg');


            const response = await fetch('/api/verify_identity', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem(`jwt_token_${chatId}`)}`
                },
                body: formData,
            });

            const result = await response.json();
            if (result.status === 'success') {
                submitBtn.querySelector('.spinner').classList.remove('active');
                submitBtn.querySelector('.btn-text').textContent = 'Submitted';
                showNotification("Your identity verification is under process!", "popupSuccess", "top");
                setTimeout(() => {
                    window.location.href = "/profile_new.html"
                }, 3000);

            } else if (result?.detail === "Token has expired") {
                fetch(`/api/user_login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({chatId: window.Telegram.WebApp.initDataUnsafe.user.id, action: "logout"})
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === "success") {
                            // alert("Logged Out!");
                            // showNotification("Logged out!", "success");
                            window.location.href = "/login.html";

                        } else {
                            // alert("Something went wrong!");
                            showNotification("You need to restart iGebeya mini app!", "error");
                        }

                    })
                    .catch((error) => {
                        console.error('Error:', error);
                    });
                return;
            } else {
                submitBtn.querySelector('.spinner').classList.remove('active');
                submitBtn.querySelector('.btn-text').textContent = 'Submit';
                submitBtn.disabled = false;
                showNotification("Something went wrong, try again!", "popupError", "top");
            }
        } catch (error) {
            console.error("Verification error:", error);
            submitBtn.querySelector('.spinner').classList.remove('active');
            submitBtn.querySelector('.btn-text').textContent = 'Submit';
            submitBtn.disabled = false;
            showNotification("Error during verification, try again!", "popupError", "top");
        }

    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
        if (!dropdown.contains(e.target) && !documentList.contains(e.target)) {
            documentList.classList.add('hidden');
        }
    });

    verificationFooter.addEventListener('click', () => {
        alert(
            `
        101-verify is a kyc and user verification service
        currently working only as a partner with iGebeya Ethiopia.
        Soon it will be available to other business owners in Ethiopia.
        `);
    });

    // Add event listeners on image preview clicks
    // Open modal when main image is clicked
    passportPreview.addEventListener('click', () => {
        const modal = document.getElementById("image-modal");
        const modalImage = document.getElementById("modal-image");
        document.body.classList.add("no-scroll");
        modal.style.display = "block";
        modalImage.src = passportPreview.src;
    });

    idFrontPreview.addEventListener('click', () => {
        const modal = document.getElementById("image-modal");
        const modalImage = document.getElementById("modal-image");
        document.body.classList.add("no-scroll");
        modal.style.display = "block";
        modalImage.src = idFrontPreview.src;
    });

    idBackPreview.addEventListener('click', () => {
        const modal = document.getElementById("image-modal");
        const modalImage = document.getElementById("modal-image");
        document.body.classList.add("no-scroll");
        modal.style.display = "block";
        modalImage.src = idBackPreview.src;
    });

    livePreview.addEventListener('click', () => {
        const modal = document.getElementById("image-modal");
        const modalImage = document.getElementById("modal-image");
        document.body.classList.add("no-scroll");
        modal.style.display = "block";
        modalImage.src = livePreview.src;
    });

    // Close modal when the close button is clicked
    const closeModal = document.querySelector(".modal .close");
    closeModal.addEventListener('click', () => {
        document.body.classList.remove("no-scroll");
        const modal = document.getElementById("image-modal");
        modal.style.display = "none";
    });

    // Close modal when clicking outside of the modal content
    window.addEventListener('click', (event) => {
        const modal = document.getElementById("image-modal");
        if (event.target === modal) {
            document.body.classList.remove("no-scroll");
            modal.style.display = "none";
        }
    });


});