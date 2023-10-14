const path = require('path');
const mongoose = require ('mongoose');
const express = require('express');
const bodyParser = require('body-parser');


const errorController = require('./controllers/error');
const User = require('./models/user');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  User.findById('65257b5a2a7d70e9533bc541')
    .then(user => {
      req.user = user;
      next();
    })
    .catch(err => console.log(err));
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);

app.use(errorController.get404);


mongoose.connect('mongodb+srv://r4ghuveer:r4ghuveer@cluster0.orx5fjp.mongodb.net/shop')
        .then(result =>{
            User.findOne().then(user =>{
                if (!user){

                    const user = new User({
                        name : 'Raghuveer',
                        email : 'raghuveerofficial08@gmail.com',
                        cart : {
                            items: []
                        } 
                    })
                    user.save();
                }
            });
            app.listen(3000);
            console.log('connected')
        }).catch(err => console.log(err))

