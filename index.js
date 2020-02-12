// Libraries
const HAS_USER_GET_ADMIN_PERMISSION = require('./util/administrator-perm');
const EXPRESS = require('express');
const AXIOS = require('axios');
const HELMET = require('helmet');
const MORGAN = require('morgan');
const SESSION = require('express-session');
const APP = EXPRESS();
require('dotenv').config();

// Environment variables
const PRODUCTION_MODE = process.env.PRODUCTION_MODE || false;
const PORT = process.env.PORT || 8080;
const OAUTH2_CLIENT_ID = process.env.OAUTH2_CLIENT_ID;
const OAUTH2_CLIENT_SECRET = process.env.OAUTH2_CLIENT_SECRET;
const OAUTH2_REDIRECT_URI = process.env.OAUTH2_REDIRECT_URI || `http://localhost:${PORT}/api/discord`;
const API_BASE_URL = 'https://discordapp.com/api';
const AUTHORIZATION_BASE_URL = API_BASE_URL + '/oauth2/authorize';
const TOKEN_URL = API_BASE_URL + '/oauth2/token'
const KAELLYBOT_TOKEN = process.env.KAELLY_TOKEN;
const KAELLY_DASHBOARD_TOKEN = Buffer.from(`${OAUTH2_CLIENT_ID}:${OAUTH2_CLIENT_SECRET}`, 'utf8').toString('base64');
const MONGO_URL = process.env.MONGO_URL;
const MORGAN_LEVEL = process.env.MORGAN_LEVEL || 'dev';
const SESSION_SECRET = process.env.SESSION_SECRET || 'KaellyBot';
const DISCORD_EXPIRATION_TOKEN_MS = 604800000;

// Server properties
APP.use(EXPRESS.static('views'));
APP.set('view engine', 'ejs');
APP.set('trust proxy', 1);
APP.use(HELMET());
APP.use(MORGAN(MORGAN_LEVEL));
APP.use(SESSION({
	secret: SESSION_SECRET,
	resave: true,
	saveUninitialized: true,
	cookie: { secure: PRODUCTION_MODE, maxAge: DISCORD_EXPIRATION_TOKEN_MS}
}));

APP.get('/', (req, res) => res.render('index'));

APP.get('/login', function(req, res) {
	res.redirect(`${AUTHORIZATION_BASE_URL}`
				+ `?client_id=${OAUTH2_CLIENT_ID}`
				+ `&redirect_uri=${OAUTH2_REDIRECT_URI}`
				+ `&response_type=code`
				+ `&scope=guilds`);
	}
);

APP.get('/api/discord', function(req, res) {
	AXIOS.post(`${TOKEN_URL}?grant_type=authorization_code`
				+ `&code=${req.query.code}`
				+ `&redirect_uri=${OAUTH2_REDIRECT_URI}`, {}, 
			{headers: {'Authorization': `Basic ${KAELLY_DASHBOARD_TOKEN}`}})
		.then(response => {
			req.session.loggedIn = true;
			req.session.access_token = response.data.access_token;
			res.redirect('/dashboard');
		})
		.catch(error => res.json(error));
	}
);

APP.get('/dashboard', function (req, res) {
	if (req.session.loggedIn){
		AXIOS.get(`${API_BASE_URL}/users/@me/guilds`,
				 {headers: {'Authorization': `Bearer ${req.session.access_token}`}})
			.then(response => {
				res.render('guilds', {guilds:response.data.filter(HAS_USER_GET_ADMIN_PERMISSION)});
			})
			.catch(error => res.json(error));
	}
	else
		res.redirect('/login');
});

APP.get('/logout', function (req, res) {
	req.session.destroy(function(err) {
		if (err) console.log(err);
		res.redirect('/');
	  })
});

console.log(`kaelly-dashboard is now listening ${PORT}`);
APP.listen(PORT);