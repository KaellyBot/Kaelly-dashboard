// Libraries
require('dotenv').config();
const DISCORD = require('discord.js');
const DISCORD_CLIENT = new DISCORD.Client();
const DISCORD_UTILITY = require('./util/discordUtility');
const ERROR_HANDLER = require('./util/errorHandler');
const EXPRESS = require('express');
const PATH = require('path');
const AXIOS = require('axios');
const HELMET = require('helmet');
const MORGAN = require('morgan');
const SESSION = require('express-session');
const BODY_PARSER = require('body-parser');
const APP = EXPRESS();

// Environment variables
const PRODUCTION_MODE = process.env.PRODUCTION_MODE || false;
const HOST = process.env.HOST || 'http://localhost';
const PORT = process.env.PORT || 8080;
const OAUTH2_CLIENT_ID = process.env.OAUTH2_CLIENT_ID;
const OAUTH2_CLIENT_SECRET = process.env.OAUTH2_CLIENT_SECRET;
const OAUTH2_REDIRECT_URI = process.env.OAUTH2_REDIRECT_URI || '/api/discord';
const API_BASE_URL = 'https://discordapp.com/api';
const AUTHORIZATION_BASE_URL = API_BASE_URL + '/oauth2/authorize';
const USER_BASE_URL = API_BASE_URL + '/users/@me';
const USER_GUILDS_BASE_URL = API_BASE_URL + '/users/@me/guilds';
const TOKEN_URL = API_BASE_URL + '/oauth2/token'
const KAELLY_BOT_TOKEN = process.env.KAELLY_TOKEN;
const KAELLY_DASHBOARD_TOKEN = Buffer.from(`${OAUTH2_CLIENT_ID}:${OAUTH2_CLIENT_SECRET}`, 'UTF8').toString('BASE64');
const MORGAN_LEVEL = process.env.MORGAN_LEVEL || 'dev';
const SESSION_SECRET = process.env.SESSION_SECRET || 'KaellyBot';
const DISCORD_EXPIRATION_TOKEN_MS = 604800000;

// Load routes
var indexRouter = require('./routes/index');
var dashboardRouter = require('./routes/dashboard');
var guildRouter = require('./routes/guild');
var almanaxRouter = require('./routes/guild/almanax');
var commandsRouter = require('./routes/guild/commands');
var languageRouter = require('./routes/guild/language');
var rssRouter = require('./routes/guild/rss');
var serverRouter = require('./routes/guild/server');
var twitterRouter = require('./routes/guild/twitter');

// Server properties
APP.use(EXPRESS.static(PATH.join(__dirname, 'public')));
APP.set('view engine', 'ejs');
APP.set('trust proxy', 1);
APP.use(BODY_PARSER.urlencoded({extended: true}));
APP.use(BODY_PARSER.json());
APP.use(HELMET());
APP.use(MORGAN(MORGAN_LEVEL));
APP.use(SESSION({
	secret: SESSION_SECRET,
	resave: true,
	saveUninitialized: true,
	cookie: { secure: PRODUCTION_MODE, maxAge: DISCORD_EXPIRATION_TOKEN_MS}
}));

var dashboardRedirect = (req, res, next) => res.redirect('/dashboard');

var login = (req, res, next) =>
	res.redirect(`${AUTHORIZATION_BASE_URL}`
				+ `?client_id=${OAUTH2_CLIENT_ID}`
				+ `&redirect_uri=${HOST}:${PORT}${OAUTH2_REDIRECT_URI}`
				+ `&response_type=code`
				+ `&scope=identify+guilds+email`);

var grantDiscord = (req, res, next) =>
	AXIOS.post(`${TOKEN_URL}?grant_type=authorization_code`
				+ `&code=${req.query.code}`
				+ `&redirect_uri=${HOST}:${PORT}${OAUTH2_REDIRECT_URI}`, {}, 
			{headers: {'Authorization': `Basic ${KAELLY_DASHBOARD_TOKEN}`}})
		.then(response => {
			req.session.loggedIn = true;
			req.session.access_token = response.data.access_token;
			next();
		})
		.catch(error => {
			// TODO manage error 'too many request'
			console.error(error);
		});

var identifyUser = (req, res, next) =>
	AXIOS.get(USER_BASE_URL, {headers: {'Authorization': `Bearer ${req.session.access_token}`}})
        .then(response => {
			req.session.user = response.data;
			next();
		})
        .catch(error => {
			// TODO manage error 'too many request'
			console.error(error);
		});

var loadDiscordData = (req, res, next) =>
	AXIOS.get(USER_GUILDS_BASE_URL, {headers: {'Authorization': `Bearer ${req.session.access_token}`}})
        .then(response => {
			req.session.guilds = response.data.filter(DISCORD_UTILITY.HAS_USER_GET_ADMIN_PERMISSION);
			req.session.guilds.forEach(guild => {
				let guildDataFromBot = DISCORD_CLIENT.guilds.get(guild.id);
				guild.connected = guildDataFromBot ? true : false;
				guild.channels = guild.connected ? Array.from(guildDataFromBot.channels.values())
					.filter(DISCORD_UTILITY.IS_GUILD_TEXT)
					.sort((channel1, channel2) => channel1.position - channel2.position) : [];
			});
			next();
		})
        .catch(error => {
			// TODO manage error 'too many request'
			console.error(error);
		});

var cleanVariableSession = (req, res, next) => {
	if (req.session.success){
		res.locals.success = req.session.success;
		req.session.success = null;
	}
	if (req.session.error){
		res.locals.error = req.session.error;
		req.session.error = null;
	}
	next();
}

var checkLoggedIn = (req, res, next) => req.session.loggedIn ? next() : res.redirect("/login");

var checkIfUserHasGuild = (req, res, next) => req.session.guilds
	.filter(guild => guild.id === req.params.guildId).length === 1 ? 
	next() : ERROR_HANDLER.notFound(req, res, next);

var checkIfGuildIsConnected = (req, res, next) => req.session.guilds
	.filter(guild => guild.id === req.params.guildId)[0].connected ? 
	next() : ERROR_HANDLER.notFound(req, res, next);

// TODO mongoose?
var checkIfLanguageExists = (req, res, next) => next();

var checkIfChannelExists = (req, res, next) => req.session.guilds
	.filter(guild => guild.id === req.params.guildId)[0].channels
	.filter(channel => channel.id === req.body.channelId).length === 1 ? 
	next(): ERROR_HANDLER.notFound(req, res, next);

// TODO mongoose
var saveDefaultLanguage = (req, res, next) => {
	req.session.success = `The default Language is now ${req.body.defaultLanguage}.`
	res.redirect(`/guild/${req.params.guildId}/language`);
};

// TODO mongoose
var saveChannelLanguage = (req, res, next) => {
	req.session.success = `The channel ${req.body.channelId} now uses the ${req.body.languageId} language.`
	res.redirect(`/guild/${req.params.guildId}/language`);
};

// TODO mongoose
var deleteChannelLanguage = (req, res, next) => {
	req.session.success = `The channel ${req.body.channelId} now uses the default language.`
	res.redirect(`/guild/${req.params.guildId}/language`);
};

var logout = (req, res, next) =>
	req.session.destroy(function(err) {
		if (err) {
			// TODO manage error (with sentry?)
			console.error(err);
		}
		res.redirect('/');
	  });

// Routes
APP.use("/dashboard",                             cleanVariableSession, checkLoggedIn, loadDiscordData,     dashboardRouter);
APP.use("/guild/:guildId",                        cleanVariableSession, checkLoggedIn, checkIfUserHasGuild, checkIfGuildIsConnected, guildRouter);
APP.use("/guild/:guildId/almanax",                cleanVariableSession, checkLoggedIn, checkIfUserHasGuild, checkIfGuildIsConnected, almanaxRouter);
APP.use("/guild/:guildId/commands",               cleanVariableSession, checkLoggedIn, checkIfUserHasGuild, checkIfGuildIsConnected, commandsRouter);
APP.use("/guild/:guildId/language",               cleanVariableSession, checkLoggedIn, checkIfUserHasGuild, checkIfGuildIsConnected, languageRouter);
APP.use("/guild/:guildId/defaultLanguage/save",   cleanVariableSession, checkLoggedIn, checkIfUserHasGuild, checkIfGuildIsConnected, checkIfLanguageExists, saveDefaultLanguage);
APP.use("/guild/:guildId/channelLanguage/save",   cleanVariableSession, checkLoggedIn, checkIfUserHasGuild, checkIfGuildIsConnected, checkIfChannelExists,  checkIfLanguageExists, saveChannelLanguage);
APP.use("/guild/:guildId/channelLanguage/delete", cleanVariableSession, checkLoggedIn, checkIfUserHasGuild, checkIfGuildIsConnected, checkIfChannelExists,  checkIfLanguageExists, deleteChannelLanguage);
APP.use("/guild/:guildId/rss",                    cleanVariableSession, checkLoggedIn, checkIfUserHasGuild, checkIfGuildIsConnected, rssRouter);
APP.use("/guild/:guildId/server",                 cleanVariableSession, checkLoggedIn, checkIfUserHasGuild, checkIfGuildIsConnected, serverRouter);
APP.use("/guild/:guildId/twitter",                cleanVariableSession, checkLoggedIn, checkIfUserHasGuild, checkIfGuildIsConnected, twitterRouter);
APP.use(`${OAUTH2_REDIRECT_URI}`,                 cleanVariableSession, grantDiscord,  identifyUser,        dashboardRedirect);
APP.use("/login",                                 cleanVariableSession, login);
APP.use("/logout",                                cleanVariableSession, logout);
APP.use("/",                                      cleanVariableSession, indexRouter);
APP.use(ERROR_HANDLER.notFound);
APP.use(ERROR_HANDLER.internalError);

DISCORD_CLIENT.on('ready', () => {
	console.log(`Kaelly-dashboard is logged in as ${DISCORD_CLIENT.user.tag}!`);
	console.log(`Kaelly-dashboard is now listening ${PORT}`);
	APP.listen(PORT);
  });

DISCORD_CLIENT.login(KAELLY_BOT_TOKEN);