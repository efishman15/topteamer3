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
var analyticsService = require('../../providers/analytics');
var ShareSuccessPage = (function () {
    function ShareSuccessPage(params, viewController) {
        this.client = client_1.Client.getInstance();
        this.quizResults = params.data.quizResults;
        this.viewController = viewController;
    }
    ShareSuccessPage.prototype.ionViewWillEnter = function () {
        analyticsService.track('page/shareSuccess', { 'contestId': this.quizResults.contest._id, 'story': this.quizResults.data.clientKey });
    };
    ShareSuccessPage.prototype.share = function () {
        if (this.client.user.credentials.type === 'facebook') {
            analyticsService.track('contest/shareSuccess/facebookPost/click');
            this.close('post');
        }
        else {
            analyticsService.track('contest/shareSuccess/share/click');
            this.close('share');
        }
    };
    ShareSuccessPage.prototype.close = function (action) {
        if (action === 'cancel') {
            analyticsService.track('contest/shareSuccess/cancel/click');
        }
        this.viewController.dismiss(action).then(function () {
        }, function () {
        });
    };
    ShareSuccessPage = __decorate([
        core_1.Component({
            templateUrl: 'build/pages/share-success/share-success.html'
        }), 
        __metadata('design:paramtypes', [ionic_angular_1.NavParams, ionic_angular_1.ViewController])
    ], ShareSuccessPage);
    return ShareSuccessPage;
})();
exports.ShareSuccessPage = ShareSuccessPage;
//# sourceMappingURL=share-success.js.map