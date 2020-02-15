const EXPRESS = require('express');
const ROUTER = EXPRESS.Router();

ROUTER.get('/', function (req, res) {
    res.render('dashboard', { guilds : req.session.guilds });
});

module.exports = ROUTER;