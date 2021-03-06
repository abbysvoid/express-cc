const express = require('express');
const router = express.Router();
const expressValidator = require('express-validator');
const passport = require('passport');
const bcrypt = require('bcrypt');

const saltRounds = 10;

router.get('/login', function(req, res) {
  res.render('login', {title: 'Login'});
});

router.post('/login', passport.authenticate('local', {
    successRedirect: '/profile',
    failureRedirect: '/login',
  })
);

router.get('/logout', function(req, res) {
  req.logout();
  req.session.destroy();
  res.redirect('/');
});

router.get('/register', function(req, res, next) {
  res.render('register', {title: 'Registration'});
});

router.get('/', function(req, res, next) {
  console.log('user:', req.user);
  console.log('is authcd:', req.isAuthenticated());
  res.render('home', {title: 'Home'});
});

router.get('/profile', authenticationMiddleware(), function(req, res, next) {
  console.log('user:', req.user);
  console.log('is authcd:', req.isAuthenticated());
  res.render('profile', {title: 'Profile', user: req.user});
});

router.post('/register', function(req, res, next) {
  ``;
  req.checkBody('username', 'Usarname cannot be empty').notEmpty();
  req.checkBody('username', 'Username must be between 3-15 characters long.').len(3, 15);
  req.checkBody('email', 'The email you entered is invalid, please try again.')
    .isEmail();
  req.checkBody(
      'email',
      'Email address must be between 4-100 characters long, please try again.'
    ).len(4, 100);
  // req.checkBody('password', 'Password must be between 4-50 characters long.').len(4, 50);
  // req.checkBody('password', "Password must include one lowercase character, one uppercase character, a number, and a special character.").matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?!.* )(?=.*[^a-zA-Z0-9]).{4,}$/, "i");
  req.checkBody(
      'passwordMatch',
      'Password must be between 8-100 characters long.'
    )
    .len(4, 50);
  req
    .checkBody('passwordMatch', 'Passwords do not match, please try again.')
    .equals(req.body.password);

  // Additional validation to ensure username is alphanumeric with underscores and dashes
  req
    .checkBody(
      'username',
      'Username can only contain letters, numbers, or underscores.'
    )
    .matches(/^[A-Za-z0-9_-]+$/, 'i');

  const errors = req.validationErrors();
  if (errors) {
    console.log(`errors: ${JSON.stringify(errors)}`);
    res.render('register', {title: 'Registration Error', errors: errors});
  } else {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    console.log(
      req.body.email,
      req.body.username,
      req.body.password == req.body.passwordMatch
    );

    const db = require('../db.js');
    bcrypt.hash(password, saltRounds, function(err, hash) {
      console.log('HASH:', hash);
      db.query(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hash],
        (err, result, fields) => {
          if (err) throw err;
          db.query(
            'SELECT LAST_INSERT_ID() as user_id',
            (err, result, fields) => {
              if (err) {
                console.log('something wrong with db');
                throw err;
              } else {
                const user_id = result[0];
                console.log('user_id:', user_id);
                // this comes from passport and creates session for user
                req.login(user_id, err => {
                  res.redirect('/');
                });
              }
            }
          );
        }
      );
    });
  }
});

passport.serializeUser(function(user_id, done) {
  done(null, user_id);
});

passport.deserializeUser(function(user_id, done) {
  done(null, user_id);
});

function authenticationMiddleware() {
  return (req, res, next) => {
    console.log(
      `req.session.passport.user: ${JSON.stringify(req.session.passport)}`
    );
    if (req.isAuthenticated()) {
      console.log('AUTH->PASS');
      return next();
    }
    console.log('AUTH->DENY!!!');
    res.redirect('/login');
  };
}

module.exports = router;
