// Shown when a head-to-toe outfit cannot render because the person is cropped.
// On a phone the fix is to move the camera, not the person.
export const FULL_OUTFIT_FIT_MESSAGE = "Move your phone back to see the full outfit";

// How long to wait for the pose model to finish loading before skipping the
// framing check for this send. The model is ~3MB and cached by the browser, so
// only the very first session pays for the download.
export const POSE_MODEL_LOAD_TIMEOUT_MS = 5000;

// A "cropped" verdict is confirmed on a second camera frame this long after
// the first, so a single bad detection cannot raise the warning.
export const POSE_CONFIRM_DELAY_MS = 200;

// While the warning is up, the camera is re-checked at this interval.
export const POSE_POLL_INTERVAL_MS = 400;

// Consecutive passing polls before the warning comes down. Raising the card
// takes two agreeing frames, so clearing it does too.
export const POSE_CLEAR_CONFIRM_POLLS = 2;

// Normalized y past which a knee counts as out of shot. The bottom edge of the
// frame is y = 1.0. MediaPipe keeps predicting coordinates for landmarks it
// cannot see, so a knee below the frame reads y > 1 — a direct measurement of
// "cropped", which is more reliable than the visibility score.
export const KNEE_IN_FRAME_MAX_Y = 1.0;
