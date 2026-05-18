# PhotoClean iOS — App Store Deployment Guide

This guide walks you through every step from your local machine to a live App Store listing. No prior iOS publishing experience is required.

---

## Prerequisites

Before you begin, make sure you have the following:

| Requirement | Details |
|-------------|---------|
| macOS computer | Required for Xcode and iOS builds |
| Xcode 15+ | Download from the Mac App Store (free) |
| Apple Developer Account | $99/year — enroll at [developer.apple.com/programs](https://developer.apple.com/programs) |
| Node.js 18+ | Install from [nodejs.org](https://nodejs.org) |
| Expo account | Free — sign up at [expo.dev](https://expo.dev) |
| EAS CLI | Installed globally via npm (instructions below) |

---

## Step 1: Set Up Your Apple Developer Account

If you don't already have one:

1. Go to [developer.apple.com/programs](https://developer.apple.com/programs)
2. Click **Enroll** and sign in with your Apple ID
3. Pay the $99/year membership fee
4. Wait for approval (usually 24–48 hours)

Once approved, you'll have access to **App Store Connect** at [appstoreconnect.apple.com](https://appstoreconnect.apple.com).

---

## Step 2: Install EAS CLI and Log In

Open your terminal and run:

```bash
npm install -g eas-cli
eas login
```

When prompted, enter your **Expo account** credentials (not your Apple ID). If you don't have an Expo account, create one at [expo.dev/signup](https://expo.dev/signup).

---

## Step 3: Clone the Repository

```bash
gh repo clone jpillar09/photoclean-ios
cd photoclean-ios
npm install
```

---

## Step 4: Configure Your Apple Credentials

Open `eas.json` and replace the placeholder values:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-actual-email@icloud.com",
      "ascAppId": "1234567890",
      "appleTeamId": "ABCDE12345"
    }
  }
}
```

**Where to find these values:**

| Field | Where to Find It |
|-------|-----------------|
| `appleId` | The email address you use to sign in to your Apple Developer account |
| `appleTeamId` | Go to [developer.apple.com/account](https://developer.apple.com/account) → Membership Details → Team ID |
| `ascAppId` | You'll create this in Step 5 below |

---

## Step 5: Create Your App in App Store Connect

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Click **My Apps** → the **+** button → **New App**
3. Fill in:
   - **Platform:** iOS
   - **Name:** PhotoClean
   - **Primary Language:** English (U.S.)
   - **Bundle ID:** Select "Register a new Bundle ID" if needed, use `com.yourname.photoclean`
   - **SKU:** `photoclean-ios-001` (any unique string)
4. Click **Create**
5. Once created, look at the URL — the number in the URL is your **ascAppId** (e.g., `https://appstoreconnect.apple.com/apps/1234567890` → ascAppId is `1234567890`)

---

## Step 6: Update the Bundle Identifier

Open `app.json` and change the bundle identifier to match what you registered:

```json
"ios": {
  "bundleIdentifier": "com.yourname.photoclean"
}
```

Make sure this matches **exactly** what you entered in App Store Connect.

---

## Step 7: Build for Production

Run the build command:

```bash
eas build --platform ios --profile production
```

**What happens during this step:**

1. EAS will ask you to log in to your Apple Developer account (one time)
2. It will automatically generate signing certificates and provisioning profiles
3. The build runs in the cloud (takes 10–20 minutes)
4. You'll get a link to download the `.ipa` file when complete

If prompted about creating a new iOS Distribution Certificate, select **Yes**.

---

## Step 8: Submit to the App Store

Once the build completes:

```bash
eas submit --platform ios --profile production
```

This uploads your built app directly to App Store Connect. You can also select a specific build:

```bash
eas submit --platform ios --latest
```

---

## Step 9: Complete Your App Store Listing

Go back to [App Store Connect](https://appstoreconnect.apple.com) → Your App → **App Information**:

### Required Fields

| Field | Suggested Value |
|-------|----------------|
| App Name | PhotoClean - AI Photo Cleaner |
| Subtitle | Declutter your camera roll |
| Category | Photo & Video |
| Content Rights | Does not contain third-party content |
| Age Rating | 4+ (no objectionable content) |

### Description (copy this):

> Tired of a cluttered camera roll? PhotoClean makes it effortless to review and clean up your photos.
>
> Swipe right to keep, swipe left to delete — it's that simple. Or let AI do the work: type "blurry photos" or "screenshots" and PhotoClean instantly finds them for you.
>
> Features:
> • Swipe-to-decide interface with haptic feedback
> • AI-powered photo selection — find blurry, duplicate, or unwanted photos instantly
> • Quick Clean presets for common categories
> • Select All for batch operations
> • Safe deletion — photos go to Recently Deleted (recoverable for 30 days)
> • Progress tracking to motivate your cleanup
> • Beautiful, elegant interface designed for speed
>
> Your photos never leave your device during normal use. PhotoClean respects your privacy.

### Keywords (100 characters max):

```
photo cleaner,delete photos,camera roll,cleanup,storage,blurry,duplicates,organize,swipe,AI
```

### Privacy Policy

You'll need a privacy policy URL. You can use a free generator like [privacypolicies.com](https://www.privacypolicies.com) or host a simple page stating:

- Photos are processed locally on-device
- AI analysis (when used) sends photos to a secure server for processing only
- No personal data is collected or sold
- No analytics or tracking

---

## Step 10: Add Screenshots

App Store requires screenshots for at least one device size. You need:

| Device | Required Size |
|--------|--------------|
| iPhone 6.7" (iPhone 15 Pro Max) | 1290 × 2796 px |
| iPhone 5.5" (iPhone 8 Plus) | 1242 × 2208 px |

**How to take screenshots:**

1. Run the app in Xcode Simulator: `npx expo run:ios`
2. In Simulator, go to **File → Screenshot** (or press Cmd+S)
3. Take screenshots of: Home screen, Swipe view, Gallery, AI prompt results, Trash view

You need **3–10 screenshots** per device size.

---

## Step 11: Submit for Review

1. In App Store Connect, go to your app → **App Store** tab
2. Fill in the **Version Information** section
3. Upload your screenshots
4. Under **Build**, select the build you submitted in Step 8
5. Click **Submit for Review**

Apple's review typically takes **24–48 hours**. They'll email you when approved (or if they need changes).

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "No matching provisioning profile" | Run `eas credentials` and let EAS regenerate them |
| Build fails with signing error | Delete old certificates at [developer.apple.com/account/resources/certificates](https://developer.apple.com/account/resources/certificates) and rebuild |
| App rejected for missing privacy description | Make sure `app.json` has the `NSPhotoLibraryUsageDescription` string (already included) |
| App rejected for "Guideline 5.1.1" | Add a privacy policy URL to your App Store listing |

---

## Testing Before Submission

To test on your physical iPhone before submitting:

```bash
# Build a development version
eas build --platform ios --profile development

# Install on your device via QR code (shown after build completes)
```

Or use **TestFlight** for beta testing:

1. Build with `eas build --platform ios --profile production`
2. Submit with `eas submit --platform ios`
3. In App Store Connect, go to **TestFlight** tab
4. Add yourself as an internal tester
5. Download TestFlight app on your iPhone and install the beta

---

## Updating Your App

When you make changes and want to push an update:

1. Bump the version in `app.json`:
   ```json
   "version": "1.1.0"
   ```
2. Build: `eas build --platform ios --profile production`
3. Submit: `eas submit --platform ios`
4. In App Store Connect, create a new version and submit for review

---

## Cost Summary

| Item | Cost |
|------|------|
| Apple Developer Program | $99/year |
| Expo / EAS Build | Free tier includes 30 builds/month |
| Hosting (AI backend) | Already running on aiphotoclean.com |
| **Total to launch** | **$99** |

---

## Quick Reference Commands

```bash
# Install dependencies
npm install

# Run locally in Expo Go
npx expo start

# Run on iOS Simulator
npx expo run:ios

# Build for App Store
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --profile production

# Check build status
eas build:list

# Manage signing credentials
eas credentials
```
