const path = require('path');
const https = require('https');
const fs=require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const helmet = require('helmet');
const flash = require('connect-flash');
require('dotenv').config();
const multer = require('multer');
const compression = require('compression');

const errorController = require('./controllers/error');

const User = require('./models/user');

const MONGODB_URI = process.env.mongodb_uri;

const app = express();

const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});

console.log(process.env.NODE_ENV);

const privateKey = fs.readFileSync('server.key');
const certificate = fs.readFileSync('server.cert');

const fileStorage = multer.diskStorage({
    destination: (req,file,cb)=>{
        cb(null,'images');
    },
    filename: (req,file,cb)=>{
        cb(null,new Date().toISOString() + '-'+file.originalname);
    }
});

const fileFilter = (req,file,cb) =>{
    if(file.mimetype === 'image/png' || file.mimetype=== 'image/jpg' || file.mimetype ==='image/jpeg'){
        cb(null,true);
    }
    else{
        cb(null,false);
    }
}

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');


app.use(helmet());
app.use(compression());

app.use(bodyParser.urlencoded({ extended: false }));

app.use(multer({storage: fileStorage,fileFilter: fileFilter}).single('image'));

app.use(express.static(path.join(__dirname, 'public')));

app.use("/images",express.static(path.join(__dirname, 'images')));

app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store
  })
);


app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
        if(!user){
            return next();
        }
      req.user = user;
      next();
    })
    .catch(err =>{
        throw new Error(err);
    });
});

app.use((req,res,next)=>{
    res.locals.isAuthenticated = req.session.isLoggedIn;
    next();
})
app.use(flash());
app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);
app.get('/500',errorController.get500);
app.use(errorController.get404);

app.use((error,req,res,next)=>{
    console.log(error);
    res.status(500).render('500',{
        pageTitle: 'Error!',
        path: '/500',
        isAuthenticated: req.session.isLoggedIn
    })

})

mongoose
  .connect(MONGODB_URI)
  .then(result => {
    // https.createServer({key: privateKey, cert: certificate},app).listen(process.env.PORT || 3000);
      app.listen(process.env.PORT || 3000);
      console.log("connected to database!!");
  })
  .catch(err => {
    console.log(err);
  });


