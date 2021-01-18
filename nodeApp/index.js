const fs = require('fs');
const readline = require('readline');
const {
    google
} = require('googleapis');
const https = require('http');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';
const CONF_PATH = 'conf.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    authorize(JSON.parse(content), connectWithGateway);
});


/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const {
        client_secret,
        client_id,
        redirect_uris
    } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback);

        const obj = JSON.parse(token);

        if (obj.expiry_date < Date.now()) return getAccessToken(oAuth2Client, callback);
        callback(obj.access_token);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error retrieving access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            console.log("getAccessToken before call back");
            callback(oAuth2Client);
        });
    });
}


function connectWithGateway(calenderAccessToken) {
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err == null) {
            fs.readFile(CONF_PATH, (err, configs) => {
                if (err == null) {
                    const configJson = JSON.parse(configs);

                    var consumerKey = configJson.APIM_consumer_key;
                    var consumerSecret = configJson.APIM_consumer_secret;
                    var gatewayURL = configJson.Gateway_url;
                    var eventsFrom = configJson.Events_from;
                    var eventsTo = configJson.Events_to;

                    const tokenEndpointAccessToken = Buffer.from(consumerKey + ":" + consumerSecret).toString(
                        "base64"
                    );

                    //Requesting a token from the token endpoint
                    var request = require('sync-request');
                    var res = request('POST', gatewayURL + '/token?grant_type=client_credentials', {
                        headers: {
                            "Authorization": "Basic " + tokenEndpointAccessToken
                        },
                    });
                    var statusCode = res.statusCode;
                    if (statusCode == 200) {
                        var response = JSON.parse(res.getBody('utf8'));
                        var gatewayAccessToken = response.access_token;

                        //Send the request to the reminder API
                        var request = require('sync-request');
                        var res = request('GET', gatewayURL + '/reminders/1.0.0/events?timeMin=' + eventsFrom + '&timeMax=' + eventsTo, {
                            headers: {
                                "Authorization": "Bearer " + calenderAccessToken,
                                "Authentication": "Bearer " + gatewayAccessToken
                            },
                        });
                        
                        statusCode = res.statusCode;
                        if (statusCode == 200 || statusCode == 201) {
                            var response = JSON.parse(res.getBody('utf8'));
                            console.log("Sent Message : ", response.body);
                        } else {
                            console.error("Please rerun the tool again", res.getBody('utf8'));
                        }
                    } else {
                        console.error("Error getting access token from APIM ", res.getBody('utf8'))
                    }


                } else {
                    console.log("config.json not found");
                }
            });
        } else {
            console.log("Please re run the tool again");
        }
    });

}