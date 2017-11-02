const querystring = require('querystring');
const express = require('express');
const dotenv = require('dotenv');
const request = require('request');
const webdriver = require('selenium-webdriver');

const router = new express.Router();
dotenv.config();

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const USERNAME = process.env.SPOTIFY_USERNAME;
const PASSWORD = process.env.SPOTIFY_PASSWORD;
const STATE_KEY = 'spotify_auth_state';
const scope = 'playlist-modify-public playlist-modify-private user-read-playback-state user-read-currently-playing user-read-recently-played user-modify-playback-state';
const spotifyLogout = 'https://www.spotify.com/uk/logout';
const spotifyLogin = 'https://www.spotify.com/login?continue=https%3A%2F%2Fwww.spotify.com%2Fuk%2Flogged-in%2F';

const generateRandomString = N => (Math.random().toString(36)+Array(N).join('0')).slice(2, N+2);

let access_token;
let refresh_token;

router.get('/spotify', (req, res) => {
  const driver = new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities.chrome())
    .build();

  driver.get('http://localhost:8000/login')
  driver.findElement(webdriver.By.className('btn btn-sm btn-block btn-green')).click();
  driver.findElement(webdriver.By.id('login-username')).click(); 
  driver.findElement(webdriver.By.id('login-username')).sendKeys(USERNAME);
  driver.findElement(webdriver.By.id('login-password')).click();
  driver.findElement(webdriver.By.id('login-password')).sendKeys(PASSWORD);
  driver.findElement(webdriver.By.className('btn btn-sm btn-block btn-green')).click();

  driver.wait(() => (
    driver.getTitle().then(title => title === 'Playlist')
  ), 4000).then(() => {
    driver.quit();
    res.redirect('http://localhost:2000');
  });
})

router.get('/tokens', (req, res) => {
  res.send({
    accessToken: access_token,
    refreshToken: refresh_token,
  });
})

router.get('/login', (_, res) => {
  const state = generateRandomString(16);
  res.cookie(STATE_KEY, state);
  res.redirect('https://accounts.spotify.com/authorize?' +
  querystring.stringify({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: scope,
    redirect_uri: REDIRECT_URI,
    state: state
  }));
});

router.get('/callback', (req, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies ? req.cookies[STATE_KEY] : null;
  if (state === null || state !== storedState) {
    res.redirect('/#/error/state mismatch');
  } else {
    res.clearCookie(STATE_KEY);
    const authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        access_token = body.access_token;
        refresh_token = body.refresh_token;
      }
      res.redirect(process.env.REDIRECT_URL);
    });
  }
});

router.get('/refresh_token', function(req, res) {
    var refresh_token = req.query.refresh_token;
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      headers: { 'Authorization': 'Basic ' + (new Buffer(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')) },
      form: {
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      },
      json: true
    };
  
    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        var access_token = body.access_token;
        res.send({
          'access_token': access_token
        });
      }
    });
  });

module.exports = router;
