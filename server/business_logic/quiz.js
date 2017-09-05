var path = require('path');
var util = require('util');
var async = require('async');
var sessionUtils = require(path.resolve(__dirname, '../business_logic/session'));
var exceptions = require(path.resolve(__dirname, '../utils/exceptions'));
var random = require(path.resolve(__dirname, '../utils/random'));
var dalDb = require(path.resolve(__dirname, '../dal/dalDb'));
var dalFacebook = require(path.resolve(__dirname, '../dal/dalFacebook'));
var generalUtils = require(path.resolve(__dirname, '../utils/general'));
var contestsBusinessLogic = require(path.resolve(__dirname, '../business_logic/contests'));
var dalLeaderboards = require(path.resolve(__dirname, '../dal/dalLeaderboards'));
var ObjectId = require('mongodb').ObjectID;
var commonBusinessLogic = require(path.resolve(__dirname, './common'));

//--------------------------------------------------------------------------
//Private functions
//--------------------------------------------------------------------------

//--------------------------------------------------------------------------
// prepareGcmQuery
//--------------------------------------------------------------------------
function prepareGcmQuery(data, alertName, team, excludeMe) {
  data.fields = {'gcmRegistrationId': 1};
  var userKeys = Object.keys(data.contest.users);
  data.userIds = [];
  for (var i = 0; i < userKeys.length; i++) {
    if (
      (!excludeMe || userKeys[i] !== data.session.userId.toString()) &&
      (team === undefined || team === null || data.contest.users[userKeys[i]].team === team)
    ) {
      //If specific team requested - retrieve only its members
      data.userIds.push(ObjectId(userKeys[i]));
    }
  }
  data.whereClause = {_id: {$in: data.userIds}, 'settings.notifications.on': true};
  data.whereClause['settings.notifications.' + alertName] = true;

}
//--------------------------------------------------------------------------
// getNextQuestion
//
// input: DbHelper, session, questionCriteria, questionsCount (optional if contest has user questions)
// output: question
//--------------------------------------------------------------------------
function getNextQuestion(data, callback) {

  dalDb.getNextQuestion(data, function (err, question) {

    if (err) {
      callback(err);
      return;
    }

    if (data.session.quiz.clientData.totalQuestions === (data.session.quiz.clientData.currentQuestionIndex + 1)) {
      data.session.quiz.clientData.finished = true;
    }

    //Session is dynamic - perform some evals...
    if (question.vars) {

      //define the vars as 'global' vars so they can be referenced by further evals
      for (var key in question.vars) {
        global[key] = eval(question.vars[key]);
      }

      //The question.text can include expressions like these: {{xp1}} {{xp2}} which need to be 'evaled'
      question.text = question.text.replace(/\{\{(.*?)\}\}/g, function (match) {
        return eval(match.substring(2, match.length - 2));
      });

      //The answer.answer can include expressions like these: {{xp1}} {{xp2}} which need to be 'evaled'
      question.answers.forEach(function (element, index, array) {
        element['text'] = element['text'].replace(/\{\{(.*?)\}\}/g, function (match) {
          return eval(match.substring(2, match.length - 2));
        });
      })

      //delete global vars used for the evaluation
      for (var key in question.vars) {
        delete global[key];
      }
    }

    data.session.quiz.serverData.currentQuestion = question;

    data.session.quiz.clientData.currentQuestion = {
      'text': question.text,
      'answers': []
    };

    //For admins only - give the original answers (in their original order, item0 is the correct answer
    //including the _id - to allow editing the question within the quiz

    var originalAnswers = [];
    if (data.session.isAdmin) {
      data.session.quiz.clientData.currentQuestion._id = question._id;
      for (var i = 0; i < question.answers.length; i++) {
        originalAnswers.push(question.answers[i].text);
      }
    }

    //Shuffle the answers
    question.answers = random.shuffle(question.answers);

    //Add them to the client question shuffled
    for (var i = 0; i < question.answers.length; i++) {
      data.session.quiz.clientData.currentQuestion.answers.push({'text': question.answers[i].text});
    }

    if (data.session.isAdmin) {
      //Index of this array is the original order (item0 = correct)
      //value of the cell of the array points to the index of the answer in the shuffled array
      for (var i = 0; i < originalAnswers.length; i++) {
        for (var j = 0; j < question.answers.length; j++) {
          if (originalAnswers[i] === data.session.quiz.clientData.currentQuestion.answers[j].text) {
            data.session.quiz.clientData.currentQuestion.answers[j].originalIndex = i;
            break;
          }
        }
      }
    }

    var questionScore = getQuestionScore(data);
    if (question.wikipediaHint) {
      data.session.quiz.clientData.currentQuestion.wikipediaHint = question.wikipediaHint;
      data.session.quiz.clientData.currentQuestion.hintCost = questionScore * generalUtils.settings.server.quiz.hintCost;
    }

    if (question.wikipediaAnswer) {
      data.session.quiz.clientData.currentQuestion.wikipediaAnswer = question.wikipediaAnswer;
      data.session.quiz.clientData.currentQuestion.answerCost = questionScore * generalUtils.settings.server.quiz.answerCost;
    }

    if (question.correctAnswers > 0 || question.wrongAnswers > 0) {
      data.session.quiz.clientData.currentQuestion.correctRatio = question.correctRatio;
    }

    //Add this question id to the list of questions already asked during this quiz
    if (data.session.quiz.serverData.previousQuestions) {
      data.session.quiz.serverData.previousQuestions.push(question._id);
    }

    callback(null, data);
  });
}

//--------------------------------------------------------------------------
// getQuestionScore
//
// data: session
//--------------------------------------------------------------------------
function getQuestionScore(data) {

  var score;
  if (data.session.quiz.serverData.contest.type === 'systemTrivia') {
    score = generalUtils.settings.server.quiz.questions[data.session.quiz.serverData.contest.type].levels[data.session.quiz.clientData.currentQuestionIndex].score;
  }
  else if (data.session.quiz.serverData.contest.type === 'userTrivia') {
    score = generalUtils.settings.server.quiz.questions[data.session.quiz.serverData.contest.type].questionScore;
  }
  else {
    score = 0;
  }

  return score;
}

//--------------------------------------------------------------------------
// setQuestionDirection
//
// data: session
//--------------------------------------------------------------------------
function setQuestionDirection(data, callback) {

  if (!data.session.quiz.serverData.userQuestions) {

    data.topicId = data.session.quiz.serverData.currentQuestion.topicId;
    dalDb.getTopic(data, function (err, topic) {
      if (err) {
        callback(err);
        return;
      }
      if (topic.forceDirection) {
        data.session.quiz.clientData.currentQuestion.direction = topic.forceDirection;
      }
      else {
        data.session.quiz.clientData.currentQuestion.direction = generalUtils.getDirectionByLanguage(data.session.settings.language);
      }

      callback(null, data);

    });
  }
  else {
    data.session.quiz.clientData.currentQuestion.direction = generalUtils.settings.client.languages[data.session.settings.language].direction;
    callback(null, data);
  }
}

//----------------------------------------------------------------------------------------
// setPostStory
//
// determines if the given story has a higher post priority than the current story and
// replaces if necessary
//----------------------------------------------------------------------------------------
function setPostStory(data, story, objectData) {

  var replaced = false;

  if (!data.session.quiz.serverData.share.story) {
    data.session.quiz.serverData.share.story = JSON.parse(JSON.stringify(generalUtils.settings.server.quiz.stories[story]));
    replaced = true;
  }
  else if (generalUtils.settings.server.quiz.stories[story].priority > data.session.quiz.serverData.share.story.priority) {
    //Replace the story with one with a higher priority
    data.session.quiz.serverData.share.story = JSON.parse(JSON.stringify(generalUtils.settings.server.quiz.stories[story]));
    replaced = true;
  }

  if (replaced && data.session.quiz.serverData.share.story.facebookPost && data.session.quiz.serverData.share.story.facebookPost.object && objectData) {
    var openGraphObject = commonBusinessLogic.getOpenGraphObject(data.session.quiz.serverData.share.story.facebookPost.object.name, objectData, false, data.session.clientInfo.mobile);
    data.session.quiz.serverData.share.story.facebookPost.object = openGraphObject.facebookObject;
  }

  return replaced;
}

//--------------------------------------------------------------------------
//Public functions
//--------------------------------------------------------------------------

//--------------------------------------------------------------------------
// start
//
// data: contestId
//--------------------------------------------------------------------------
module.exports.start = function (req, res, next) {
  var token = req.headers.authorization;
  var data = req.body;

  data.clientResponse = {};

  if (!data.contestId) {
    exceptions.ServerResponseException(res, 'contestId not supplied', null, 'warn', 424);
    return;
  }

  var operations = [

    //getSession
    function (callback) {
      data.token = token;
      sessionUtils.getSession(data, callback);
    },

    dalDb.getContest,

    //Check contest join and possible team switch, contest ended
    function (data, callback) {

      if (!data.contest.users || !data.contest.users[data.session.userId]) {
        dalDb.closeDb(data);
        callback(new exceptions.ServerMessageException('SERVER_ERROR_NOT_JOINED_TO_CONTEST'));
      }
      else if (data.contest.endDate < (new Date()).getTime()) {
        dalDb.closeDb(data);
        callback(new exceptions.ServerMessageException('SERVER_ERROR_CONTEST_ENDED', {'contest': data.contest}));
        return;
      }
      else {
        callback(null, data);
      }
    },

    //Init quiz
    function (data, callback) {

      var quiz = {};
      quiz.clientData = {
        'currentQuestionIndex': -1, //First question will be incremented to 0
        'finished': false
      };

      quiz.serverData = {
        'contest': {'id': data.contestId, 'type': data.contest.type.id},
        'score': 0,
        'correctAnswers': 0,
        'share': {'data': {}}
      };

      if (data.contest.type.id === 'userTrivia' && data.contest.creator.id.toString() === data.session.userId.toString()) {
        quiz.clientData.reviewMode = {'reason': 'REVIEW_MODE_OWNER'};
      }
      else if (data.contest.type.id === 'userTrivia' && data.contest.users[data.session.userId].lastPlayed) {
        //user is allowed to play a user-based questions contest that he DID NOT create - only once for real points
        //other plays - are for review only
        quiz.clientData.reviewMode = {'reason': 'REVIEW_MODE_PLAY_AGAIN'};
      }

      //Number of questions (either entered by user or X random questions from the system
      if (data.contest.type.id !== 'userTrivia') {
        quiz.clientData.totalQuestions = generalUtils.settings.server.quiz.questions.systemTrivia.levels.length;
        quiz.serverData.previousQuestions = [];
      }
      else {
        quiz.clientData.totalQuestions = data.contest.type.userQuestions.length;
        if (data.contest.type.randomOrder) {
          quiz.serverData.userQuestions = random.shuffle(data.contest.type.userQuestions);
        }
        else {
          quiz.serverData.userQuestions = data.contest.type.userQuestions;
        }
      }

      var myTeam = data.contest.users[data.session.userId].team;

      //--------------------------------------------------------------------------------------------------
      //-- prepare 'background check' data for stories - to later evaludate if they happened
      //--------------------------------------------------------------------------------------------------

      //-- store the leading team
      if (data.contest.teams[0].score > data.contest.teams[1].score) {
        quiz.serverData.share.data.leadingTeam = 0;
      }
      else if (data.contest.teams[0].score < data.contest.teams[1].score) {
        quiz.serverData.share.data.leadingTeam = 1;
      }
      else {
        //Tie between the teams - take the OTHER team which I am not playing for
        //Any positive score achieved for my team will create a share story
        //'My score just made my team lead...'
        quiz.serverData.share.data.leadingTeam = 1 - myTeam;
      }

      //-- store if myTeamStartedBehind
      if (data.contest.teams[myTeam].score < data.contest.teams[1 - myTeam].score) {
        //My team is behind
        quiz.serverData.share.data.myTeamStartedBehind = true;
        if (contestsBusinessLogic.getTeamDistancePercent(data.contest, 1 - myTeam) > generalUtils.settings.server.quiz.teamPercentDistanceForShare) {
          quiz.serverData.share.data.myTeamStartedBehindWithThreshold = true;
        }
      }

      data.session.quiz = quiz;

      data.clientResponse.quiz = data.session.quiz.clientData;

      if (!data.session.friends && data.session.facebookUserId) {
        dalFacebook.getUserFriends(data, callback);
      }
      else {
        callback(null, data);
      }
    },

    //find some friends above me in the leaderboard
    function (data, callback) {
      if (data.session.facebookUserId && data.session.friends && data.session.friends.list && data.session.friends.list.length > 0) {
        dalLeaderboards.getFriendsAboveMe(data, callback);
      }
      else {
        callback(null, data);
      }
    },

    //Stores the friends above me in the quiz
    function (data, callback) {
      if (data.friendsAboveMe && data.friendsAboveMe.length > 0) {
        data.session.quiz.serverData.share.data.friendsAboveMe = data.friendsAboveMe;
      }
      callback(null, data);
    },

    //Pick a random subject from the avilable subjects in this quiz and prepare the query
    dalDb.prepareQuestionCriteria,

    //Count number of questions excluding the previous questions
    function (data, callback) {
      if (!data.session.quiz.serverData.userQuestions) {
        dalDb.getQuestionsCount(data, callback);
      }
      else {
        callback(null, data);
      }
    },

    //Get the next question for the quiz
    getNextQuestion,

    //Sets the direction of the question
    setQuestionDirection,

    //Stores the session with the quiz in the db
    function (data, callback) {
      data.closeConnection = true;
      data.setData = {quiz: data.session.quiz};
      dalDb.setSession(data, callback);
    }
  ];

  async.waterfall(operations, function (err, data) {
    if (!err) {
      res.json(data.clientResponse);
    }
    else {
      res.send(err.httpStatus, err);
    }
  })
};

//--------------------------------------------------------------------------
// answer
//
// data: id (answerId = 0 based), hintUsed (optional), answerUsed (optional)
//--------------------------------------------------------------------------
module.exports.answer = function (req, res, next) {

  var token = req.headers.authorization;
  var data = req.body;

  data.clientResponse = {'question': {}};

  var operations = [

    //getSession
    function (callback) {
      data.token = token;
      sessionUtils.getSession(data, callback);
    },

    //Retrieve the contest object - when quiz is finished
    function (data, callback) {
      if (data.session.quiz.clientData.finished) {
        data.contestId = data.session.quiz.serverData.contest.id;
        dalDb.getContest(data, callback);
      }
      else {
        callback(null, data);
      }
    },

    //Check answer
    function (data, callback) {

      if (!data.session.quiz) {
        dalDb.closeDb(data);
        callback(new exceptions.ServerMessageException('SERVER_ERROR_SESSION_EXPIRED_DURING_QUIZ', null, 403));
        return;
      }

      var answers = data.session.quiz.serverData.currentQuestion.answers;
      if (data.id < 0 || data.id > answers.length - 1) {
        dalDb.closeDb(data);
        callback(new exceptions.ServerException('Invalid answer id', {'answerId': data.id}, 'error'));
        return;
      }

      data.clientResponse.question.answerId = data.id;
      if (answers[data.id].correct) {
        data.clientResponse.question.correct = true;

        data.session.quiz.serverData.correctAnswers++;

        commonBusinessLogic.addXp(data, 'correctAnswer');

        //PerfectScore story
        if (data.session.quiz.clientData.finished && data.session.quiz.serverData.correctAnswers === data.session.quiz.clientData.totalQuestions) {
          //Contest object is retrieved if quiz finished
          var myTeam = data.contest.users[data.session.userId].team;
          commonBusinessLogic.addXp(data, 'quizFullScore');
          if (!data.session.quiz.clientData.reviewMode) {
            setPostStory(data, 'gotPerfectScore',
              {
                'contest': data.contest,
                'team': myTeam,
                'url': data.contest.teams[myTeam].link
              }
            );
          }
        }

        var questionScore;
        if (!data.session.quiz.clientData.reviewMode) {

          questionScore = getQuestionScore(data);

          if (data.answerUsed && data.session.quiz.clientData.currentQuestion.answerCost) {
            questionScore -= data.session.quiz.clientData.currentQuestion.answerCost;
          }
          else if (data.hintUsed && data.session.quiz.clientData.currentQuestion.hintCost) {
            questionScore -= data.session.quiz.clientData.currentQuestion.hintCost;
          }
        }
        else {
          //In review mode - no scores
          questionScore = 0;
        }

        data.session.quiz.serverData.score += questionScore;
      }
      else {
        data.clientResponse.question.correct = false;
        for (i = 0; i < answers.length; i++) {
          if (answers[i].correct && answers[i].correct) {
            data.clientResponse.question.correctAnswerId = i;
            break;
          }
        }
      }

      dalDb.updateQuestionStatistics(data, callback);
    },

    //Store session
    function (data, callback) {

      var store = false;
      if (data.session.quiz.clientData.finished) {

        //Update total score in profile
        data.session.score += data.session.quiz.serverData.score;
        store = true;
      }
      else if (data.clientResponse.question.correct) {
        //store temporary score of quiz
        store = true;
      }

      if (data.xpProgress) {

        store = true;
        data.clientResponse.xpProgress = data.xpProgress;

        if (data.xpProgress.rankChanged) {
          data.session.features = sessionUtils.computeFeatures(data.session);
          data.clientResponse.features = data.session.features;
        }
      }

      if (store) {
        data.setData = {
          score: data.session.score,
          xp: data.session.xp,
          rank: data.session.rank,
          quiz: data.session.quiz
        };
        dalDb.setSession(data, callback);
      }
      else {
        callback(null, data);
      }
    },

    //Check to save the score into the users object as well - when quiz is finished or when got a correct answer (which gives score and/or xp
    function (data, callback) {
      if (data.session.quiz.clientData.finished || (data.xpProgress && data.xpProgress.addition > 0)) {
        data.setData = {
          score: data.session.score,
          xp: data.session.xp,
          rank: data.session.rank,
        };
        dalDb.setUser(data, callback);
      }
      else {
        callback(null, data);
      }
    },

    //Check to save the quiz score into the contest object - when quiz is finished
    function (data, callback) {

      if (!data.session.quiz.clientData.finished || data.session.quiz.clientData.reviewMode) {
        callback(null, data);
        return;
      }

      var myTeam = data.contest.users[data.session.userId].team;
      var myContestUser = data.contest.users[data.session.userId];

      //Update all leaderboards with the score achieved - don't wait for any callbacks of the leaderboard - can
      //be done fully async and continue doing other stuff
      dalLeaderboards.addScore(data.contest._id, myTeam, data.session.quiz.serverData.score, data.session);

      myContestUser.score += data.session.quiz.serverData.score;
      myContestUser.teamScores[myTeam] += data.session.quiz.serverData.score;

      //Update:
      // 1. contest general score
      // 2. My score in this contest + lastPlayed
      // 3. My score in my teams contribution
      // 4. My team's score in this contest
      data.setData = {};
      data.setData['users.' + data.session.userId + '.score'] = myContestUser.score;
      data.setData['users.' + data.session.userId + '.teamScores.' + myTeam] = myContestUser.teamScores[myTeam];
      data.setData['users.' + data.session.userId + '.lastPlayed'] = (new Date()).getTime();
      data.setData.score = data.contest.score + data.session.quiz.serverData.score;

      // Check if need to replace the contest leader
      // Leader is the participant that has contributed max points for the contest regardless of teams)
      if (myContestUser.score > data.contest.users[data.contest.leader.id].score) {
        data.setData['leader.id'] = data.session.userId;
        data.setData['leader.avatar'] = commonBusinessLogic.getAvatar(data.session);
        data.setData['leader.name'] = data.session.name;
        setPostStory(data, 'becameContestLeader',
          {
            'contest': data.contest,
            'url': data.contest.leaderLink
          }
        );
      }

      // Check if need to replace the my team's leader
      // Team leader is the participant that has contributed max points for his/her team)
      if (!data.contest.teams[myTeam].leader || myContestUser.teamScores[myTeam] > data.contest.users[data.contest.teams[myTeam].leader.id].teamScores[myTeam]) {
        data.setData['teams.' + myTeam + '.leader.id'] = data.session.userId;
        data.setData['teams.' + myTeam + '.leader.avatar'] = commonBusinessLogic.getAvatar(data.session);
        data.setData['teams.' + myTeam + '.leader.name'] = data.session.name;
        setPostStory(data, 'becameTeamLeader',
          {
            'contest': data.contest,
            'team': myTeam,
            'url': data.contest.teams[myTeam].leaderLink
          }
        );
      }

      //Update the team score
      data.contest.teams[data.contest.users[data.session.userId].team].score += data.session.quiz.serverData.score;
      data.setData['teams.' + data.contest.users[data.session.userId].team + '.score'] = data.contest.teams[data.contest.users[data.session.userId].team].score;

      //Check if one of 2 stories happened:
      // 1. My team started leading
      // 2. My team is very close to lead
      if (data.session.quiz.serverData.share.data.myTeamStartedBehind) {

        if (data.contest.teams[myTeam].score > data.contest.teams[1 - myTeam].score) {

          //Only if started behind with threshold worth mentioning in Facebook
          if (data.session.quiz.serverData.share.data.myTeamStartedBehindWithThreshold) {
            setPostStory(data, 'madeMyTeamLead',
              {
                'contest': data.contest,
                'team': myTeam,
                'url': data.contest.teams[myTeam].link
              }
            );
          }

          var now = (new Date()).getTime();
          if (generalUtils.settings.server.contest.alerts.teamLosing.timing[data.contest.endOption] &&
              //Only if this end option time slot should receive losing alerts
              //And minimum time has passed since last losing alert to the same team
            (
              !data.contest.teams[1 - myTeam].losingAlertLastSent ||
              (now - data.contest.teams[1 - myTeam].losingAlertLastSent > generalUtils.settings.server.contest.alerts.teamLosing.timing[data.contest.endOption].minimumMillisecondsBetweenAlerts)
            )
          ) {
            prepareGcmQuery(data, 'myTeamLosing', 1 - myTeam);
            //Retrieve users to send to the push notification about the 'other team losing'
            dalDb.getUsers(data, callback);
          }
          else {
            callback(null, data);
          }
        }
        else if (data.contest.teams[myTeam].score < data.contest.teams[1 - myTeam].score &&
          contestsBusinessLogic.getTeamDistancePercent(data.contest, 1 - myTeam) < generalUtils.settings.server.quiz.teamPercentDistanceForShare) {
          setPostStory(data, 'myTeamIsCloseToLead',
            {
              'contest': data.contest,
              'team': myTeam,
              'url': data.contest.teams[myTeam].link
            }
          );
          callback(null, data);
        }
        else {
          callback(null, data);
        }
      }
      else {
        callback(null, data);
      }
    },

    //Check the passedFriends story and save the contest
    function (data, callback) {

      if (!data.session.quiz.clientData.finished || data.session.quiz.clientData.reviewMode) {
        callback(null, data);
        return;
      }

      //From previous function - the users to send to a push notification
      if (data.users && data.users.length > 0) {
        var myTeam = data.contest.users[data.session.userId].team;

        //Send push to the other team members that they are losing - and come back to play
        //Update the team with "last sent" for next time
        var now = (new Date()).getTime();
        data.contest.teams[1 - myTeam].losingAlertLastSent = now;
        data.setData['teams.' + (1 - myTeam) + '.losingAlertLastSent'] = now;

        contestsBusinessLogic.sendPush(data.users, data.contest, 'teamLosing', 1 - myTeam);
      }

      if (
        //Call the leaderboard to check passed friends only if there is no story to post up until now
      //Or the 'passed friends' story is a 'better' story in terms of priority
      data.session.quiz.serverData.share.data.friendsAboveMe &&
      (
        !data.session.quiz.serverData.share.story ||
        data.session.quiz.serverData.share.story.priority < generalUtils.settings.server.quiz.stories.passedFriendInLeaderboard.priority
      )
      ) {
        data.friendsAboveMe = data.session.quiz.serverData.share.data.friendsAboveMe;
        dalLeaderboards.getPassedFriends(data, callback);
      }
      else {
        callback(null, data);
      }
    },

    //Check the passedFriends story and save the contest
    function (data, callback) {

      if (!data.session.quiz.clientData.finished || data.session.quiz.clientData.reviewMode) {
        callback(null, data);
        return;
      }

      //Common data to be replaced in all potential messages
      data.session.quiz.serverData.share.data.clientData = {
        'score': data.session.quiz.serverData.score,
        'team': data.contest.teams[data.contest.users[data.session.userId].team].name
      }

      if (data.passedFriends && data.passedFriends.length > 0) {
        data.session.quiz.serverData.share.data.clientData.friend = data.passedFriends[0].name;
        var replaced = setPostStory(data, 'passedFriendInLeaderboard',
          {
            'facebookUserId': data.passedFriends[0].id,
            'language': data.contest.language,
            'url': util.format(generalUtils.settings.server.facebook.userOpenGraphProfileUrl, data.passedFriends[0].id, data.contest.language)
          }
        );

        if (replaced) {
          //Friends image to be displayed on the client
          data.session.quiz.serverData.share.story.facebookPost.dialogImage.url = util.format(data.session.quiz.serverData.share.story.facebookPost.dialogImage.url, data.passedFriends[0].id, data.session.quiz.serverData.share.story.facebookPost.dialogImage.width, data.session.quiz.serverData.share.story.facebookPost.dialogImage.height);

          //Adding extra info for the client - for mobile post: name, first name, last name
          if (data.session.clientInfo.mobile) {
            //Complete facebook user details
            dalFacebook.getGeneralProfile(data.passedFriends[0].id, function (err, facebookData) {
              if (err) {
                dalDb.closeDb(data);
                callback(new exceptions.ServerException('Error retreiving facebook profile', {'facebookUserId': data.passedFriends[0].id}, 'error'));
                return;
              }

              data.session.quiz.serverData.share.story.facebookPost.object['og:title'] = generalUtils.settings.server.facebook.openGraphStories.text[data.contest.language].profileTitle.format({'name': facebookData.name});
              data.session.quiz.serverData.share.story.facebookPost.object['og:first_name'] = facebookData.first_name;
              data.session.quiz.serverData.share.story.facebookPost.object['og:last_name'] = facebookData.last_name;

              callback(null, data);
            });
          }
          else {
            callback(null, data);
          }
        }
        else {
          callback(null, data);
        }
      }
      else {
        callback(null, data);
      }
    },

    //Check if contest needs to send "end alert"
    function (data, callback) {

      if (!data.session.quiz.clientData.finished || data.session.quiz.clientData.reviewMode) {
        callback(null, data);
        return;
      }

      if (!data.contest.endAlerts) {
        callback(null, data);
        return;
      }

      var now = (new Date()).getTime();
      for (var i = 0; i < data.contest.endAlerts.length; i++) {
        if (data.contest.endAlerts[i].sent) {
          continue;
        }
        if (data.contest.endDate - now < data.contest.endAlerts[i].timeToEnd) {
          data.sendAlertIndex = i;
          break;
        }
      }
      callback(null, data);

    },

    //Prepare users for push
    function (data, callback) {

      if (!data.session.quiz.clientData.finished || (data.session.quiz.clientData.reviewMode && !(data.sendAlertIndex >= 0))) {
        callback(null, data);
        return;
      }

      //Need to send alert
      if (data.sendAlertIndex >= 0) {
        prepareGcmQuery(data, 'endingContests', null, true);
        dalDb.getUsers(data, function (err, data) {
          data.contest.endAlerts[data.sendAlertIndex].sent = true;
          data.setData['endAlerts.' + data.sendAlertIndex + '.sent'] = true;
          contestsBusinessLogic.sendPush(data.users, data.contest, 'contestEnds');
          callback(null, data);
        });
      }
      else {
        callback(null, data);
      }
    },

    //Save the contest to the db
    function (data, callback) {

      if (!data.session.quiz.clientData.finished || (data.session.quiz.clientData.reviewMode && !(data.sendAlertIndex >= 0))) {
        dalDb.closeDb(data);
        callback(null, data);
        return;
      }

      if (data.session.quiz.serverData.score > 0) {
        setPostStory(data, 'gotScore');
      }
      else {
        setPostStory(data, 'gotZeroScore');
      }

      data.closeConnection = true;

      dalDb.setContest(data, callback);

    },

    //Set contest result fields (required for client only),
    //AFTER contest has been saved to db
    function (data, callback) {
      if (data.session.quiz.clientData.finished) {

        if (data.session.quiz.clientData.reviewMode) {

          if (data.session.quiz.serverData.correctAnswers === data.session.quiz.clientData.totalQuestions) {
            setPostStory(data, 'reviewPerfectScore');
            data.session.quiz.serverData.share.data.clientData = {
              'correct': data.session.quiz.serverData.correctAnswers,
              'questions': data.session.quiz.clientData.totalQuestions
            };
          }
          else if (data.session.quiz.serverData.correctAnswers > 0) {
            setPostStory(data, 'reviewGotScore');
            data.session.quiz.serverData.share.data.clientData = {
              'correct': data.session.quiz.serverData.correctAnswers,
              'questions': data.session.quiz.clientData.totalQuestions
            };
          }
          else {
            setPostStory(data, 'reviewZeroScore');
          }
        }

        data.clientResponse.results = {
          'contest': commonBusinessLogic.prepareContestForClient(data.contest, data.session),
          'data': {}
        };

        data.clientResponse.results.data.score = data.session.quiz.serverData.score;

        data.clientResponse.results.data.sound = random.pick(generalUtils.settings.server.quiz.sounds.finish[data.session.quiz.serverData.share.story.soundGroup]);
        data.clientResponse.results.data.clientKey = data.session.quiz.serverData.share.story.clientKey;
        data.clientResponse.results.data.clientValues = data.session.quiz.serverData.share.data.clientData;
        data.clientResponse.results.data.animation = random.pick(generalUtils.settings.server.quiz.animations);

        if (data.session.quiz.serverData.share.story.facebookPost) {
          data.clientResponse.results.data.facebookPost = data.session.quiz.serverData.share.story.facebookPost;
        }
      }
      callback(null, data);
    }
  ];

  async.waterfall(operations, function (err, data) {
    if (!err) {
      res.json(data.clientResponse);
    }
    else {
      res.send(err.httpStatus, err);
    }
  })
};

//--------------------------------------------------------------------------
// nextQuestion
//
// data: <NA>
//--------------------------------------------------------------------------
module.exports.nextQuestion = function (req, res, next) {
  var token = req.headers.authorization;

  var data = {};
  var operations = [

    //getSession
    function (callback) {
      data.token = token;
      sessionUtils.getSession(data, callback);
    },

    //Will pick a random topic from the trivia topics for the current language and prepare the query
    dalDb.prepareQuestionCriteria,

    //Count number of questions excluding the previous questions
    function (data, callback) {
      if (!data.session.quiz.serverData.userQuestions) {
        dalDb.getQuestionsCount(data, callback);
      }
      else {
        callback(null, data);
      }
    },

    //Get the next question for the quiz
    getNextQuestion,

    //Sets the direction of the question
    setQuestionDirection,

    //Pick animation and store the session with the quiz in the db
    function (data, callback) {
      data.closeConnection = true;
      data.setData = {quiz: data.session.quiz};
      dalDb.setSession(data, callback);
    }
  ];

  async.waterfall(operations, function (err, data) {
    if (!err) {
      res.json(data.session.quiz.clientData);
    }
    else {
      res.send(err.httpStatus, err);
    }
  })
};

//--------------------------------------------------------------------------
// setQuestionByAdmin
//
// data: question (including _id, text, answers)
//--------------------------------------------------------------------------
module.exports.setQuestionByAdmin = function (req, res, next) {

  var data = req.body;

  if (!data.question || !data.question._id || !data.question.text ||
    !data.question.answers |
    data.question.answers.length < 4) {
    exceptions.ServerResponseException(res, 'question required data is not supplied', data, 'warn', 424);
    return;
  }

  var token = req.headers.authorization;

  var operations = [

    //getSession
    function (callback) {
      data.token = token;
      sessionUtils.getSession(data, callback);
    },

    //Count number of questions excluding the previous questions
    function (data, callback) {
      if (!data.session.isAdmin) {
        dalDb.closeDb(data);
        callback(new exceptions.ServerMessageException('SERVER_ERROR_SESSION_EXPIRED_DURING_QUIZ', null, 403));
        return;
      }

      data.questionId = data.question._id;
      data.setData = {};
      data.setData.text = data.question.text;
      for (j = 0; j < data.question.answers.length; j++) {
        data.setData['answers.' + j + '.text'] = data.question.answers[j];
      }

      data.closeConnection = true;
      dalDb.setQuestion(data, callback);
    }
  ];

  async.waterfall(operations, function (err, data) {
    if (!err) {
      res.json(generalUtils.okResponse);
    }
    else {
      res.send(err.httpStatus, err);
    }
  })
};
