const EXPRESS = require('express');
const ROUTER = EXPRESS.Router();

ROUTER.get('/', (req, res) => res.render('dashboard', {
    user : req.session.user, 
    guilds : req.session.guilds,
    success: res.locals.success
}));

module.exports = ROUTER;