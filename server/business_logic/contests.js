var path = require('path');
var async = require('async');
var mathjs = require('mathjs');
var dalDb = require(path.resolve(__dirname, '../dal/dalDb'));
var dalBranchIo = require(path.resolve(__dirname, '../dal/dalBranchIo'));
var exceptions = require(path.resolve(__dirname, '../utils/exceptions'));
var commonBusinessLogic = require(path.resolve(__dirname, './common'));
var generalUtils = require(path.resolve(__dirname, '../utils/general'));
var dalLeaderboards = require(path.resolve(__dirname, '../dal/dalLeaderboards'));
var pushUtils = require(path.resolve(__dirname, '../utils/pushNotifications'));
var randomUtils = require(path.resolve(__dirname, '../utils/random'));

//---------------------------------------------------------------------
// public functions for other modules
//---------------------------------------------------------------------

//---------------------------------------------------------------------
// sendPush
// users - list of user objects containing gcmRegistrationId each
// contest - contest Object
// alertName - name of alert pointing to generalUtils.settings.server.contest.alerts[xxx]
//---------------------------------------------------------------------
module.exports.sendPush = sendPush;
function sendPush(users, contest, alertName, team) {

  var notifications = generalUtils.settings.server.contest.alerts[alertName].notifications;

  //Will pick a random notification from the array
  var notification = randomUtils.pick(notifications);

  var messageData = {};
  var titleKey = randomUtils.pick(notification.title);
  var messageKey = randomUtils.pick(notification.message);

  //All possible params to be replaced in all the texts
  var params = {'team0': contest.teams[0].name, 'team1': contest.teams[1].name};
  var winningTeam;
  if (contest.teams[0].score > contest.teams[1].score) {
    winningTeam = 0;
  }
  else if (contest.teams[0].score < contest.teams[1].score) {
    winningTeam = 1;
  }
  else {
    //Picks a random team
    winningTeam = randomUtils.pick([0, 1]);
  }

  params.winningTeam = contest.teams[winningTeam].name;
  params.losingTeam = contest.teams[1 - winningTeam].name;

  //-------------------
  // time.end
  //-------------------
  var number;
  var units;
  var minutes;

  var now = (new Date()).getTime();
  minutes = mathjs.abs(contest.endDate - now) / 1000 / 60;
  if (minutes >= 60 * 24) {
    number = mathjs.ceil(minutes / 24 / 60);
    units = 'DAYS';
  }
  else if (minutes >= 60) {
    number = mathjs.ceil(minutes / 60);
    units = 'HOURS';
  }
  else {
    number = mathjs.ceil(minutes);
    units = 'MINUTES';
  }

  params.contestEndsNumber = number;
  params.contestEndsUnits = generalUtils.translate(contest.language, units);
  params.yourTeam = contest.teams[0].name;

  messageData.title = generalUtils.settings.server.contest.alerts.text[contest.language][titleKey].format(params);
  messageData.message = generalUtils.settings.server.contest.alerts.text[contest.language][messageKey].format(params);

  if (notification.style && notification.style === 'picture') {
    messageData.style = 'picture';
    messageData.summaryText = messageData.message;
    messageData.picture = randomUtils.pick(notification.picture);
  }

  messageData.contestId = contest._id.toString();
  messageData.icon = notification.icon;
  messageData.image = notification.image;
  messageData.color = notification.color;

  //Split the push into 2 messages - one for each team
  var users0 = [];
  var users1 = [];
  for (var i = 0; i < users.length; i++) {
    if (contest.users[users[i]._id.toString()].team === 0) {
      users0.push(users[i].gcmRegistrationId)
    }
    if (contest.users[users[i]._id.toString()].team === 1) {
      users1.push(users[i].gcmRegistrationId)
    }
  }

  if (users0.length > 0 && (team === undefined || team === null || team === 0)) {
    messageData.buttonText = generalUtils.translate(contest.language, 'PLAY_FOR_TEAM', {'team': contest.teams[0].name});
    messageData.buttonCssClass = 'chart-popup-button-team-small-0';

    //Done async - do not wait for response
    pushUtils.send(users0, messageData);
  }

  if (users1.length > 0 && (team === undefined || team === null || team === 1)) {
    var messageData1
    if (users0.length > 0) {
      //Clone the message not to change button text and style while prev message is still sending
      messageData1 = JSON.parse(JSON.stringify(messageData));
    }
    else {
      messageData1 = messageData;
    }
    params.yourTeam = contest.teams[1].name;
    messageData1.title = generalUtils.settings.server.contest.alerts.text[contest.language][titleKey].format(params);
    messageData1.message = generalUtils.settings.server.contest.alerts.text[contest.language][messageKey].format(params);

    messageData1.buttonText = generalUtils.translate(contest.language, 'PLAY_FOR_TEAM', {'team': contest.teams[1].name});
    messageData1.buttonCssClass = 'chart-popup-button-team-small-1';

    //Done async - do not wait for response
    pushUtils.send(users1, messageData1);
  }
}

//----------------------------------------------------
// setUserQuestions
//----------------------------------------------------
function setUserQuestions(questionIndex, data, callback) {
  //Check if finished recursion cycle
  if (questionIndex === data.contest.type.questions.list.length) {
    setUserQuestionIds(data, callback);
    return;
  }

  if (data.mode === 'add' &&
    data.contest.type.questions.list[questionIndex]._id !== 'new' &&
    data.contest.type.questions.list[questionIndex].deleted
  ) {
    //Proceed to next question - when adding a new contest, and a physical question
    //Has been added and deleted, this question also belongs to another existing contest
    //Disregard this question
    setUserQuestions(questionIndex + 1, data, callback);
    return;
  }

  if (data.contest.type.questions.list[questionIndex]._id === 'new') {

    //Add question text
    data.newQuestion = {};
    data.newQuestion.text = data.contest.type.questions.list[questionIndex].text;

    //Add Answers
    data.newQuestion.answers = [];
    for (var j = 0; j < data.contest.type.questions.list[questionIndex].answers.length; j++) {
      var answer = {'text': data.contest.type.questions.list[questionIndex].answers[j]};
      if (j === 0) {
        answer.correct = true;
      }
      data.newQuestion.answers.push(answer);
    }

    dalDb.insertQuestion(data, function (err, result) {

      if (err) {
        callback(new exceptions.ServerException('Error adding a new user question', data, 'error'));
        return;
      }

      data.contest.type.questions.list[questionIndex]._id = data.newQuestion._id;

      setUserQuestions(questionIndex + 1, data, callback);
    });
  }
  else if (data.contest.type.questions.list[questionIndex].isDirty) {
    //Set question - update text/answers and/or associate to the current contest
    data.questionId = data.contest.type.questions.list[questionIndex]._id;

    data.unsetData = null;
    data.setData = {};

    //Question text or answers text has been modified
    data.setData.text = data.contest.type.questions.list[questionIndex].text;
    for (j = 0; j < data.contest.type.questions.list[questionIndex].answers.length; j++) {
      data.setData['answers.' + j + '.text'] = data.contest.type.questions.list[questionIndex].answers[j];
    }

    dalDb.setQuestion(data, function (err, result) {
      if (err) {
        callback(new exceptions.ServerException('Error updating question', data, 'error'));
        return;
      }
      setUserQuestions(questionIndex + 1, data, callback);
    });
  }
  else {
    setUserQuestions(questionIndex + 1, data, callback);
  }
}

//----------------------------------------------------
// setUserQuestionIds
//----------------------------------------------------
function setUserQuestionIds(data, callback) {
  data.contest.type.userQuestions = [];
  for (var i = 0; i < data.contest.type.questions.list.length; i++) {
    if (!data.contest.type.questions.list[i].deleted) {
      data.contest.type.userQuestions.push(data.contest.type.questions.list[i]._id);
    }
  }

  delete data.contest.type.questions;

  callback(null, data);
}


//----------------------------------------------------
// validateContestData
//
// data:
// input: DbHelper, contest, mode (add, edit), session
// output: modified contest with server logic
//----------------------------------------------------
function validateContestData(data, callback) {

  //Data validations

  //Empty contest
  if (!data.contest) {
    callback(new exceptions.ServerException('Contest not supplied'));
    return;
  }

  //Adding new contest is locked
  if (data.mode === 'add' && data.session.features.newContest.locked) {
    callback(new exceptions.ServerException('Attempt to create a new contest without having an eligible rank or feature asset', {
      'session': data.session,
      'contest': data.contest
    }, 'error'));
    return;
  }

  //Required fields
  if (!data.contest.startDate || !data.contest.endDate || !data.contest.teams || !data.contest.type || !data.contest.subject) {
    callback(new exceptions.ServerException('One of the required fields not supplied: startDate, endDate, teams, type, subject', {}, 'error'));
    return;
  }

  //End date must be AFTER start date
  if (data.contest.startDate > data.contest.endDate) {
    callback(new exceptions.ServerException('Contest end date must be later than contest start date', {}, 'error'));
    return;
  }

  //Status
  var now = (new Date()).getTime();

  //Cannot edit an ended contest
  if (data.contest.endDate < now && !data.session.isAdmin) {
    callback(new exceptions.ServerException('You cannot edit a contest that has already been finished', {'contestId': data.contest._id}, 'error'));
    return;
  }

  //Only 2 teams are allowed
  if (data.contest.teams.length !== 2) {
    callback(new exceptions.ServerException('Number of teams must be 2', {}, 'error'));
    return;
  }

  //One or more of the team names is missing
  if (!data.contest.teams[0].name || !data.contest.teams[1].name) {
    callback(new exceptions.ServerException('One or more of the team names are missing', {}, 'error'));
    return;
  }

  //Teams must have different names
  if (data.contest.teams[0].name.trim() === data.contest.teams[1].name.trim()) {
    callback(new exceptions.ServerMessageException('SERVER_ERROR_TEAMS_MUST_HAVE_DIFFERENT_NAMES'));
    return;
  }

  //Contest _id must be supplied in edit mode
  if (data.mode === 'edit' && !data.contest._id) {
    callback(new exceptions.ServerException('Contest _id not supplied in edit mode', {}, 'error'));
    return;
  }

  //Illegal contest type
  if (!data.contest.type || !data.contest.type.id) {
    callback(new exceptions.ServerException('type/type.id must be supplied', {}, 'error'));
    return;
  }

  if (!generalUtils.settings.client.newContest.contestTypes[data.contest.type.id]) {
    callback(new exceptions.ServerException('type id"' + data.contest.type.id + '" is illegal', {}, 'error'));
    return;
  }

  //User questions validations
  if (data.contest.type.id === 'userTrivia') {

    //Minimum check
    if (!data.contest.type.questions || data.contest.type.questions.visibleCount < generalUtils.settings.client.newContest.privateQuestions.min) {
      if (generalUtils.settings.client.newContest.privateQuestions.min === 1) {
        callback(new exceptions.ServerMessageException('SERVER_ERROR_MINIMUM_USER_QUESTIONS_SINGLE', {'minimum': generalUtils.settings.client.newContest.privateQuestions.min}));
      }
      else {
        callback(new exceptions.ServerMessageException('SERVER_ERROR_MINIMUM_USER_QUESTIONS_PLURAL', {'minimum': generalUtils.settings.client.newContest.privateQuestions.min}));
      }
      return;
    }

    //Maximum check
    if (data.contest.type.questions && data.contest.type.questions.visibleCount > generalUtils.settings.client.newContest.privateQuestions.max) {
      callback(new exceptions.ServerMessageException('SERVER_ERROR_MAXIMUM_USER_QUESTIONS', {'maximum': generalUtils.settings.client.newContest.privateQuestions.max}));
      return;
    }

    //Question list not supplied
    if (!data.contest.type.questions.list || !data.contest.type.questions.list.length) {
      callback(new exceptions.ServerException('questions.list must contain the array of questions', {}, 'error'));
      return;
    }

    var questionHash = {};
    for (var i = 0; i < data.contest.type.questions.list.length; i++) {

      //Question must contain text
      if (!data.contest.type.questions.list[i].text) {
        callback(new exceptions.ServerException('Question must contain text', {}, 'error'));
        return;
      }

      //Question must contain answers
      if (!data.contest.type.questions.list[i].answers || !data.contest.type.questions.list[i].answers.length || data.contest.type.questions.list[i].answers.length !== 4) {
        callback(new exceptions.ServerException('Question must contain 4 answers', {}, 'error'));
        return;
      }

      //Count duplicate questions
      if (!data.contest.type.questions.list[i].deleted) {
        if (questionHash[data.contest.type.questions.list[i].text.trim()]) {
          callback(new exceptions.ServerMessageException('SERVER_ERROR_QUESTION_ALREADY_EXISTS', {'question': data.contest.type.questions.list[i]}));
          return;
        }
        questionHash[data.contest.type.questions.list[i].text.trim()] = true;
      }

      //Count duplicate answers inside a question
      var answersHash = {};
      for (var j = 0; j < data.contest.type.questions.list[i].answers[j]; j++) {
        if (answersHash[data.contest.type.questions.list[i].answers[j].trim()]) {
          callback(new exceptions.ServerMessageException('SERVER_ERROR_ENTER_DIFFERENT_ANSWERS', {'question': data.contest.typ.questions.list[i]}));
          return;
        }
        answersHash[data.contest.type.questions.list[i].answers[j].trim()] = true;
      }
    }
  }

  if (data.mode === 'add') {

    var cleanContest = {};
    cleanContest.startDate = data.contest.startDate;
    cleanContest.endDate = data.contest.endDate;
    cleanContest.endOption = data.contest.endOption;

    cleanContest.teams = [
      {
        name: data.contest.teams[0].name,
        score: data.session.isAdmin && data.contest.teams[0].adminScoreAddition ? data.contest.teams[0].adminScoreAddition : 0
      },
      {
        name: data.contest.teams[1].name,
        score: data.session.isAdmin && data.contest.teams[1].adminScoreAddition ? data.contest.teams[1].adminScoreAddition : 0
      },
    ];

    if (data.contest.type.id === 'systemTrivia') {
      cleanContest.subject = generalUtils.translate(data.session.settings.language, generalUtils.settings.client.newContest.contestTypes['systemTrivia'].text.name, {name: data.session.name});
    }
    else {
      cleanContest.subject = data.contest.subject;
    }

    cleanContest.participants = 0;
    if (data.contest.systemParticipants) {
      cleanContest.systemParticipants = data.contest.systemParticipants;
    }
    else {
      cleanContest.systemParticipants = 0;
    }
    if (data.contest.rating) {
      cleanContest.rating = data.contest.rating;
    }
    else {
      cleanContest.rating = 0;
    }

    cleanContest.language = data.session.settings.language;
    cleanContest.score = 0; //The total score gained for this contest

    cleanContest.creator = {
      id: data.session.userId,
      name: data.session.name,
      date: now,
      avatar: commonBusinessLogic.getAvatar(data.session)
    };

    cleanContest.type = {};
    cleanContest.type.id = data.contest.type.id;
    if (cleanContest.type.id === 'userTrivia') {
      cleanContest.type.questions = data.contest.type.questions;
      cleanContest.type.randomOrder = data.contest.type.randomOrder ? true : false;
    }

    //Copy endAlerts definitions
    if (generalUtils.settings.server.contest.alerts.contestEnds.timing[cleanContest.endOption]) {
      cleanContest.endAlerts = [];
      for (var i = 0; i < generalUtils.settings.server.contest.alerts.contestEnds.timing[cleanContest.endOption].length; i++) {
        cleanContest.endAlerts.push(
          {
            'timeToEnd': generalUtils.settings.server.contest.alerts.contestEnds.timing[cleanContest.endOption][i],
            'sent': false
          });
      }
    }

    //Now the data.contest object is 'clean' and contains only fields that passed validation
    data.contest = cleanContest;
  }

  if (data.contest.systemParticipants && !data.session.isAdmin) {
    //Allowed only for admins
    delete data.contest.systemParticipants;
  }

  if (data.contest.rating && !data.session.isAdmin) {
    //Allowed only for admins
    delete data.contest.rating;
  }

  callback(null, data);
}

//----------------------------------------------------
// updateContest
//----------------------------------------------------
function updateContest(data, callback) {

  data.checkOwner = true;

  data.setData = {};

  //Non admin fields
  data.setData['teams.0.name'] = data.contest.teams[0].name;
  data.setData['teams.1.name'] = data.contest.teams[1].name;

  //Subject can be updated by admins only or by contest owners but only for userTrivia
  if (data.session.isAdmin || data.contest.type.id === 'userTrivia') {
    data.setData['subject'] = data.contest.subject;
    data.setData.endDate = data.contest.endDate;
  }

  if (data.contest.clearEndAlerts) {
    //Sent in case endDate is changed
    data.unsetData = {};
    data.unsetData[endAlerts] = '';
  }

  if (data.contest.type.id === 'userTrivia') {
    data.setData['type.userQuestions'] = data.contest.type.userQuestions;
    data.setData['type.randomOrder'] = data.contest.type.randomOrder ? true : false;
  }

  //Admin fields
  if (data.session.isAdmin) {

    data.setData['startDate'] = data.contest.startDate;

    if (data.contest.teams[0].adminScoreAddition != null && data.contest.teams[1].adminScoreAddition != null) {
      data.incData = {}
      data.incData['teams.0.score'] = data.contest.teams[0].adminScoreAddition;
      data.incData['teams.1.score'] = data.contest.teams[1].adminScoreAddition;
    }

    if (data.contest.systemParticipants != null) {
      data.setData['systemParticipants'] = data.contest.systemParticipants;
    }
    if (data.contest.rating != null) {
      data.setData['rating'] = data.contest.rating;
    }
  }

  dalDb.setContest(data, callback);
}

//---------------------------------------------------------------------
// joinContest
//
// data:
// input: contestId, teamId
// output: modified contest with server logic
//---------------------------------------------------------------------
module.exports.joinContest = joinContest;
function joinContest(req, res, next) {

  var token = req.headers.authorization;
  var data = req.body;

  if (!data.contestId) {
    exceptions.ServerResponseException(res, 'contestId not supplied', null, 'warn', 424);
    return;
  }

  if (data.teamId !== 0 && data.teamId !== 1) {
    callback(new exceptions.ServerResponseException('SERVER_ERROR_NOT_JOINED_TO_CONTEST'));
    return;
  }

  var operations = [

    //Connect to the database (so connection will stay open until we decide to close it)
    dalDb.connect,

    //Retrieve the session
    function (connectData, callback) {
      data.DbHelper = connectData.DbHelper;
      data.token = token;
      dalDb.retrieveSession(data, callback);
    },

    //Retrieve the contest
    dalDb.getContest,

    //Join the contest
    joinContestTeam,

    //Store the session's xp progress in the db
    function (data, callback) {

      data.clientResponse = {'contest': commonBusinessLogic.prepareContestForClient(data.contest, data.session)};

      if (data.newJoin) {
        commonBusinessLogic.addXp(data, 'joinContest');
        data.clientResponse.xpProgress = data.xpProgress;
        data.setData = {'xp': data.session.xp, 'rank': data.session.rank};
        dalDb.setSession(data, callback);
      }
      else {
        callback(null, data);
      }
    },

    //Store the user's xp progress in the db
    function (data, callback) {
      //Save the user to the db - session will be stored at the end of this block
      if (data.newJoin) {
        data.closeConnection = true;
        dalDb.setUser(data, callback);
      }
      else {
        dalDb.closeDb(data);
        callback(null, data);
      }
    }
  ];

  async.waterfall(operations, function (err, data) {
    if (!err) {
      res.json(data.clientResponse);
    }
    else {
      res.send(err.httpStatus, err);
    }
  });

}

//---------------------------------------------------------------------
// joinContestTeam
// Data: contest, session, teamId
// Actual joining to the contest object and database update
//---------------------------------------------------------------------
module.exports.joinContestTeam = joinContestTeam;
function joinContestTeam(data, callback) {

  //Status
  var now = (new Date()).getTime();

  //Cannot join a contest that ended
  if (data.contest.endDate < now) {
    data.DbHelper.close();
    callback(new exceptions.ServerException('Contest has already been finished', data, 'error'));
  }

  //Already joined this team - exit
  if (data.contest.users && data.contest.users[data.session.userId] && data.contest.users[data.session.userId].team === data.teamId) {
    data.DbHelper.close();
    callback(new exceptions.ServerException('Already joined to this team', data, 'error'));
    return;
  }

  data.setData = {};

  //Increment participants only if I did not join this contest yet
  if (joinToContestObject(data.contest, data.teamId, data.session)) {
    data.setData.participants = data.contest.participants;
    data.newJoin = true;
    data.setData.lastParticipantJoinDate = (new Date()).getTime();
  }

  data.setData['users.' + data.session.userId] = data.contest.users[data.session.userId];

  dalDb.setContest(data, callback);
}

//---------------------------------------------------------------------
// joinToContestObject
//
// Actual joining to the contest object in memory
//---------------------------------------------------------------------
function joinToContestObject(contest, teamId, session) {

  var newJoin = false;

  var now = (new Date).getTime();

  if (!contest.users) {
    contest.users = {};
    contest.leader = {
      id: session.userId,
      name: session.name,
      avatar: commonBusinessLogic.getAvatar(session)
    };
  }

  //Increment participants only if I did not join this contest yet
  if (!contest.users[session.userId]) {
    contest.participants++;
    contest.lastParticipantJoinDate = now;
    newJoin = true;
  }

  if (!contest.teams[teamId].leader) {
    contest.teams[teamId].leader = {
      id: session.userId,
      name: session.name,
      avatar: commonBusinessLogic.getAvatar(session)
    };
  }

  //Actual join
  if (newJoin) {
    contest.users[session.userId] = {
      'userId': session.userId,
      'joinDate': now,
      'team': teamId,
      'score': 0,
      'teamScores': [0, 0]
    };
  }
  else {
    //Switching teams
    contest.users[session.userId].team = teamId;
  }

  //If edit mode (has _id) - join the user to the contest's leader board (with zero score addition) to this team
  if (contest._id) {
    dalLeaderboards.addScore(contest._id, teamId, 0, session);
  }

  return newJoin;
}

//-----------------------------------------------------------------
// setContest
//
// data:
// input: contest, mode (add, edit)
// output: contest (extended)
//-----------------------------------------------------------------
module.exports.setContest = function (req, res, next) {

  var token = req.headers.authorization;
  var data = req.body;

  var operations = [

    //Connect to the database (so connection will stay open until we decide to close it)
    dalDb.connect,

    //Retrieve the session
    function (connectData, callback) {
      data.DbHelper = connectData.DbHelper;
      data.token = token;
      dalDb.retrieveSession(data, callback);
    },

    //Check contest fields and extend from with server side data
    validateContestData,

    //Add/set the contest questions (if we have)
    function (data, callback) {
      if (data.contest.type.questions) {
        setUserQuestions(0, data, callback);
      }
      else {
        callback(null, data);
      }
    },

    //Add/set the contest
    function (data, callback) {
      if (data.mode === 'add') {
        //Join by default to the first team (on screen appears as 'my team')
        joinToContestObject(data.contest, 0, data.session);
        dalDb.addContest(data, callback);
      }
      else {
        updateContest(data, callback);
      }
    },

    function (data, callback) {
      if (data.mode === 'add') {
        //In case of add - contest needed to be added in the previous operation first, to get an _id
        dalLeaderboards.addScore(data.contest._id, 0, 0, data.session);
        dalBranchIo.createContestLinks(data, callback);
      }
      else {
        callback(null, data);
      }
    },

    //In case of update - create a branch link first before updating the db
    function (data, callback) {
      if (data.mode === 'add') {
        //In case of add - update the links to the contest and team objects
        data.setData = {
          link: data.contest.link,
          leaderLink: data.contest.leaderLink,
          'teams.0.link': data.contest.teams[0].link,
          'teams.0.leaderLink': data.contest.teams[0].leaderLink,
          'teams.1.link': data.contest.teams[1].link,
          'teams.1.leaderLink': data.contest.teams[1].leaderLink
        };

        data.closeConnection = true;
        dalDb.setContest(data, callback);
      }
      else {
        dalDb.closeDb(data);
        callback(null, data);
      }
    },

    //Transform to client
    function (data, callback) {
      data.contest = commonBusinessLogic.prepareContestForClient(data.contest, data.session);
      callback(null, data);
    },

  ];

  async.waterfall(operations, function (err, data) {
    if (!err) {
      res.json(data.contest);
    }
    else {
      res.send(err.httpStatus, err);
    }
  });
};

//---------------------------------------------------------------
// removeContest

// data:
// input: contestId
// output: <NA>
//---------------------------------------------------------------
module.exports.removeContest = function (req, res, next) {
  var token = req.headers.authorization;
  var data = req.body;

  if (!data.contestId) {
    exceptions.ServerResponseException(res, 'contestId not supplied', null, 'warn', 424);
    return;
  }

  var operations = [

    //Connect to the database (so connection will stay open until we decide to close it)
    dalDb.connect,

    //Retrieve the session
    function (connectData, callback) {
      data.DbHelper = connectData.DbHelper;
      data.token = token;
      dalDb.retrieveSession(data, callback);
    },

    //Check that only admins are allowed to remove a contest
    function (data, callback) {
      if (!data.session.isAdmin) {
        callback(new exceptions.ServerException('Removing contest is allowed only for administrators', data, 'error'));
        return;
      }
      data.closeConnection = true;
      dalDb.removeContest(data, callback);
    },

    //Remove contest leaderboards
    dalLeaderboards.removeContestLeaderboards
  ];

  async.waterfall(operations, function (err, data) {
    if (!err) {
      res.json(generalUtils.okResponse);
    }
    else {
      res.send(err.httpStatus, err);
    }
  });
};

//-------------------------------------------------------------------------------------
// getContests

// data:
// input: tab (myContests,runningContests,recentlyFinishedContests)
//
// output: <NA>
//-------------------------------------------------------------------------------------
module.exports.getContests = function (req, res, next) {
  var token = req.headers.authorization;
  var data = req.body;

  var operations = [

    //Connect to the database (so connection will stay open until we decide to close it)
    dalDb.connect,

    //Retrieve the session
    function (connectData, callback) {

      data.DbHelper = connectData.DbHelper;
      data.token = token;
      dalDb.retrieveSession(data, callback);
    },

    dalDb.prepareContestsQuery,

    //Get contests from db
    function (data, callback) {
      data.closeConnection = true;
      dalDb.getContests(data, callback);
    }

  ];

  async.waterfall(operations, function (err, data) {
    if (!err) {
      res.json(data.contests);
    }
    else {
      res.send(err.httpStatus, err);
    }
  });
};

//-------------------------------------------------------------------------------------
// getContest

// data: contestId
// output: contest
//-------------------------------------------------------------------------------------
module.exports.getContest = function (req, res, next) {
  var token = req.headers.authorization;
  var data = req.body;

  if (!data.contestId) {
    exceptions.ServerResponseException(res, 'contestId not supplied', null, 'warn', 424);
    return;
  }

  var operations = [

    //Connect to the database (so connection will stay open until we decide to close it)
    dalDb.connect,

    //Retrieve the session
    function (connectData, callback) {

      data.DbHelper = connectData.DbHelper;
      data.token = token;
      dalDb.retrieveSession(data, callback);
    },

    //Retrieve the contest
    function (data, callback) {
      data.closeConnection = true;
      data.clientFieldsOnly = true;
      dalDb.getContest(data, callback);
    },

    //Transform to client
    function (data, callback) {
      data.contest = commonBusinessLogic.prepareContestForClient(data.contest, data.session);
      callback(null, data);
    },
  ];

  async.waterfall(operations, function (err, data) {
    if (!err) {
      res.json(data.contest);
    }
    else {
      res.send(err.httpStatus, err);
    }
  });
};

//-------------------------------------------------------------------------------------
// getQuestionsByIds
//
// data: userQuestions
// output: contest
//-------------------------------------------------------------------------------------
module.exports.getQuestionsByIds = function (req, res, next) {
  var token = req.headers.authorization;
  var data = req.body;

  if (!data.userQuestions) {
    exceptions.ServerResponseException(res, 'userQuestions not supplied', null, 'warn', 424);
    return;
  }

  var operations = [

    //Connect to the database (so connection will stay open until we decide to close it)
    dalDb.connect,

    //Retrieve the session
    function (connectData, callback) {

      data.DbHelper = connectData.DbHelper;
      data.token = token;
      dalDb.retrieveSession(data, callback);
    },

    //Retrieve the contest
    function (data, callback) {
      data.closeConnection = true;
      dalDb.getQuestionsByIds(data, callback);
    }
  ];

  async.waterfall(operations, function (err, data) {
    if (!err) {
      res.json(data.questions);
    }
    else {
      res.send(err.httpStatus, err);
    }
  });
};

//-------------------------------------------------------------------------------------
// searchMyQuestions
//
// data: text, existingQuestionIds
// output: contest
//-------------------------------------------------------------------------------------
module.exports.searchMyQuestions = function (req, res, next) {
  var token = req.headers.authorization;
  var data = req.body;

  if (!data.text) {
    exceptions.ServerResponseException(res, 'text not supplied', null, 'warn', 424);
    return;
  }

  var operations = [

    //Connect to the database (so connection will stay open until we decide to close it)
    dalDb.connect,

    //Retrieve the session
    function (connectData, callback) {

      data.DbHelper = connectData.DbHelper;
      data.token = token;
      dalDb.retrieveSession(data, callback);
    },

    //Retrieve the contest
    function (data, callback) {
      data.closeConnection = true;
      dalDb.searchMyQuestions(data, callback);
    }
  ];

  async.waterfall(operations, function (err, data) {
    if (!err) {
      res.json(data.questions);
    }
    else {
      res.send(err.httpStatus, err);
    }
  });
};

//-------------------------------------------------------------------------------------
// getTeamDistancePercent
// returns the distance in percents (e.g. 0.02 = 2 percent) between the given team's
// score and the other's team score
//-------------------------------------------------------------------------------------
module.exports.getTeamDistancePercent = function (contest, teamId) {
  var sumScores = contest.teams[teamId].score + contest.teams[1 - teamId].score;
  var inputTeamPercent = contest.teams[teamId].score / sumScores;
  var otherTeamPercent = contest.teams[1 - teamId].score / sumScores;

  return (inputTeamPercent - otherTeamPercent);
};

