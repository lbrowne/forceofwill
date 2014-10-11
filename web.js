var gzippo = require('gzippo');
var express = require('express');
var morgan = require('morgan');
var cors = require('cors');
var https = require('https');
var app = express();
app.use(cors());

// Database
var mongo = require('mongoskin');

switch(process.env.NODE_ENV){

        case 'production':
        	var BASEDIR = "/dist";
          var DBURL = "lennon.mongohq.com:10041/app30136505";
          var USERNAME = "niko";
          var PASSWORD = "bambumbim";
          var db = mongo.db("mongodb://"+USERNAME+":"+PASSWORD+"@"+DBURL, {native_parser:true});
          break;
        
        default:
          var BASEDIR = "/app";
          var DBURL = "localhost:27017/app30136505";
          var db = mongo.db("mongodb://"+DBURL, {native_parser:true});
          break;
			
}

var checkToken = function(req,res,next,token){

    //Options and callbacks for token validation
    var checkAppId = function(response) {
      
      var str = '';
      response.on('data', function (chunk) {
        str += chunk;
      });
      response.on('end', function () {
        //console.log(str);
        var fbauth = JSON.parse(str);

        //validation
        if(fbauth.id === "716407968436535" || fbauth.id === "568442163257885"){
            req.token = token;
            // retrieving app id parameter for future use
            req.appId = fbauth.id;
            next();
        }
      });
    }

    //https://graph.facebook.com/app?access_token={accessToken}
    var appIdOptions = {
      host: 'graph.facebook.com',
      path: '/app?access_token='+token,
      method: 'GET'
    };

    var getUserId = function(response) {
      
      var str = '';
      response.on('data', function (chunk) {
        str += chunk;
      });
      response.on('end', function () {
        var fbauth = JSON.parse(str);

        //validation
        if(fbauth.id){
            // making db available to other routers
            req.db = db;
            // retrieving user id parameter for future use
            req.userId = fbauth.id;
            https.request(appIdOptions, checkAppId).end();
        }
      });
    }

    //Checking FB API for token correctness
    //https://graph.facebook.com/me?access_token={accessToken}
    var userIdOptions = {
      host: 'graph.facebook.com',
      path: '/me?access_token='+token,
      method: 'GET'
    };

    https.request(userIdOptions, getUserId).end(); 
}

// Authenticate user at each request
app.use("/api",function(req,res,next){
    var token = req.query.token;
    console.log("Token: ",token);
    checkToken(req,res,next, token);
});
// API
//	CARDS
var cards = require("" + __dirname +BASEDIR+'/api/cards');
app.use('/api/cards', cards);
//  DECKS
var decks = require("" + __dirname +BASEDIR+'/api/decks');
app.use('/api/decks', decks);

app.use(morgan('dev'));
app.use(gzippo.staticGzip("" + __dirname + BASEDIR));
app.listen(process.env.PORT || 5000);
