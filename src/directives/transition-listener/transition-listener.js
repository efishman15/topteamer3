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
var TransitionListener = (function () {
    function TransitionListener() {
        this.transitionStart = new core_1.EventEmitter();
        this.transitionEnd = new core_1.EventEmitter();
    }
    TransitionListener.prototype.transitionStarted = function ($event) {
        this.transitionStart.emit($event);
    };
    TransitionListener.prototype.transitionEnded = function ($event) {
        this.transitionEnd.emit($event);
    };
    __decorate([
        core_1.Input(), 
        __metadata('design:type', String)
    ], TransitionListener.prototype, "transitioned", void 0);
    __decorate([
        core_1.Output(), 
        __metadata('design:type', Object)
    ], TransitionListener.prototype, "transitionStart", void 0);
    __decorate([
        core_1.Output(), 
        __metadata('design:type', Object)
    ], TransitionListener.prototype, "transitionEnd", void 0);
    TransitionListener = __decorate([
        core_1.Directive({
            selector: '[transitioned]',
            host: {
                '(transitionstart)': 'transitionStart()',
                '(transitionend)': 'transitionEnded()',
                '(webkitTransitionStart)': 'transitionStarted()',
                '(webkitTransitionEnd)': 'transitionEnded()',
                '(otransitionstart)': 'transitionStarted()',
                '(otransitionend)': 'transitionEnded()',
                '(animationstart)': 'transitionStarted()',
                '(animationend)': 'transitionEnded()',
                '(webkitAnimationStart)': 'transitionStarted($event)',
                '(webkitAnimationEnd)': 'transitionEnded($event)',
                '(oanimationstart)': 'transitionStarted($event)',
                '(oanimationend)': 'transitionEnded($event)',
                '(MSAnimationStart)': 'transitionStarted($event)',
                '(MSAnimationEnd)': 'transitionEnded($event)',
            }
        }), 
        __metadata('design:paramtypes', [])
    ], TransitionListener);
    return TransitionListener;
})();
exports.TransitionListener = TransitionListener;
//# sourceMappingURL=transition-listener.js.map