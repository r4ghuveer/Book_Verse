module.exports=(req,res,next)=>{
    if(!req.session.isLoggedIn){
        return res.redirect('/login');
    }
    next();
}
// now we remove all the req.session.isLoggedIn from the controller actions
