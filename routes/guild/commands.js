const EXPRESS = require('express');
const ROUTER = EXPRESS.Router({ mergeParams : true });

ROUTER.get('/', (req, res) => res.render('commands', {
    user : req.session.user, 
    guild : req.session.guilds.find(guild => guild.id === req.params.guildId),
    success: res.locals.success
}));

module.exports = ROUTER;