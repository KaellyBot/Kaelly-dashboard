module.exports = {
    notFound: (req, res, next) => {
        res.status(404);
        res.render('errors/404', { user : req.session.user });
        },
    internalError: (err, req, res, next) => {
        res.status(500);
        res.render('errors/500', { user : req.session.user })
    }
};