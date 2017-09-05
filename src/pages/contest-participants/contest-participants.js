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
var leaders_1 = require('../../components/leaders/leaders');
var simple_tabs_1 = require('../../components/simple-tabs/simple-tabs');
var simple_tab_1 = require('../../components/simple-tab/simple-tab');
var core_2 = require('@angular/core');
var client_1 = require('../../providers/client');
var analyticsService = require('../../providers/analytics');
var ContestParticipantsPage = (function () {
    function ContestParticipantsPage(params) {
        this.client = client_1.Client.getInstance();
        this.params = params;
    }
    ContestParticipantsPage.prototype.ionViewLoaded = function () {
        var _this = this;
        this.leaderboardsUpdatedHandler = function () {
            switch (_this.tabId) {
                case -1:
                    _this.showContestParticipants(true).then(function () {
                    }, function () {
                    });
                    break;
                case 0:
                case 1:
                    _this.showTeamParticipants(_this.tabId, true).then(function () {
                    }, function () {
                    });
                    break;
            }
        };
        this.client.events.subscribe('app:leaderboardsUpdated', this.leaderboardsUpdatedHandler);
    };
    ContestParticipantsPage.prototype.ionViewWillUnload = function () {
        this.client.events.unsubscribe('app:leaderboardsUpdated', this.leaderboardsUpdatedHandler);
    };
    ContestParticipantsPage.prototype.ionViewWillEnter = function () {
        analyticsService.track('page/contestParticipants', { contestId: this.params.data.contest._id });
        if (this.leadersComponent) {
            return this.tabGeneralParticipants();
        }
    };
    ContestParticipantsPage.prototype.tabGeneralParticipants = function () {
        this.tabId = -1;
        return this.showContestParticipants(false);
    };
    ContestParticipantsPage.prototype.tabTeamParticipants = function (teamId) {
        this.tabId = teamId;
        return this.showTeamParticipants(teamId, false);
    };
    ContestParticipantsPage.prototype.showContestParticipants = function (forceRefresh) {
        analyticsService.track('contest/participants/' + this.params.data.source + '/leaderboard/all');
        return this.leadersComponent.showContestParticipants(this.params.data.contest._id, null, forceRefresh);
    };
    ContestParticipantsPage.prototype.showTeamParticipants = function (teamId, forceRefresh) {
        analyticsService.track('contest/participants/' + this.params.data.source + '/leaderboard/team' + teamId);
        return this.leadersComponent.showContestParticipants(this.params.data.contest._id, teamId, forceRefresh);
    };
    ContestParticipantsPage.prototype.doRefresh = function (refresher) {
        switch (this.tabId) {
            case -1:
                this.showContestParticipants(true).then(function () {
                    refresher.complete();
                }, function () {
                    refresher.complete();
                });
                break;
            case 0:
            case 1:
                this.showTeamParticipants(this.tabId, true).then(function () {
                    refresher.complete();
                }, function () {
                    refresher.complete();
                });
                break;
        }
    };
    __decorate([
        core_2.ViewChild(leaders_1.LeadersComponent), 
        __metadata('design:type', leaders_1.LeadersComponent)
    ], ContestParticipantsPage.prototype, "leadersComponent", void 0);
    ContestParticipantsPage = __decorate([
        core_1.Component({
            templateUrl: 'build/pages/contest-participants/contest-participants.html',
            directives: [simple_tabs_1.SimpleTabsComponent, simple_tab_1.SimpleTabComponent, leaders_1.LeadersComponent]
        }), 
        __metadata('design:paramtypes', [ionic_angular_1.NavParams])
    ], ContestParticipantsPage);
    return ContestParticipantsPage;
})();
exports.ContestParticipantsPage = ContestParticipantsPage;
//# sourceMappingURL=contest-participants.js.map