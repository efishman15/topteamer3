//----------------------------------------------------
// Globals
//----------------------------------------------------
var path = require('path');
var logger = require(path.resolve(__dirname, './utils/logger'));
var express = require('express');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var credentials = require(path.resolve(__dirname, './business_logic/credentials'))
var quiz = require(path.resolve(__dirname, './business_logic/quiz'))
var contests = require(path.resolve(__dirname, './business_logic/contests'));
var exceptions = require(path.resolve(__dirname, './utils/exceptions'))
var generalUtils = require(path.resolve(__dirname, './utils/general'));
var sessionUtils = require(path.resolve(__dirname, './business_logic/session'));
var payments = require(path.resolve(__dirname, './business_logic/payments'));
var dalDb = require(path.resolve(__dirname, './dal/dalDb'));
var http = require('http');
var https = require('https');
var fs = require('fs');
var facebookCanvas = require(path.resolve(__dirname, './api/facebookCanvas'));
var paypalIPN = require(path.resolve(__dirname, './api/paypalPN'));
var leaderboards = require(path.resolve(__dirname, './business_logic/leaderboards'));
var systemBusinessLogic = require(path.resolve(__dirname, './business_logic/system'));
var downloadUtils = require(path.resolve(__dirname, './utils/download'));

var domain = require('domain');

var app = express();

app.use(bodyParser());          // pull information from html in POST
app.use(methodOverride());      // simulate DELETE and PUT
app.use(express.static(path.resolve(__dirname, '../www')));

//Jade
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set('view options', {layout: true});

//----------------------------------------------------
// Main request processor function
// Wraps requests in a domain to catch errors
//----------------------------------------------------
app.use(function runInsideDomain(req, res, next) {
  var reqDomain = domain.create();

  res.on('close', function () {
    reqDomain.dispose();
  });

  reqDomain.on('error', function (err) {
    exceptions.ServerException('app unhandled server exception',err,'fatal');
    reqDomain.dispose();
    next(err);
  });

  reqDomain.run(next);
});

//----------------------------------------------------
// Headers
//----------------------------------------------------
app.all('*', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');
  next();
});

//----------------------------------------------------
// isAuthenticated
//
// Checks if request contains authorization token
//----------------------------------------------------
function isAuthenticated(req, res, next) {
  if (req.headers.authorization) {
    next();
  }
  else {
    res.send(401, 'Not Authenticated.')
  }
}

dalDb.loadSettings(null, function (err, data) {

  //Block server listener until settings loaded from db
  generalUtils.injectSettings(data.settings);

  //----------------------------------------------------
  // API's that require authentication
  //----------------------------------------------------
  app.post('/user/logout', isAuthenticated, credentials.logout);
  app.post('/user/setGcmRegistration', sessionUtils.setGcmRegistration);
  app.post('/user/set', credentials.setUser);
  app.post('/user/upgradeGuest', credentials.upgradeGuest);
  app.post('/user/toggleSettings', sessionUtils.toggleSettings);
  app.post('/user/switchLanguage', sessionUtils.switchLanguage);
  app.post('/quiz/start', isAuthenticated, quiz.start);
  app.post('/quiz/answer', isAuthenticated, quiz.answer);
  app.post('/quiz/nextQuestion', isAuthenticated, quiz.nextQuestion);
  app.post('/quiz/setQuestionByAdmin', isAuthenticated, quiz.setQuestionByAdmin);

  app.post('/contests/get', isAuthenticated, contests.getContest);
  app.post('/contests/set', isAuthenticated, contests.setContest);
  app.post('/contests/remove', isAuthenticated, contests.removeContest);
  app.post('/contests/list', isAuthenticated, contests.getContests);
  app.post('/contests/join', isAuthenticated, contests.joinContest);
  app.post('/contests/getQuestions', isAuthenticated, contests.getQuestionsByIds);
  app.post('/contests/searchMyQuestions', isAuthenticated, contests.searchMyQuestions);
  app.post('/payments/paypal/buy', isAuthenticated, payments.payPalBuy);
  app.post('/payments/process', isAuthenticated, payments.processPayment);
  app.post('/leaderboard/contest', isAuthenticated, leaderboards.getContestLeaders);
  app.post('/leaderboard/friends', isAuthenticated, leaderboards.getFriends);
  app.post('/leaderboard/weekly', isAuthenticated, leaderboards.getWeeklyLeaders);
  app.post('/system/clearCache', isAuthenticated, systemBusinessLogic.clearCache);
  app.post('/system/restart', isAuthenticated, systemBusinessLogic.restart);
  app.post('/system/upgradeDb', isAuthenticated, systemBusinessLogic.upgradeDb);

  //----------------------------------------------------
  // API's that do NOT require authentication
  //----------------------------------------------------
  app.post('/user/connect', credentials.connect);

  //Old legacy call to support older clients
  app.post('/user/facebookConnect', credentials.facebookConnect);

  app.post('/info/settings', generalUtils.getSettings);
  app.post('/facebook/canvas', facebookCanvas.canvas);
  app.get('/facebook/product/:productId/:language', facebookCanvas.getProductDetails);
  app.get('/facebook/profile/:id/:language', facebookCanvas.getProfileDetails);
  app.get('/facebook/game/:language', facebookCanvas.getGameDetails);
  app.get('/facebook/contest/:contestId', facebookCanvas.getContestDetails);
  app.get('/facebook/contestLeader/:contestId', facebookCanvas.getContestLeaderDetails);
  app.get('/facebook/team/:contestId/:teamId', facebookCanvas.getTeamDetails);
  app.get('/facebook/teamLeader/:contestId/:teamId', facebookCanvas.getTeamLeaderDetails);
  app.post('/facebook/dynamicPricing', facebookCanvas.dynamicPricing);
  app.get('/facebook/ipn', facebookCanvas.getChallenge);
  app.post('/facebook/ipn', facebookCanvas.ipn);
  app.post('/paypal/ipn', paypalIPN.ipn);
  app.get('/download', downloadUtils.download);
  app.get('/download/:platform', downloadUtils.download);
  app.get('/download/:platform/:version', downloadUtils.download);
  app.post('/client/error', generalUtils.logClientError);

  //Does require a token but in the get url as parameter
  app.get('/system/log/:type/:token', systemBusinessLogic.showLog);

  //----------------------------------------------------
  // Start server listener
  //----------------------------------------------------
  app.use(function (err, req, res, next) {
    var exception = new exceptions.UnhandledServerException(err);
    res.status(exception.httpStatus).send(exception);
    res.end();
  });

  var certificate = {
    key: fs.readFileSync(path.resolve(__dirname, './certificates/topteamer.com.key')),
    ca: [fs.readFileSync(path.resolve(__dirname, './certificates/gd_bundle-g2-g1.crt'))],
    cert: fs.readFileSync(path.resolve(__dirname, './certificates/topteamer.crt'))
  }

  http.createServer(app).listen(80);
  https.createServer(certificate, app).listen(443);

  logger.server.info(null, 'server is up!');
  logger.mail.info(null, 'server is up!');

})
