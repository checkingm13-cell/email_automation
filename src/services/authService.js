const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

class AuthService {
    static async getOAuth2Client() {
        const credentials = JSON.parse(
            fs.readFileSync(path.join(__dirname, '../../oauth-client.json'))
        );

        const { client_secret, client_id, redirect_uris } = credentials.installed;

        const oauth2Client = new google.auth.OAuth2(
            client_id,
            client_secret,
            'http://localhost' // Desktop app redirect URI
        );

        // Check if we have a refresh token in .env
        if (process.env.GOOGLE_REFRESH_TOKEN) {
            oauth2Client.setCredentials({
                refresh_token: process.env.GOOGLE_REFRESH_TOKEN
            });
        }

        return oauth2Client;
    }

    static async generateAuthUrl() {
        const oauth2Client = await this.getOAuth2Client();

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline', // Required to get refresh token
            scope: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/gmail.send',
                'https://www.googleapis.com/auth/gmail.modify'
            ],
            prompt: 'consent' // Force consent screen to ensure we get refresh token
        });

        return authUrl;
    }

    static async exchangeCodeForToken(code) {
        const oauth2Client = await this.getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);

        oauth2Client.setCredentials(tokens);

        return tokens;
    }
}

module.exports = AuthService;