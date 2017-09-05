import {Component, Input, EventEmitter, Output} from '@angular/core';
import {Client} from '../../providers/client';
import {CalendarCell} from '../../objects/objects';


@Component({
  selector: 'date-picker',
  templateUrl: 'date-picker.html'
})

export class DatePickerComponent {

  @Input() currentDateEpoch:number;
  @Input() minDate:number;
  @Input() maxDate:number;
  @Input() currentDateClass:String;
  @Output() dateSelected = new EventEmitter();

  client:Client;
  currentDate:Date;
  hideCalendar:boolean;
  displayedYear:number;
  displayedMonth:number;

  monthsList:Array<string>;
  weekDays:Array<string>;
  calendar:Array<CalendarCell>;
  rows:Array<any>;
  cols:Array<any>;
  minEpochLocal:any;
  maxEpochLocal:any;
  currentDateFormatted: string;
  prevMonthDisabled:boolean;
  nextMonthDisabled:boolean;
  prevYearDisabled:boolean;
  nextYearDisabled:boolean;

  constructor() {
    this.client = Client.getInstance();
  }

  ngOnInit() {
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

  toggleCalendar() {
    this.hideCalendar = !this.hideCalendar;
    if (!this.hideCalendar) {
      this.displayedYear = this.currentDate.getFullYear();
      this.displayedMonth = this.currentDate.getMonth();
      this.refreshMonth();
    }
  }

  prevMonth() {
    if (this.displayedMonth === 0) {
      this.displayedYear--;
      this.displayedMonth = 11;
    }
    else {
      this.displayedMonth--;
    }
    this.refreshMonth();
  };

  nextMonth() {
    if (this.displayedMonth === 11) {
      this.displayedYear++;
      this.displayedMonth = 0;
    }
    else {
      this.displayedMonth++;
    }
    this.refreshMonth();
  };

  prevYear() {
    this.displayedYear--;
    this.refreshMonth();
  };

  nextYear() {
    this.displayedYear++;
    this.refreshMonth();
  };

  refreshMonth() {

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
        disabled: ( (this.minEpochLocal && epochLocal < this.minEpochLocal) || (this.maxEpochLocal && epochLocal > this.maxEpochLocal) ),
        selected: (epochLocal === this.currentDateEpoch),
        today: (epochLocal === todayEpoch)
      });
    }

    this.prevMonthDisabled = (this.minEpochLocal && this.minEpochLocal && firstDateOfTheMonth.getTime() < this.minEpochLocal);
    this.nextMonthDisabled = (this.maxEpochLocal && this.maxEpochLocal && lastDateOfTheMonth.getTime() > this.maxEpochLocal);
    this.prevYearDisabled = (this.minEpochLocal && this.minEpochLocal && firstDateOfTheYear.getTime() < this.minEpochLocal);
    this.nextYearDisabled = (this.maxEpochLocal && this.maxEpochLocal && lastDateOfTheYear.getTime() > this.maxEpochLocal);

  }

  getCell(row, col) {
    return this.calendar[(row * this.cols.length) + col];
  }

  pickDate(row, col) {
    var cell = this.getCell(row, col);
    if (!cell.disabled) {
      this.currentDate = cell.dateObject;
      this.currentDateEpoch = this.currentDate.getTime();
      this.formatSelectedDate();
      this.hideCalendar = true;
      this.dateSelected.emit(cell);
    }
  }

  formatSelectedDate() {
    this.currentDateFormatted = this.currentDate.toLocaleDateString(this.client.currentLanguage.locale,this.client.currentLanguage.localeDateOptions);
  }

  setDateLimits() {
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
  }
}
