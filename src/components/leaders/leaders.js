var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var client_1 = require('../../providers/client');
var core_1 = require('@angular/core');
var ionic_angular_1 = require('ionic-angular');
var leaderboardsService = require('../../providers/leaderboards');
var connectService = require('../../providers/connect');
var LeadersComponent = (function () {
    function LeadersComponent() {
        this.client = client_1.Client.getInstance();
        this.friendsLastRefreshTime = 0;
        this.weeklyLastRefreshTime = 0;
        this.generalContestLastRefreshTime = 0; //should apply only to the contest currently shown - when view closes and another contest appears - should refresh from server again
        this.team0ContestLastRefreshTime = 0; //should apply only to the contest currently shown - when view closes and another contest appears - should refresh from server again
        this.team1ContestLastRefreshTime = 0; //should apply only to the contest currently shown - when view closes and another contest appears - should refresh from server again
    }
    LeadersComponent.prototype.showFriends = function (forceRefresh) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.innerShowFriends(resolve, reject, forceRefresh);
        });
    };
    LeadersComponent.prototype.innerShowFriends = function (resolve, reject, forceRefresh) {
        var _this = this;
        var now = (new Date()).getTime();
        //Check if refresh frequency reached
        if (now - this.friendsLastRefreshTime < this.client.settings.lists.leaderboards.friends.refreshFrequencyInMilliseconds && !forceRefresh) {
            this.leaders = this.lastFriendsLeaders;
            this.mode = 'friends';
            resolve();
            return;
        }
        leaderboardsService.friends().then(function (leaders) {
            _this.friendsLastRefreshTime = now;
            _this.leaders = leaders;
            _this.mode = 'friends';
            _this.lastFriendsLeaders = leaders;
            resolve();
        }, function (err) {
            if (err.type === 'SERVER_ERROR_MISSING_FRIENDS_PERMISSION' && err.additionalInfo && err.additionalInfo.confirmed) {
                connectService.login(_this.client.settings.facebook.friendsPermissions, true).then(function () {
                    _this.innerShowFriends(resolve, reject, forceRefresh);
                }, function () {
                    reject();
                });
            }
            else {
                reject();
            }
        });
    };
    LeadersComponent.prototype.showWeekly = function (forceRefresh) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var now = (new Date()).getTime();
            //Check if refresh frequency reached
            if (now - _this.weeklyLastRefreshTime < _this.client.settings.lists.leaderboards.weekly.refreshFrequencyInMilliseconds && !forceRefresh) {
                _this.leaders = _this.lastWeeklyLeaders;
                _this.mode = 'weekly';
                resolve();
                return;
            }
            leaderboardsService.weekly().then(function (leaders) {
                _this.weeklyLastRefreshTime = now;
                _this.leaders = leaders;
                _this.mode = 'weekly';
                _this.lastWeeklyLeaders = leaders;
                resolve();
            }, function () {
                reject();
            });
        });
    };
    //If teamId is not passed - general contest leaderboard is shown
    LeadersComponent.prototype.showContestParticipants = function (contestId, teamId, forceRefresh) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var now = (new Date()).getTime();
            var lastRefreshTime;
            var lastLeaders;
            switch (teamId) {
                case 0:
                    lastRefreshTime = _this.team0ContestLastRefreshTime;
                    lastLeaders = _this.lastTeam0ContestLeaders;
                    break;
                case 1:
                    lastRefreshTime = _this.team1ContestLastRefreshTime;
                    lastLeaders = _this.lastTeam1ContestLeaders;
                    break;
                default:
                    lastRefreshTime = _this.generalContestLastRefreshTime;
                    lastLeaders = _this.lastGeneralContestLeaders;
                    break;
            }
            //Check if refresh frequency reached
            if (now - lastRefreshTime < _this.client.settings.lists.leaderboards.contest.refreshFrequencyInMilliseconds && !forceRefresh) {
                _this.leaders = lastLeaders;
                _this.mode = 'contest';
                resolve();
                return;
            }
            leaderboardsService.contest(contestId, teamId).then(function (leaders) {
                _this.leaders = leaders;
                _this.mode = 'contest';
                switch (teamId) {
                    case 0:
                        _this.lastTeam0ContestLeaders = leaders;
                        _this.team0ContestLastRefreshTime = now;
                        break;
                    case 1:
                        _this.lastTeam1ContestLeaders = leaders;
                        _this.team1ContestLastRefreshTime = now;
                        break;
                    default:
                        _this.lastGeneralContestLeaders = leaders;
                        _this.generalContestLastRefreshTime = now;
                        break;
                }
                resolve();
            }, function () {
                reject();
            });
        });
    };
    LeadersComponent = __decorate([
        core_1.Component({
            selector: 'leaders',
            templateUrl: 'build/components/leaders/leaders.html',
            directives: [ionic_angular_1.List, ionic_angular_1.Item]
        }), 
        __metadata('design:paramtypes', [])
    ], LeadersComponent);
    return LeadersComponent;
})();
exports.LeadersComponent = LeadersComponent;
//# sourceMappingURL=leaders.js.map