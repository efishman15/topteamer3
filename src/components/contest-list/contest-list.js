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
var contest_chart_1 = require('../contest-chart/contest-chart');
var client_1 = require('../../providers/client');
var contestsService = require('../../providers/contests');
var ContestListComponent = (function () {
    function ContestListComponent() {
        this.client = client_1.Client.getInstance();
        this.lastRefreshTime = 0;
    }
    ContestListComponent.prototype.refresh = function (forceRefresh) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var now = (new Date()).getTime();
            //Check if refresh frequency reached
            if (now - _this.lastRefreshTime < _this.client.settings.lists.contests.refreshFrequencyInMilliseconds && !forceRefresh) {
                resolve();
                return;
            }
            contestsService.list(_this.tab).then(function (contests) {
                _this.lastRefreshTime = now;
                _this.contests = contests;
                resolve();
            }, function () {
                reject();
            });
        });
    };
    ContestListComponent.prototype.onContestSelected = function (data) {
        this.showContest(data, false);
    };
    ContestListComponent.prototype.onMyTeamSelected = function (data) {
        this.showContest(data, true);
    };
    ContestListComponent.prototype.showContest = function (data, tryRun) {
        var _this = this;
        data.source = this.tab + '/' + data.source;
        this.client.showContest(data.contest, data.source, tryRun).then(function (contest) {
            if (contest) {
                //A new copy from the server
                _this.updateContest(contest);
            }
        }, function () {
        });
    };
    ContestListComponent.prototype.onContestButtonClick = function (data) {
        switch (data.contest.status) {
            case 'finished':
            case 'starting':
                this.showContest(data, false);
                break;
            default:
                this.showContest(data, true);
                break;
        }
    };
    ContestListComponent.prototype.findContestIndex = function (contestId) {
        if (this.contests && this.contests.length > 0) {
            for (var i = 0; i < this.contests.length; i++) {
                if (this.contests[i]._id === contestId) {
                    return i;
                }
            }
        }
        return -1;
    };
    ContestListComponent.prototype.updateContest = function (contest) {
        var index = this.findContestIndex(contest._id);
        if (index > -1) {
            this.contests[index] = contest;
        }
    };
    ContestListComponent.prototype.removeContest = function (contestId) {
        var index = this.findContestIndex(contestId);
        if (index > -1) {
            this.contests.splice(index, 1);
        }
    };
    __decorate([
        core_1.Input(), 
        __metadata('design:type', String)
    ], ContestListComponent.prototype, "tab", void 0);
    ContestListComponent = __decorate([
        core_1.Component({
            selector: 'contest-list',
            templateUrl: 'build/components/contest-list/contest-list.html',
            directives: [contest_chart_1.ContestChartComponent],
        }), 
        __metadata('design:paramtypes', [])
    ], ContestListComponent);
    return ContestListComponent;
})();
exports.ContestListComponent = ContestListComponent;
//# sourceMappingURL=contest-list.js.map