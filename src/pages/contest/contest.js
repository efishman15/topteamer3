var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var core_1 = require('@angular/core');
var ionic_angular_1 = require('ionic-angular');
var contest_chart_1 = require('../../components/contest-chart/contest-chart');
var client_1 = require('../../providers/client');
var contestsService = require('../../providers/contests');
var analyticsService = require('../../providers/analytics');
var connectService = require('../../providers/connect');
var soundService = require('../../providers/sound');
var ContestPage = (function () {
    function ContestPage(params) {
        this.lastQuizResults = null;
        this.animateLastResults = 0; //0=no animation, 1=enter animation, 2=exit animation
        this.client = client_1.Client.getInstance();
        this.contest = params.data.contest;
    }
    ContestPage.prototype.ionViewLoaded = function () {
        var _this = this;
        this.quizFinishedHandler = function (eventData) {
            //Prepare some client calculated fields on the contest
            contestsService.setContestClientData(eventData[0].contest);
            //Refresh the contest chart and the contest details
            //This is the only case where we want to animate the chart
            //right after a quiz so the user will notice the socre changes
            _this.refreshContestChart(eventData[0].contest, eventData[0].data.animation);
            //Event data comes as an array of data objects - we expect only one (last quiz results)
            _this.lastQuizResults = eventData[0];
            if (_this.lastQuizResults.data.facebookPost) {
                var shareSuccessModal = _this.client.createModalPage('ShareSuccessPage', { quizResults: _this.lastQuizResults });
                shareSuccessModal.onDidDismiss(function (action) {
                    switch (action) {
                        case 'post':
                            connectService.post(_this.lastQuizResults.data.facebookPost).then(function () {
                            }, function () {
                            });
                            break;
                        case 'share':
                            _this.client.share(_this.contest, 'shareSuccess');
                            break;
                    }
                });
                shareSuccessModal.present();
            }
            else {
                _this.animateLastResults = 1; //Enter animation
                setTimeout(function () {
                    _this.animateLastResults = 2; //Exit animation
                    setTimeout(function () {
                        _this.animateLastResults = 0; //No animation
                    }, _this.client.settings.quiz.finish.animateResultsExitTimeout);
                }, _this.client.settings.quiz.finish.animateResultsTimeout);
            }
            var soundFile = _this.lastQuizResults.data.sound;
            setTimeout(function () {
                soundService.play(soundFile);
            }, 500);
        };
        this.contestUpdatedHandler = function (eventData) {
            _this.refreshContestChart(eventData[0]);
        };
        this.client.events.subscribe('app:quizFinished', this.quizFinishedHandler);
        this.client.events.subscribe('app:contestUpdated', this.contestUpdatedHandler);
    };
    ContestPage.prototype.ionViewWillUnload = function () {
        this.client.events.unsubscribe('app:quizFinished', this.quizFinishedHandler);
        this.client.events.unsubscribe('app:contestUpdated', this.contestUpdatedHandler);
    };
    ContestPage.prototype.ionViewWillEnter = function () {
        analyticsService.track('page/contest', { contestId: this.contest._id });
    };
    ContestPage.prototype.showParticipants = function (source) {
        this.client.openPage('ContestParticipantsPage', { 'contest': this.contest, 'source': source });
    };
    ContestPage.prototype.refreshContestChart = function (contest, animation) {
        this.contest = contest;
        this.contestChartComponent.refresh(contest, animation);
    };
    ContestPage.prototype.share = function (source) {
        this.client.share(this.contest.status !== 'finished' ? this.contest : null, source);
    };
    ContestPage.prototype.onContestSelected = function () {
        this.playOrLeaderboard('contest/chart');
    };
    ContestPage.prototype.onMyTeamSelected = function () {
        this.playContest('contest/myTeam');
    };
    ContestPage.prototype.onContestButtonClick = function (data) {
        this.playOrLeaderboard('contest/button');
    };
    ContestPage.prototype.playOrLeaderboard = function (source) {
        if (this.contest.state === 'play') {
            this.playContest(source);
        }
        else if (this.contest.state === 'finished') {
            this.showParticipants(source);
        }
    };
    ContestPage.prototype.playContest = function (source) {
        analyticsService.track('contest/play', {
            contestId: this.contest._id,
            team: '' + this.contest.myTeam,
            sourceClick: source
        });
        this.client.openPage('QuizPage', { contest: this.contest, source: source });
    };
    __decorate([
        core_1.ViewChild(contest_chart_1.ContestChartComponent), 
        __metadata('design:type', contest_chart_1.ContestChartComponent)
    ], ContestPage.prototype, "contestChartComponent", void 0);
    ContestPage = __decorate([
        core_1.Component({
            templateUrl: 'build/pages/contest/contest.html',
            directives: [contest_chart_1.ContestChartComponent]
        }), 
        __metadata('design:paramtypes', [ionic_angular_1.NavParams])
    ], ContestPage);
    return ContestPage;
})();
exports.ContestPage = ContestPage;
//# sourceMappingURL=contest.js.map