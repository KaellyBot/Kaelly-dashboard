const EXPRESS = require('express');
const ROUTER = EXPRESS.Router();

ROUTER.get('/', function (req, res) {
    console.log(req);
    console.log(req.session);
    res.render('dashboard', { guilds : req.session.guilds });
});

module.exports = ROUTER;