require('dotenv').config();
const { google } = require('googleapis');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost'
);

const scopes = ['https://www.googleapis.com/auth/gmail.send'];

console.log('\n🔐 Generate OAuth 2.0 Token for Personal Gmail\n');
console.log('1. Visit this URL:');
console.log(oauth2Client.generateAuthUrl({ access_type: 'offline', scope: scopes, prompt: 'consent' }));
console.log('\n2. Log in, click "Allow", and copy the "code" from the redirect URL.\n');

rl.question('Paste the code here: ', async (code) => {
    try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log('\n✅ SUCCESS! Copy this Refresh Token:\n');
        console.log(tokens.refresh_token);
        console.log('\n(Paste this into your database `sender_refresh_token` column for this campaign)\n');
        rl.close();
    } catch (error) {
        console.error('❌ Error:', error.message);
        rl.close();
    }
});