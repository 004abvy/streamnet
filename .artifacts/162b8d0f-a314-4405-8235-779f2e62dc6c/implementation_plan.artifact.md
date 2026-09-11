# Implementation Plan - Fix Direct Stream Issues

This plan addresses three main issues in the direct streaming functionality:
1. Default language and subtitles are not English (they are currently Italian).
2. Switching between streams is slow.
3. The player enters an "auto-refresh" loop in some cases.

## Proposed Changes

### [Component Name] Video Player Logic

#### [MODIFY] [HlsPlayer.tsx](file:///C:/Users/abdul/OneDrive/Desktop/movie-streaming-platform/components/HlsPlayer.tsx)
- Update source sorting logic to prioritize English audio by default (unless Hindi is preferred).
- Set English subtitles as `default: true` in the Vidstack tracks list.
- Add a cooldown or limit to automatic source switching in `handleInvalidDuration` to prevent refresh loops.
- Optimize the background probing to ensure faster switching by checking `isWorking` status before attempting a switch.

#### [MODIFY] [VidstackPlayer.tsx](file:///C:/Users/abdul/OneDrive/Desktop/movie-streaming-platform/components/VidstackPlayer.tsx)
- Ensure the `MediaPlayer` is configured to handle the default subtitle track correctly.

## Verification Plan

### Automated Tests
- Not applicable for this UI/UX fix, will rely on manual verification.

### Manual Verification
1. Open a movie with direct streams.
2. Verify that English subtitles are selected by default.
3. Verify that the audio track is English (if available in the stream).
4. Switch between streams and observe if the loading time is improved.
5. Simulate an invalid duration (e.g., by mocking a short stream) and verify that it doesn't loop infinitely.
