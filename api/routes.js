const querystring = require('querystring');
const express = require('express');
const dotenv = require('dotenv');
const request = require('request');
const R = require('ramda');
const router = new express.Router();
dotenv.config();

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const STATE_KEY = 'spotify_auth_state';
const scope = 'playlist-modify-public playlist-modify-private user-read-playback-state user-read-currently-playing user-read-recently-played user-modify-playback-state';

const generateRandomString = N => (Math.random().toString(36)+Array(N).join('0')).slice(2, N+2);

let access_token;
let refresh_token;

router.get('/tokens', (req, res) => {
  req.app.locals.db.collection('users').find().toArray((err, results) => {
    if (err) throw err;
    res.send({
      tokens: results,
    });
  });
})

router.get('/login', (req, res) => {
  req.app.locals.db.collection('users').find().toArray((err, results) => {
    if (results.length > 0) {
      return res.redirect('/');
    }
    const state = generateRandomString(16);
    const queryString = querystring.stringify({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope,
      redirect_uri: REDIRECT_URI,
      state,
    });
    res.cookie(STATE_KEY, state);
    res.redirect(`https://accounts.spotify.com/authorize?${queryString}`);
  });
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
        req.app.locals.db.collection('users').insert({
          name: 'mdc268',
          accessToken: body.access_token,
          refreshToken: body.refresh_token,
        });
      }
      res.redirect(process.env.REDIRECT_URL);
    });
  }
});

router.get('/refresh', function(req, res) {
    const refresh_token = req.query.refreshToken;
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      headers: { 'Authorization': 'Basic ' + (new Buffer(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')) },
      form: {
        grant_type: 'refresh_token',
        refresh_token,
      },
      json: true
    };
  
    request.post(authOptions, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        req.app.locals.db.collection('users').update({ name: 'mdc268' }, { $set: { accessToken: body.access_token } });
        res.send(body.access_token);
      }
    });
  });

module.exports = router;
