const EXPRESS = require('express');
const ROUTER = EXPRESS.Router();

ROUTER.get('/', (req, res) => res.render('index', { user : req.session.user }));

module.exports = ROUTER;