const querystring = require('querystring');
const express = require('express');
const dotenv = require('dotenv');
const request = require('request');
const R = require('ramda');
const Sequelize = require('sequelize');

dotenv.config();

const sequelize = new Sequelize('postgres://localhost/jukebox');

sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

const User = sequelize.define('users', {
  username: {
    type: Sequelize.STRING
  },
  accessToken: {
    type: Sequelize.STRING
  },
  refreshToken: {
    type: Sequelize.STRING
  }
});

const router = new express.Router();

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const STATE_KEY = 'spotify_auth_state';
const scope = 'playlist-modify-public playlist-modify-private user-read-playback-state user-read-currently-playing user-read-recently-played user-modify-playback-state';

const generateRandomString = N => (Math.random().toString(36)+Array(N).join('0')).slice(2, N+2);

let access_token;
let refresh_token;

router.get('/', (req, res) => {
  User.findAll().then(users => res.send({
    tokens: users[0],
  }));
})

router.get('/tokens', (req, res) => {
  User.findAll().then(users => res.send({
    tokens: users[0]
  }));
})

router.get('/login', (req, res) => {
  User.findAll().then((users) => {
    if (users.length > 0) {return res.redirect('/tokens');};
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
        console.log(body.access_token);
        User.create({
          username: 'mdc268',
          accessToken: body.access_token,
          refreshToken: body.refresh_token,
        }, { fields: ['username', 'accessToken', 'refreshToken'] }).then(() => {
          console.log('hello');
          res.redirect('/');
        })
      }
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
      User.update({ accessToken: body.access_token }, { fields: ['accessToken'], where: { id: 4 } }).then(() => {
        res.send(body.access_token);
      })
    }
  });
});

router.get('/access', (req, res) => {
  User.update({ accessToken: '1' }, { fields: ['accessToken'], where: { id: 4 } }).then(() => {
    res.redirect('/');
  })
})

module.exports = router;
