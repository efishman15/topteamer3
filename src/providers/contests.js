var _this = this;
var client_1 = require('./client');
var objects_1 = require('../objects/objects');
//------------------------------------------------------
//-- Private Functions
//------------------------------------------------------
//------------------------------------------------------
//-- list
//------------------------------------------------------
exports.list = function (tab) {
    var postData = { 'tab': tab };
    return new Promise(function (resolve, reject) {
        var client = client_1.Client.getInstance();
        client.serverPost('contests/list', postData).then(function (contests) {
            contests.forEach(function (contest) {
                exports.setContestClientData(contest);
            });
            resolve(contests);
        }, function (err) {
            reject(err);
        });
    });
};
//------------------------------------------------------
//-- join
//------------------------------------------------------
exports.join = function (contestId, teamId) {
    var postData = { 'contestId': contestId, 'teamId': teamId };
    var client = client_1.Client.getInstance();
    return new Promise(function (resolve, reject) {
        client.serverPost('contests/join', postData).then(function (data) {
            exports.setContestClientData(data.contest);
            resolve(data);
        }, function (err) {
            reject(err);
        });
    });
};
//------------------------------------------------------
//-- getContest
//------------------------------------------------------
exports.getContest = function (contestId) {
    var postData = { 'contestId': contestId };
    var client = client_1.Client.getInstance();
    return new Promise(function (resolve, reject) {
        client.serverPost('contests/get', postData).then(function (contest) {
            exports.setContestClientData(contest);
            resolve(contest);
        }, function (err) {
            reject(err);
        });
    });
};
//------------------------------------------------------
//-- openContest
//------------------------------------------------------
exports.removeContest = function (contestId) {
    var postData = { 'contestId': contestId };
    var client = client_1.Client.getInstance();
    return client.serverPost('contests/remove', postData);
};
//------------------------------------------------------
//-- openContest
//------------------------------------------------------
exports.setContest = function (contest, mode) {
    var postData = { 'contest': contest, 'mode': mode };
    var client = client_1.Client.getInstance();
    return new Promise(function (resolve, reject) {
        client.serverPost('contests/set', postData).then(function (contest) {
            exports.setContestClientData(contest);
            resolve(contest);
        }, function (err) {
            reject(err);
        });
    });
};
//------------------------------------------------------
//-- searchMyQuestions
//------------------------------------------------------
exports.searchMyQuestions = function (text, existingQuestionIds) {
    var postData = { 'text': text, 'existingQuestionIds': existingQuestionIds };
    var client = client_1.Client.getInstance();
    return client.serverPost('contests/searchMyQuestions', postData);
};
//------------------------------------------------------
//-- getQuestions
//------------------------------------------------------
exports.getQuestions = function (userQuestions) {
    var postData = { 'userQuestions': userQuestions };
    var client = client_1.Client.getInstance();
    return client.serverPost('contests/getQuestions', postData);
};
//------------------------------------------------------
//-- setContestClientData
//-- Sets the contest.time object, state, status
//------------------------------------------------------
exports.setContestClientData = function (contest) {
    var client = client_1.Client.getInstance();
    var now = (new Date()).getTime();
    //-----------------------------------------------------------------------------------------------
    // lastUpdated - a mechanism to avoid retrieving the contest object again
    // in the client based on its id - to force refresh from the server
    // There will be a client settings threshold that will control if refreshing from the
    // server is neccessary (e.g. - X milliseconds from last refresh)
    //-----------------------------------------------------------------------------------------------
    contest.lastUpdated = now;
    //-------------------
    // status, state
    //-------------------
    contest.status = exports.getContestStatus(contest, now);
    if (contest.status === 'finished') {
        contest.state = 'finished';
        contest.buttonText = client.translate('VIEW');
    }
    else {
        if (contest.myTeam === 0 || contest.myTeam === 1) {
            contest.state = 'play';
            contest.buttonText = client.translate('PLAY_FOR_TEAM', { 'team': contest.teams[contest.myTeam].name });
        }
        else {
            contest.state = 'join';
            contest.buttonText = client.translate('PLAY_CONTEST');
        }
    }
    var term;
    var number;
    var units;
    var color;
    var minutes;
    contest.time = {
        'start': {
            'text': null,
            'color': null
        },
        'end': {
            'text': null,
            'color': null
        }
    };
    //-------------------
    // time.start
    //-------------------
    minutes = Math.abs(now - contest.startDate) / 1000 / 60;
    if (minutes >= 60 * 24) {
        number = Math.ceil(minutes / 24 / 60);
        units = 'DAYS';
    }
    else if (minutes >= 60) {
        number = Math.ceil(minutes / 60);
        units = 'HOURS';
    }
    else {
        number = Math.ceil(minutes);
        units = 'MINUTES';
    }
    if (now > contest.startDate) {
        term = 'CONTEST_STARTED';
        color = client.settings.charts.contest.time.running.color;
    }
    else {
        term = 'CONTEST_STARTING';
        color = client.settings.charts.contest.time.starting.color;
    }
    contest.time.start.text = client.translate(term, {
        number: number,
        units: client.translate(units)
    });
    contest.time.start.color = color;
    //-------------------
    // time.end
    //-------------------
    minutes = Math.abs(contest.endDate - now) / 1000 / 60;
    if (minutes >= 60 * 24) {
        number = Math.ceil(minutes / 24 / 60);
        units = 'DAYS';
    }
    else if (minutes >= 60) {
        number = Math.ceil(minutes / 60);
        units = 'HOURS';
    }
    else {
        number = Math.ceil(minutes);
        units = 'MINUTES';
    }
    if (now < contest.endDate) {
        term = 'CONTEST_ENDS_IN';
        color = client.settings.charts.contest.time.running.color;
    }
    else {
        term = 'CONTEST_ENDED';
        color = client.settings.charts.contest.time.finished.color;
    }
    contest.time.end.text = client.translate(term, {
        number: number,
        units: client.translate(units)
    });
    contest.time.end.color = color;
    //Chart values
    if (contest.teams[0].score === 0 && contest.teams[1].score === 0) {
        contest.teams[0].chartValue = 0.5;
        contest.teams[1].chartValue = 0.5;
        contest.leadingTeam = -1;
    }
    else {
        //Do relational compute
        var sum = contest.teams[0].score + contest.teams[1].score;
        contest.teams[0].chartValue = Math.round(contest.teams[0].score * 100 / sum) / 100;
        contest.teams[1].chartValue = 1 - contest.teams[0].chartValue;
        if (contest.teams[0].score > contest.teams[1].score) {
            contest.leadingTeam = 0;
        }
        else {
            contest.leadingTeam = 1;
        }
    }
    contest.teams[0].chartPercent = Math.round(contest.teams[0].chartValue * 100);
    contest.teams[1].chartPercent = Math.round(contest.teams[1].chartValue * 100);
    //-------------------
    // Contest name
    //-------------------
    contest.name = new objects_1.ContestName();
    contest.name.long = client.translate('CONTEST_NAME_LONG', {
        'team0': contest.teams[0].name,
        'team1': contest.teams[1].name,
        'subject': contest.subject
    });
    contest.name.short = client.translate('CONTEST_NAME_SHORT', {
        'team0': contest.teams[0].name,
        'team1': contest.teams[1].name
    });
};
exports.cloneForEdit = function (contest) {
    var newContest = new objects_1.Contest(contest.type.id, contest.startDate, contest.endDate);
    newContest._id = contest._id;
    newContest.teams = [new objects_1.Team(contest.teams[0].name), new objects_1.Team(contest.teams[1].name)];
    if (_this.questions) {
        newContest.questions = JSON.parse(JSON.stringify(contest.questions));
    }
    newContest.subject = contest.subject;
    if (contest.systemParticipants) {
        newContest.systemParticipants = contest.systemParticipants;
    }
    if (contest.rating) {
        newContest.rating = contest.rating;
    }
    if (contest.type.id === 'userTrivia') {
        newContest.type = JSON.parse(JSON.stringify(contest.type));
    }
    return newContest;
};
//-------------------
// status
//-------------------
exports.getContestStatus = function (contest, now) {
    if (now === undefined) {
        now = (new Date()).getTime();
    }
    if (contest.endDate < now) {
        return 'finished';
    }
    else {
        if (contest.startDate > now) {
            return 'starting';
        }
        else {
            return 'running';
        }
    }
};
//# sourceMappingURL=contests.js.map