//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const app = express();
const mongoose = require("mongoose");
const findOrCreate = require("mongoose-findorcreate");
//lvl 4
//went to bcrypt hashing instead of mongoose-encryption
// const encrypt = require("mongoose-encryption");
// const md5=require("md5");

//lvl 5
//went to passport instead of bcrypt
// const bcrypt = require("bcrypt");
// const saltRounds = 10;

// lvl 6.  passport / sessions /google-OAuth2.0
//passport docs http://www.passportjs.org/
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

//initialize session here
app.use(session({
    secret: process.env.secret,
    resave: false,
    saveUninitialized: false
}));

//initialize passport here
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set("useCreateIndex", true);
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
//removed mongoose.encryption module and went to HASH
// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, done){
    done(null, user.id);
});

passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user){
        done(err, user);
    });
});
//GOOGLE STRATEGY IS DEPRECATED, DONT USE IT!!

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
},
function(accessToken, refreshToken, profile, cb){
    User.findOrCreate({googleId: profile.id}, function(err, user){
        return cb(err, user);
    });
}
));
app.get("/", function (req, res) {
    res.render("home");
});
app.get("/auth/google", 
passport.authenticate("google", {scope: ['profile']})
);

app.get("/auth/google/secrets", 
passport.authenticate("google", {failureRedirect: "/login"}),
function(req, res){
    res.redirect("/secrets");
});
app.get("/login", function (req, res) {
    res.render("login");
});
app.get("/register", function (req, res) {
    res.render("register");
});
app.get("/secrets", function(req, res){
    if (req.isAuthenticated()){
        res.render("secrets");
    }
else { res.redirect("/login");
}
});
app.get("/logout", function(req, res){
    req.session.destroy((err) => {
        if (!err){
            req.logout();    
            // res.sendStatus(200);
            res.redirect("/");
        }
    });
});


app.post("/register", function (req, res) {
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/login", function (req, res) {
const user = new User({
    username: req.body.username,
    password: req.body.password
});
req.login(user, function(err){
    if (err){
        console.log(err);
    } else {
        passport.authenticate("local")(req, res, function(){
            res.redirect("/secrets");
        });
    }
});
});



app.listen(3000, function () {
    console.log("Listening on 3000");
});