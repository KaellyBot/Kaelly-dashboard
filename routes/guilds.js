const EXPRESS = require('express');
const ROUTER = EXPRESS.Router();

ROUTER.get('/', (req, res) => res.render('guilds', 
    {user : req.session.user, guilds : req.session.guilds }));

module.exports = ROUTER;