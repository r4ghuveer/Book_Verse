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
    const confirmPassword = req.body.confirmPassword;
    User.findOne({email : email })
    .then(userDoc => {
        if(userDoc){
            req.flash('error','Email already exist.');
            return res.redirect('/signup');
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
    })
    .catch(err => console.log(err));
        
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};
