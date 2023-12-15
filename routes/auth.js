const express = require('express');
const User = require('../models/user');

const {check,body} = require('express-validator');

const authController = require('../controllers/auth');

const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post('/login',[
    body('email').isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
    body('password','Password has to be valid').isLength({min: 5}).isAlphanumeric()
    .trim()
], authController.postLogin);

router.post('/signup',[ check('email').isEmail().withMessage('Please enter a valid email')
    .custom((value,{req})=> {
        // if(value === "test@test.com"){
            //     throw new Error('This email address is forbidden.')
            // }
        // return true; 


        return User.findOne({email : value })
            .then(userDoc => {
                if(userDoc){
                    return Promise.reject('Email already exists, use different');
                }
            })
    }).normalizeEmail(),
    body('password',
        'Please enter a passowrd with only numbers and text and 5 length.'
    ).isLength({min: 5})
    .isAlphanumeric().trim(),
    body('confirmPassword').custom((value,{req})=>{
        if(value!==req.body.password){
            throw new Error('Passwords have to match');
        }
        return true;
    }).trim()
]
    , authController.postSignup);

router.post('/logout', authController.postLogout);

router.get('/reset',authController.getReset);

router.post('/reset',authController.postReset);

router.get('/reset/:token',authController.getNewPassword);

router.post('/new-password',authController.postNewPassword);

module.exports = router;
