const crypto = require('crypto');
const {validationResult} = require('express-validator');
const User = require('../models/user');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);
const apiKey = process.env.MAILGUN_API_KEY;
const mg = mailgun.client({username: 'api', key: apiKey || 'key-yourkeyhere'});

exports.getLogin = (req, res, next) => {
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    isAuthenticated: false,
    errorMessage: req.flash('error') 
  });
};

exports.getSignup = (req, res, next) => {
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    isAuthenticated: false,
    errorMessage: req.flash('error')
  });
};

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.render('auth/login',{
            path: '/login',
            pageTitle: 'Login',
            errorMessage: errors.array()[0].msg
        })
    }
    User.findOne({email : email})
        .then(user => {
            if(!user){
                req.flash('error','Invalid email or password.');
                return res.redirect('/login')
            }
            bcrypt.compare(password, user.password)
                .then(doMatch=>{
                    if(doMatch){
                        req.session.isLoggedIn = true;
                        req.session.user = user;
                        return req.session.save(err => {
                            console.log(err);
                            res.redirect('/')
                        });
                    }
                    req.flash('error','Incorrect Password');
                    return res.redirect('/login');
                })
                .catch(err => {
                    console.log(err);
                    res.redirect('/login');
                });
        })
        .catch(err => console.log(err));
};

exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const password  = req.body.password;
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        console.log(errors.array());
        return res.status(422).render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            isAuthenticated: false,
            errorMessage: errors.array()[0].msg 
        });
    }
    return bcrypt.hash(password, 12)
        .then(hashedPassword =>{
            const user = new User({
                email : email,
                password : hashedPassword,
                cart : {items : []}
            });
            return user.save();
        })
    
    .then(result => {
        res.redirect('/login');
        mg.messages.create(process.env.MAILGUN_DOMAIN, {
            from: "Book Verse <postmaster@sandbox684be0426ff94ba99422cd12469d74ba.mailgun.org>",
            to: [email],
            subject: "Confirmation",
            text: "You have sign up for BookVerse",
            html: "<h1> Congratulation! </h1>"
        })
            .then(msg => console.log(msg)) // logs response data
            .catch(err => console.log(err)); 
    })
        
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};

exports.getReset = (req,res,next)=>{

  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    isAuthenticated: false,
    errorMessage: req.flash('error')
  });
}
exports.postReset = (req,res,next)=>{
    crypto.randomBytes(32,(err,buffer)=>{
        if(err){
            console.log(err);
            return res.redirect('/reset');
        }
        const token = buffer.toString('hex');
        User.findOne({email: req.body.email})
            .then(user =>{
                if(!user){
                    req.flash('error','No account with that email found.')
                    return res.redirect('/reset');
                }
                user.resetToken=token;
                user.resetTokenExpiration=Date.now()+3600000;
                return user.save();
            })
            .then(result =>{
                res.redirect('/');
                mg.messages.create(process.env.MAILGUN_DOMAIN, {
                    from: "Book Verse <postmaster@sandbox684be0426ff94ba99422cd12469d74ba.mailgun.org>",
                    to: [req.body.email],
                    subject: "Password reset",
                    text: "You have sign up for BookVerse",
                    html: `
                    <p> You requested a password reset </p>
                    <p> Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password. </p>                    `
                })
                    .then(msg => console.log(msg)) // logs response data
                    .catch(err => console.log(err)); 

                
            })
            .catch(err =>{
                console.log(err)
            })
    })
}
exports.getNewPassword = (req,res,next)=>{
    const token = req.params.token;
    User.findOne({resetToken : token, resetTokenExpiration :{$gt : Date.now()}})
        .then(user =>{
            res.render('auth/new-password', {
                path: '/new-password',
                pageTitle: 'New Password',
                errorMessage: req.flash('error'),
                userId : user._id.toString(),
                passwordToken: token
            });
        })
        .catch(err =>{
            console.log(err)
        })
}
exports.postNewPassword = (req,res,next)=>{
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser;
    User.findOne({resetToken: passwordToken, resetTokenExpiration :{$gt: Date.now()}, _id: userId}).then(user=>{
        resetUser=user;
        return bcrypt.hash(newPassword,12);
        
    })
    .then(hashedPassword=>{
        resetUser.password=hashedPassword;
        resetUser.resetToken=undefined;
        resetUser.resetTokenExpiration=undefined;
        return resetUser.save();
    })
    .then(result=>{
        res.redirect('/login');
    })
    .catch(err=>{
        console.log(err);
    });
}
