require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
// const md5 = require('md5');
// const encrypt = require('mongoose-encryption');
const bcrypt = require('bcrypt');
const saltRounds=10;

const app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
mongoose.connect("mongodb://0.0.0.0:27017/usersDB", {useNewUrlParser: true});

const usersSchema =new mongoose.Schema ({
    email: String,
    password: String
});
// usersSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:["password"]});

const User = mongoose.model("User", usersSchema);


app.get("/", function (req, res) {
    res.render("home");
});


app.get("/login", function (req, res) {
    res.render('login');
});

app.get("/register", function (req, res) {
    res.render('register');
});

app.post("/register", function (req, res) {
    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
        const newUser = new User({
            email: req.body.username,
            password: hash
        });
        newUser.save().then((result) => res.render('secrets')).catch((err) => res.send(err));
    })

});

app.post("/login", function (req, res) {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email: username}).then(function (foundUser) {
        if (foundUser) {
            bcrypt.compare(password,foundUser.password,function(err,result){
                if(result){
                    res.render('secrets');
                }else{
                    res.send("Wrong Password");
                }
            });
        }else{
            res.send("No Users Found")
        }
    });
});


app.listen(3000, () => console.log("Server Running on Port 3000"));
