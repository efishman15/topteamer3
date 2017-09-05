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
var client_1 = require('../../providers/client');
var analyticsService = require('../../providers/analytics');
var alertService = require('../../providers/alert');
var contestsService = require('../../providers/contests');
var objects_1 = require('../../objects/objects');
var ContestChartComponent = (function () {
    function ContestChartComponent() {
        this.contestSelected = new core_1.EventEmitter();
        this.myTeamSelected = new core_1.EventEmitter();
        this.contestButtonClick = new core_1.EventEmitter();
        this.client = client_1.Client.getInstance();
        this.animation = null;
        this.lastEventTimeStamp = 0;
    }
    ContestChartComponent.prototype.onContestSelected = function (event, source) {
        if (event.timeStamp === this.lastEventTimeStamp) {
            return;
        }
        this.lastEventTimeStamp = event.timeStamp;
        this.contestSelected.emit({ 'contest': this.contest, 'source': source });
    };
    ContestChartComponent.prototype.teamSelected = function (event, teamId, source) {
        this.lastEventTimeStamp = event.timeStamp;
        if (this.contest.state === 'play') {
            if (teamId !== this.contest.myTeam) {
                this.switchTeams(source);
            }
            else {
                //My team - start the game
                analyticsService.track('contest/myTeam', {
                    'contestId': this.contest._id,
                    'team': '' + this.contest.myTeam,
                    'sourceClick': source
                });
                this.myTeamSelected.emit({ 'contest': this.contest, 'source': source });
            }
        }
        else if (this.contest.state !== 'finished') {
            this.joinContest(teamId, source, false, true, false).then(function () {
            }, function () {
            });
        }
    };
    ContestChartComponent.prototype.refresh = function (contest, animation) {
        this.contest = contest;
        this.animation = animation;
    };
    ContestChartComponent.prototype.isOwner = function () {
        if ((this.contest && this.contest.owner && this.contest.status !== 'finished') ||
            (this.client && this.client.session && this.client.session.isAdmin)) {
            return true;
        }
        else {
            return false;
        }
    };
    ContestChartComponent.prototype.joinContest = function (team, source, switchTeams, showAlert, delayRankModal) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            contestsService.join(_this.contest._id, team).then(function (data) {
                _this.refresh(data.contest);
                analyticsService.track('contest/' + (!switchTeams ? 'join' : 'switchTeams'), {
                    contestId: _this.contest._id,
                    team: '' + _this.contest.myTeam,
                    sourceClick: source
                });
                //Notify outside that contest changed
                _this.client.events.publish('app:contestUpdated', data.contest, data.contest.status, data.contest.status);
                //Should get xp if fresh join
                var rankModal;
                if (data.xpProgress && data.xpProgress.addition > 0) {
                    //Adds the xp with animation
                    if (data.xpProgress.rankChanged) {
                        rankModal = _this.client.createModalPage('NewRankPage', {
                            'xpProgress': data.xpProgress
                        });
                        if (!delayRankModal) {
                            rankModal.onDidDismiss(function () {
                                resolve();
                            });
                        }
                        else {
                            resolve(rankModal);
                        }
                        _this.client.playerInfoComponent.addXp(data.xpProgress).then(function () {
                        }, function () {
                            reject();
                        });
                    }
                }
                if (showAlert) {
                    alertService.alert({
                        'type': 'SELECT_TEAM_ALERT',
                        'additionalInfo': { 'team': _this.contest.teams[_this.contest.myTeam].name }
                    }).then(function () {
                        if (rankModal && !delayRankModal) {
                            rankModal.present();
                        }
                        else {
                            resolve(rankModal);
                        }
                    }, function () {
                    });
                }
                else {
                    if (rankModal && !delayRankModal) {
                        //resolve will be called upon dismiss
                        rankModal.present();
                    }
                    else {
                        resolve(rankModal);
                    }
                }
            }, function () {
                reject();
            });
        });
    };
    ContestChartComponent.prototype.switchTeams = function (source) {
        this.joinContest(1 - this.contest.myTeam, source, true, true, false).then(function () {
        }, function () {
        });
    };
    ContestChartComponent.prototype.onContestButtonClick = function (event) {
        var _this = this;
        this.lastEventTimeStamp = event.timeStamp;
        if (this.contest.state === 'join') {
            //Will prompt an alert with 2 buttons with the team names
            //Upon selecting a team - send the user directly to play
            var cssClass;
            if (this.contest.teams[0].name.length + this.contest.teams[1].name.length > this.client.settings.contest.maxTeamsLengthForLargeFonts) {
                cssClass = 'chart-popup-button-team-small';
            }
            else {
                cssClass = 'chart-popup-button-team-normal';
            }
            alertService.alert({ 'type': 'PLAY_CONTEST_CHOOSE_TEAM' }, [
                {
                    'text': this.contest.teams[0].name,
                    'cssClass': cssClass + '-0',
                    'handler': function () {
                        _this.joinContest(0, 'button', false, false, true).then(function (rankModal) {
                            _this.contestButtonClick.emit({ 'contest': _this.contest, 'source': 'button' });
                            if (rankModal) {
                                rankModal.present();
                            }
                        }, function () {
                        });
                    }
                },
                {
                    'text': this.contest.teams[1].name,
                    'cssClass': cssClass + '-1',
                    'handler': function () {
                        _this.joinContest(1, 'button', false, false, true).then(function (rankModal) {
                            _this.contestButtonClick.emit({ 'contest': _this.contest, 'source': 'button' });
                            if (rankModal) {
                                rankModal.present();
                            }
                        }, function () {
                        });
                    }
                },
            ]);
        }
        else {
            this.contestButtonClick.emit({ 'contest': this.contest, 'source': 'button' });
        }
    };
    ContestChartComponent.prototype.onContestEdit = function (event) {
        analyticsService.track('contest/edit/click', { contestId: this.contest._id });
        this.client.openPage('SetContestPage', { mode: 'edit', contest: this.contest });
    };
    ContestChartComponent.prototype.onContestParticipantsClick = function (event) {
        this.lastEventTimeStamp = event.timeStamp;
        this.client.openPage('ContestParticipantsPage', { contest: this.contest, source: 'contest/participants' });
    };
    ContestChartComponent.prototype.onContestShareClick = function (event) {
        this.client.openPage('SharePage', { contest: this.contest, source: 'contest/share' });
    };
    __decorate([
        core_1.Input(), 
        __metadata('design:type', objects_1.Contest)
    ], ContestChartComponent.prototype, "contest", void 0);
    __decorate([
        core_1.Input(), 
        __metadata('design:type', String)
    ], ContestChartComponent.prototype, "alternateButtonText", void 0);
    __decorate([
        core_1.Output(), 
        __metadata('design:type', Object)
    ], ContestChartComponent.prototype, "contestSelected", void 0);
    __decorate([
        core_1.Output(), 
        __metadata('design:type', Object)
    ], ContestChartComponent.prototype, "myTeamSelected", void 0);
    __decorate([
        core_1.Output(), 
        __metadata('design:type', Object)
    ], ContestChartComponent.prototype, "contestButtonClick", void 0);
    ContestChartComponent = __decorate([
        core_1.Component({
            selector: 'contest-chart',
            templateUrl: 'build/components/contest-chart/contest-chart.html'
        }), 
        __metadata('design:paramtypes', [])
    ], ContestChartComponent);
    return ContestChartComponent;
})();
exports.ContestChartComponent = ContestChartComponent;
//# sourceMappingURL=contest-chart.js.map