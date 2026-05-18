# PhotoClean - AI Photo Cleaner for iOS

A polished, elegant iOS app that helps you effortlessly declutter your photo library through swipe-to-decide interactions and AI-powered photo selection.

## Features

- **Instant Camera Roll Access** — One-tap permission grants full access to your entire photo library. No manual uploads needed.
- **Swipe-to-Decide** — Tinder-style card stack. Swipe right to keep, swipe left to trash. Haptic feedback on every action.
- **AI Prompt Selection** — Type a description (e.g., "blurry photos", "screenshots") and the AI identifies matching photos for batch review.
- **Quick Clean Presets** — One-tap buttons for common cleanup categories: Blurry, Screenshots, Duplicates, Memes, Receipts.
- **Select All & Batch Actions** — Long-press to enter select mode, tap "Select All" to grab everything, then batch keep/trash/reset.
- **Trash with Verification** — Photos marked for deletion go to a trash bin. "Clean Up" moves them to iOS Recently Deleted (30-day recovery).
- **Session Summary** — After reviewing all pending photos, see a recap of kept vs. trashed and storage freed.
- **Progress Ring** — Visual motivator showing what percentage of your library has been reviewed.
- **Storage Savings Tracker** — Always visible count and size of space to be freed.
- **Undo Support** — Undo the last swipe decision instantly.

## Tech Stack

- **React Native** with Expo SDK 55
- **TypeScript** for type safety
- **expo-media-library** for camera roll access and deletion
- **react-native-gesture-handler** & **Animated API** for swipe gestures
- **expo-haptics** for tactile feedback
- **@react-navigation/bottom-tabs** for navigation
- **AsyncStorage** for persisting review state across sessions
- **react-native-svg** for the progress ring

## Design

- **Pine Green** (#1a5c3a) as the primary color
- Clean, professional, and elegant UI
- Mobile-first (iPhone-optimized)
- Smooth animations with physics-based springs

## Getting Started

### Prerequisites

- Node.js 18+
- An [Expo](https://expo.dev) account
- Apple Developer account (for App Store submission)
- macOS with Xcode (for local iOS builds)

### Install Dependencies

```bash
cd photoclean-ios
npm install
```

### Run in Development

```bash
# Start Expo dev server
npx expo start

# Run on iOS Simulator (requires macOS + Xcode)
npx expo run:ios

# Or scan QR code with Expo Go app on your iPhone
```

### Build for App Store

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. **Configure your Apple credentials in `eas.json`:**
   - Replace `YOUR_APPLE_ID@email.com` with your Apple ID
   - Replace `YOUR_APP_STORE_CONNECT_APP_ID` with your app's ASC ID
   - Replace `YOUR_TEAM_ID` with your Apple Developer Team ID

3. **Build for production:**
   ```bash
   eas build --platform ios --profile production
   ```

4. **Submit to App Store:**
   ```bash
   eas submit --platform ios --profile production
   ```

### App Store Submission Checklist

- [ ] Replace `assets/icon.png` with your 1024x1024 app icon
- [ ] Replace `assets/splash-icon.png` with your splash screen graphic
- [ ] Update `app.json` → `ios.bundleIdentifier` to your unique ID
- [ ] Update `eas.json` → `submit.production.ios` with your Apple credentials
- [ ] Prepare App Store screenshots (6.7" and 5.5" required)
- [ ] Write App Store description and keywords
- [ ] Set up App Store Connect listing
- [ ] Configure privacy policy URL (required for photo access)

## Project Structure

```
photoclean-ios/
├── App.tsx                    # Root: navigation, photo context, state management
├── src/
│   └── screens/
│       ├── HomeScreen.tsx     # Dashboard with progress ring and stats
│       ├── SwipeScreen.tsx    # Card stack swipe UI with AI prompt
│       ├── GalleryScreen.tsx  # Grid view with Select All and filters
│       └── TrashScreen.tsx    # Trash bin with Clean Up confirmation
├── app.json                   # Expo config with iOS permissions
├── eas.json                   # EAS Build & Submit config
├── assets/                    # App icons and splash screens
└── package.json
```

## How It Works

1. **Open app** → Automatically requests photo library permission
2. **Permission granted** → Loads ALL photos from camera roll instantly
3. **Swipe view** → Review photos one by one (right = keep, left = trash)
4. **AI prompt** → Type a description to auto-select matching photos
5. **Gallery** → See all photos with status indicators, use Select All for batch actions
6. **Trash** → Review marked photos, tap "Clean Up" to move to Recently Deleted
7. **Photos go to iOS Recently Deleted** → Recoverable for 30 days (standard iOS behavior)

## Privacy

- Photos are **never uploaded** to any server during normal use
- AI analysis (when used) sends photos to the backend API for processing
- No analytics or tracking
- All review state is stored locally on device via AsyncStorage
