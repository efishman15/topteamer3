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
var ionic_angular_1 = require('ionic-angular');
var DatePickerComponent = (function () {
    function DatePickerComponent() {
        this.dateSelected = new core_1.EventEmitter();
        this.client = client_1.Client.getInstance();
    }
    DatePickerComponent.prototype.ngOnInit = function () {
        this.hideCalendar = true;
        //Setting the input date for the date picker
        if (this.currentDateEpoch) {
            this.currentDate = new Date(this.currentDateEpoch);
        }
        else {
            this.currentDate = new Date();
        }
        this.currentDate.clearTime();
        this.displayedYear = this.currentDate.getFullYear();
        this.displayedMonth = this.currentDate.getMonth();
        this.monthsList = this.client.translate('DATE_PICKER_MONTH_NAMES');
        this.weekDays = this.client.translate('DATE_PICKER_WEEK_DAYS');
        this.rows = [];
        this.cols = [];
        this.rows.length = 6;
        this.cols.length = 7;
        this.setDateLimits();
        this.formatSelectedDate();
    };
    ;
    DatePickerComponent.prototype.toggleCalendar = function () {
        this.hideCalendar = !this.hideCalendar;
        if (!this.hideCalendar) {
            this.displayedYear = this.currentDate.getFullYear();
            this.displayedMonth = this.currentDate.getMonth();
            this.refreshMonth();
        }
    };
    DatePickerComponent.prototype.prevMonth = function () {
        if (this.displayedMonth === 0) {
            this.displayedYear--;
            this.displayedMonth = 11;
        }
        else {
            this.displayedMonth--;
        }
        this.refreshMonth();
    };
    ;
    DatePickerComponent.prototype.nextMonth = function () {
        if (this.displayedMonth === 11) {
            this.displayedYear++;
            this.displayedMonth = 0;
        }
        else {
            this.displayedMonth++;
        }
        this.refreshMonth();
    };
    ;
    DatePickerComponent.prototype.prevYear = function () {
        this.displayedYear--;
        this.refreshMonth();
    };
    ;
    DatePickerComponent.prototype.nextYear = function () {
        this.displayedYear++;
        this.refreshMonth();
    };
    ;
    DatePickerComponent.prototype.refreshMonth = function () {
        var firstDateOfTheMonth = new Date(this.displayedYear, this.displayedMonth, 1);
        var lastDateOfTheMonth = new Date(this.displayedYear, this.displayedMonth + 1, 0);
        var firstDateOfTheYear = new Date(this.displayedYear, 0, 1);
        var lastDateOfTheYear = new Date(this.displayedYear, 11, 31, 23, 59, 59, 999);
        var daysOffsetStart = firstDateOfTheMonth.getDay();
        var firstDayOfTheCalendar = new Date(firstDateOfTheMonth.getFullYear(), firstDateOfTheMonth.getMonth(), firstDateOfTheMonth.getDate() - daysOffsetStart);
        var totalDays = this.rows.length * this.cols.length;
        this.calendar = [];
        var today = new Date();
        today.clearTime();
        var todayEpoch = today.getTime();
        for (var i = 0; i < totalDays; i++) {
            var cellDate = new Date(firstDayOfTheCalendar.getFullYear(), firstDayOfTheCalendar.getMonth(), firstDayOfTheCalendar.getDate() + i, 0, 0, 0);
            cellDate.clearTime();
            var epochLocal = cellDate.getTime();
            this.calendar.push({
                dateObject: cellDate,
                date: cellDate.getDate(),
                month: cellDate.getMonth(),
                year: cellDate.getFullYear(),
                day: cellDate.getDay(),
                dateString: cellDate.toString(),
                epochLocal: epochLocal,
                epochUTC: (epochLocal + (cellDate.getTimezoneOffset() * 60 * 1000)),
                inMonth: (epochLocal >= firstDateOfTheMonth.getTime() && epochLocal <= lastDateOfTheMonth.getTime()),
                disabled: ((this.minEpochLocal && epochLocal < this.minEpochLocal) || (this.maxEpochLocal && epochLocal > this.maxEpochLocal)),
                selected: (epochLocal === this.currentDateEpoch),
                today: (epochLocal === todayEpoch)
            });
        }
        this.prevMonthDisabled = (this.minEpochLocal && this.minEpochLocal && firstDateOfTheMonth.getTime() < this.minEpochLocal);
        this.nextMonthDisabled = (this.maxEpochLocal && this.maxEpochLocal && lastDateOfTheMonth.getTime() > this.maxEpochLocal);
        this.prevYearDisabled = (this.minEpochLocal && this.minEpochLocal && firstDateOfTheYear.getTime() < this.minEpochLocal);
        this.nextYearDisabled = (this.maxEpochLocal && this.maxEpochLocal && lastDateOfTheYear.getTime() > this.maxEpochLocal);
    };
    DatePickerComponent.prototype.getCell = function (row, col) {
        return this.calendar[(row * this.cols.length) + col];
    };
    DatePickerComponent.prototype.pickDate = function (row, col) {
        var cell = this.getCell(row, col);
        if (!cell.disabled) {
            this.currentDate = cell.dateObject;
            this.currentDateEpoch = this.currentDate.getTime();
            this.formatSelectedDate();
            this.hideCalendar = true;
            this.dateSelected.emit(cell);
        }
    };
    DatePickerComponent.prototype.formatSelectedDate = function () {
        this.currentDateFormatted = this.currentDate.toLocaleDateString(this.client.currentLanguage.locale, this.client.currentLanguage.localeDateOptions);
    };
    DatePickerComponent.prototype.setDateLimits = function () {
        if (this.minDate) {
            var minDate = new Date(this.minDate);
            minDate.clearTime();
            this.minEpochLocal = minDate.getTime();
        }
        if (this.maxDate) {
            var maxDate = new Date(this.maxDate);
            maxDate.clearTime();
            //Another 24 hours to count all the hours in the max date including up to midnight (23:59:59.999)
            this.maxEpochLocal = maxDate.getTime() + 24 * 60 * 60 * 1000 - 1;
        }
    };
    __decorate([
        core_1.Input(), 
        __metadata('design:type', Number)
    ], DatePickerComponent.prototype, "currentDateEpoch", void 0);
    __decorate([
        core_1.Input(), 
        __metadata('design:type', Number)
    ], DatePickerComponent.prototype, "minDate", void 0);
    __decorate([
        core_1.Input(), 
        __metadata('design:type', Number)
    ], DatePickerComponent.prototype, "maxDate", void 0);
    __decorate([
        core_1.Input(), 
        __metadata('design:type', String)
    ], DatePickerComponent.prototype, "currentDateClass", void 0);
    __decorate([
        core_1.Output(), 
        __metadata('design:type', Object)
    ], DatePickerComponent.prototype, "dateSelected", void 0);
    DatePickerComponent = __decorate([
        core_1.Component({
            selector: 'date-picker',
            templateUrl: 'build/components/date-picker/date-picker.html',
            directives: [ionic_angular_1.Icon]
        }), 
        __metadata('design:paramtypes', [])
    ], DatePickerComponent);
    return DatePickerComponent;
})();
exports.DatePickerComponent = DatePickerComponent;
//# sourceMappingURL=date-picker.js.map