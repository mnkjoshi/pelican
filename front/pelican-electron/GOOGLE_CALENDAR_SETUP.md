# Google Calendar OAuth 2.0 Setup Guide

To integrate your Google Calendar with Pelican Command Center, you need to set up Google Calendar API access with OAuth 2.0.

## 🚨 Quick Fix for "App is being tested" Error

If you're getting the "Pelican has not completed the Google verification process" error:

1. **Go to**: [Google Cloud Console](https://console.cloud.google.com/)
2. **Navigate to**: APIs & Services → OAuth consent screen
3. **Scroll down to**: "Test users" section
4. **Click**: "ADD USERS"
5. **Enter**: Your Gmail address
6. **Click**: "SAVE"
7. **Try again**: The authorization should now work!

---

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project" or select an existing project
3. Give your project a name (e.g., "Pelican Calendar Integration")

## Step 2: Enable Google Calendar API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Calendar API"
3. Click on "Google Calendar API" and click "Enable"

## Step 3: Create OAuth 2.0 Client ID

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Desktop application" as the Application type
4. Give it a name (e.g., "Pelican Calendar Desktop")
5. **IMPORTANT**: In the "Authorized redirect URIs" section, add:
   - `http://localhost`
6. Click "Create"
7. Copy the generated Client ID (you've already provided this: 559773972258-805cn3e5p3botos7575bjv21o21c7sir.apps.googleusercontent.com)

## Step 4: Add Yourself as a Test User (IMPORTANT)

Since your OAuth app is unverified, you need to add yourself as a test user:

1. In Google Cloud Console, go to "APIs & Services" > "OAuth consent screen"
2. Scroll down to "Test users" section
3. Click "ADD USERS"
4. Enter your Gmail address (the one you want to access calendar for)
5. Click "SAVE"

**Note**: Only added test users can authorize your app while it's unverified.

## Step 5: Configure Calendar Access

### For Private Calendars (Recommended):
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Desktop application"
4. Copy the Client ID (you already have this)

## Step 6: Your OAuth Client ID is Already Configured

Your `.env` file should already have:
```
GOOGLE_OAUTH_CLIENT_ID=559773972258-805cn3e5p3botos7575bjv21o21c7sir.apps.googleusercontent.com
```

## Step 7: Configure Calendar ID (Optional)

### To use your primary calendar:
- Keep `GOOGLE_CALENDAR_ID=primary` (default)

### To use a specific calendar:
1. Open [Google Calendar](https://calendar.google.com)
2. Click the three dots next to your calendar name
3. Select "Settings and sharing"
4. Copy the "Calendar ID" (looks like an email address)
5. Update your `.env` file:
   ```
   GOOGLE_CALENDAR_ID=your_calendar_id@gmail.com
   ```

## Step 8: No Need to Make Calendar Public

Since you're using OAuth 2.0, your calendar can stay private! The OAuth flow will request permission to access your private calendar data.

## Testing

1. Restart Pelican Command Center
2. The calendar widget should now show your Google Calendar events
3. Check the console for any error messages

## Troubleshooting

### "App is currently being tested" / "Verification process" error:
**This is the most common issue!**

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "OAuth consent screen"
3. Scroll down to "Test users" section
4. Click "ADD USERS"
5. Enter your Gmail address (the one you want to use for calendar access)
6. Click "SAVE"
7. Try the authorization flow again

**Important**: Only email addresses added as test users can authorize unverified apps.

### "OAuth Client ID not configured" error:
- Make sure your `.env` file has the correct client ID
- Restart the application after adding the client ID

### "Calendar not found" error:
- Check your calendar ID is correct
- Make sure you're using the correct Google account

### "Access denied" error:
- Verify your OAuth client ID is correct
- Check that Google Calendar API is enabled in your project
- Ensure you've added yourself as a test user (see above)
- Make sure you're signing in with the correct Google account

### "No events found" error:
- Make sure you have events in your calendar
- Check the date range (shows next 7 days by default)
- Verify you're accessing the correct calendar
- Ensure you granted calendar permissions during OAuth flow

## Security Note

Keep your API key secure:
- Don't commit your `.env` file to version control
- Add `.env` to your `.gitignore` file
- Consider using environment variables in production