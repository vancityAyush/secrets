require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: 'My Little Secret;',
    resave: false,
    saveUninitialized: true,
    cookie: {secure: true}
}))
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://0.0.0.0:27017/usersDB", {useNewUrlParser: true});

const usersSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId:String,
    facebookId:String
});

usersSchema.plugin(passportLocalMongoose);
usersSchema.plugin(findOrCreate);

const User = mongoose.model("User", usersSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets",
        userProfileURL : 'https://www.googleapis.com/oauth2/v3/userinfo',
    },
    function(accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ email:profile._json['email'] }, function (err, user) {
            user.set({googleId:profile.id});
            user.save();
            return cb(err, user);
        });
    }
));

passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: "http://localhost:3000/auth/facebook/callback",
        profileFields: ['id', 'emails', 'name'],
    },
    function(accessToken, refreshToken, profile, cb) {
        console.log(profile._json.email);
        User.findOrCreate({ email:profile._json.email}, function (err, user) {
            user.set({facebookId:profile.id})
            user.save();
            return cb(err, user);
        });
    }
));


app.get("/", function (req, res) {
    res.render("home");
});


app.get("/secrets", function (req, res) {
    if (req.isAuthenticated) {
        res.render('secrets');
    } else {
        res.redirect("/login");
    }
});

app.get('/auth/facebook',
    passport.authenticate('facebook',{scope:'email'} ));

app.get("/auth/google",
    passport.authenticate('google', { scope: ["profile","email"] })
);

app.get('/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    function(req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });


app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
        // Successful authentication, redirect home.
        res.redirect("/secrets");
    });



app.get("/login", function (req, res) {
    res.render('login');
});

app.get("/register/", function (req, res) {
    res.render('register');
});

app.get("/logout", function (req, res) {
    req.logout(function (err, result) {
        res.redirect("/");
    });
});

app.post("/register", function (req, res) {
    User.register({username: req.body.username}, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register/err");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            })
        }
    });
});

app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });
});


app.listen(3000, () => console.log("Server Running on Port 3000"));
