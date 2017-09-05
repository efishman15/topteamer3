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
var client_1 = require('../../providers/client');
var soundService = require('../../providers/sound');
var analyticsService = require('../../providers/analytics');
var NewRankPage = (function () {
    function NewRankPage(params, viewController) {
        this.client = client_1.Client.getInstance();
        this.xpProgress = params.data.xpProgress;
        this.viewController = viewController;
        analyticsService.track('page/newRank', { 'rank': this.client.session.rank });
    }
    //The only life cycle eve currently called in modals
    NewRankPage.prototype.ngAfterViewInit = function () {
        analyticsService.track('page/newRank', { 'rank': this.client.session.rank });
        soundService.play('audio/finish_great_1');
    };
    NewRankPage.prototype.dismiss = function (okPressed) {
        this.viewController.dismiss(okPressed);
    };
    NewRankPage = __decorate([
        core_1.Component({
            templateUrl: 'build/pages/new-rank/new-rank.html'
        }), 
        __metadata('design:paramtypes', [ionic_angular_1.NavParams, ionic_angular_1.ViewController])
    ], NewRankPage);
    return NewRankPage;
})();
exports.NewRankPage = NewRankPage;
//# sourceMappingURL=new-rank.js.map