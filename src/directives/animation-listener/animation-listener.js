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
var AnimationListener = (function () {
    function AnimationListener() {
        this.animationStart = new core_1.EventEmitter();
        this.animationEnd = new core_1.EventEmitter();
    }
    AnimationListener.prototype.animationStarted = function ($event) {
        this.animationStart.emit($event);
    };
    AnimationListener.prototype.animationEnded = function ($event) {
        this.animationEnd.emit($event);
    };
    __decorate([
        core_1.Input(), 
        __metadata('design:type', String)
    ], AnimationListener.prototype, "animated", void 0);
    __decorate([
        core_1.Output(), 
        __metadata('design:type', Object)
    ], AnimationListener.prototype, "animationStart", void 0);
    __decorate([
        core_1.Output(), 
        __metadata('design:type', Object)
    ], AnimationListener.prototype, "animationEnd", void 0);
    AnimationListener = __decorate([
        core_1.Directive({
            selector: '[animated]',
            host: {
                '(animationstart)': 'animationStarted($event)',
                '(animationend)': 'animationEnded($event)',
                '(webkitAnimationStart)': 'animationStarted($event)',
                '(webkitAnimationEnd)': 'animationEnded($event)',
                '(oanimationstart)': 'animationStarted($event)',
                '(oanimationend)': 'animationEnded($event)',
                '(MSAnimationStart)': 'animationStarted($event)',
                '(MSAnimationEnd)': 'animationEnded($event)'
            }
        }), 
        __metadata('design:paramtypes', [])
    ], AnimationListener);
    return AnimationListener;
})();
exports.AnimationListener = AnimationListener;
//# sourceMappingURL=animation-listener.js.map