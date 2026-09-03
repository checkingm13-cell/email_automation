require('dotenv').config();
const { google } = require('googleapis');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 1. Initialize OAuth2 Client
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/oauth2callback' // Redirect URI (must match what you configure if using Web App, but 'http://localhost' works for Desktop)
);

// 2. Define the scope (Gmail Send)
const scopes = ['https://www.googleapis.com/auth/gmail.send'];

console.log('\n🔐 Step 1: Generate Authorization URL\n');
const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // CRITICAL: This ensures a refresh_token is returned
    scope: scopes,
    prompt: 'consent' // CRITICAL: Forces Google to return a refresh_token every time
});

console.log('Please visit this URL to authorize the application:');
console.log(authUrl);
console.log('\n');

// 3. Prompt for the authorization code
rl.question('Step 2: After authorizing, you will be redirected to a localhost URL that fails. Copy the "code" parameter from that URL and paste it here: ', async (code) => {
    try {
        console.log('\n⏳ Exchanging code for tokens...');

        // 4. Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);

        console.log('\n✅ SUCCESS! OAuth 2.0 Flow Verified.\n');
        console.log('Copy this Refresh Token and save it in your database `sender_refresh_token` column:');
        console.log('---------------------------------------------------------');
        console.log(tokens.refresh_token);
        console.log('---------------------------------------------------------\n');

        rl.close();
    } catch (error) {
        console.error('\n❌ Error exchanging code for tokens:', error.message);
        console.log('Tip: Make sure you copied the entire "code" string from the URL.');
        rl.close();
    }
});