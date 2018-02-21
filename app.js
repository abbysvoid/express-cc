var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
const expressValidator = require('express-validator');

const session = require('express-session');
const passport = require('passport');
// session will be canceled only with logout, not after node restart
const MySQLStore = require('express-mysql-session')(session); 
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

var index = require('./routes/index');
var users = require('./routes/users');

var app = express();

require('dotenv').config();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(expressValidator()) // must be immed. after bodyParser
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const options = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database : process.env.DB_NAME
}
const sessionStore = new MySQLStore(options);

app.use(session({
  secret: 'rAnd0m $trINg',
  resave: false,
  store: sessionStore,
  saveUninitialized: false, // cookie only when authorized
  // cookie: { secure: true }
}))

app.use(passport.initialize());
app.use(passport.session());

app.use(function(req, res, next) {
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
})

app.use('/', index);
app.use('/users', users);

passport.use(new LocalStrategy(
  function(username, password, done) {
    console.log('Pswd localstrat:', username, password);
    const db = require('./db');
    db.query('SELECT password FROM users where username = ?',
      [username], (err, results, fields) => {
        if (err) {console.log('EEE!'); done(err)} // done provided by passport
        console.log('DBres:', results);
        if (results.length === 0) {
          done(null, false);
        } else {
          console.log('Going on...')
          const hash = results[0].password.toString();
          console.log("HASH:", hash)
          bcrypt.compare(password, hash, (err, response) => {
            if (response === true) {
              console.log('AUTHENTCD', username);
              return done(null, username)
            } else {
              console.log('REJECTED', username);
              return done(null, false);
            }
          })
        }
      })
  }
));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


// Handlebars default config
const hbs = require('hbs');
const fs = require('fs');

const partialsDir = __dirname + '/views/partials';

const filenames = fs.readdirSync(partialsDir);

filenames.forEach(function (filename) {
  const matches = /^([^.]+).hbs$/.exec(filename);
  if (!matches) {
    return;
  }
  const name = matches[1];
  const template = fs.readFileSync(partialsDir + '/' + filename, 'utf8');
  hbs.registerPartial(name, template);
});

hbs.registerHelper('json', function(context) {
    return JSON.stringify(context, null, 2);
});


module.exports = app;
