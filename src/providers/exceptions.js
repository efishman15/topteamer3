var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var core_1 = require('@angular/core');
var client_1 = require('./client');
var analyticsService = require('./analytics');
var MyArrayLogger = (function () {
    function MyArrayLogger() {
        this.res = [];
    }
    MyArrayLogger.prototype.log = function (s) {
        this.res.push(s);
    };
    MyArrayLogger.prototype.logError = function (s) {
        this.res.push(s);
    };
    MyArrayLogger.prototype.logGroup = function (s) {
        this.res.push(s);
    };
    MyArrayLogger.prototype.logGroupEnd = function () {
        this.res.forEach(function (error) {
            console.error(error);
        });
    };
    ;
    return MyArrayLogger;
})();
exports.MyArrayLogger = MyArrayLogger;
var MyExceptionHandler = (function (_super) {
    __extends(MyExceptionHandler, _super);
    function MyExceptionHandler() {
        _super.call(this, new MyArrayLogger(), true);
    }
    MyExceptionHandler.prototype.call = function (exception, stackTrace, reason) {
        var errorMessage = exception.message;
        if (exception.wrapperStack) {
            errorMessage += ', ' + exception.wrapperStack;
        }
        analyticsService.logError('UnhandledException', { exception: exception, stack: stackTrace });
        var client = client_1.Client.getInstance();
        if (client && client.session && client.session.isAdmin) {
            _super.prototype.call.call(this, exception, stackTrace, reason);
        }
    };
    return MyExceptionHandler;
})(core_1.ExceptionHandler);
exports.MyExceptionHandler = MyExceptionHandler;
//# sourceMappingURL=exceptions.js.map