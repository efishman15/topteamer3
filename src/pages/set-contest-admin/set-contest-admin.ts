import {Component} from '@angular/core';
import {NavParams, ViewController} from 'ionic-angular';
import {Client} from '../../providers/client';
import * as analyticsService from '../../providers/analytics';
import * as contestsService from '../../providers/contests';
import * as alertService from '../../providers/alert';
import {CalendarCell} from '../../objects/objects';

@Component({
  templateUrl: 'set-contest-admin.html'
})

export class SetContestAdminPage {

  client:Client;
  params:NavParams;
  viewController: ViewController;

  showRemoveContest:Boolean;

  constructor(params:NavParams, viewController: ViewController) {

    this.client = Client.getInstance();
    this.params = params;
    this.viewController = viewController;

    this.showRemoveContest = (this.params.data.mode === 'edit' && this.client.session.isAdmin);

  }

  ionViewWillEnter() {
    var eventData = {'mode': this.params.data.mode};
    if (this.params.data.mode === 'edit') {
      eventData['contestId'] = this.params.data.contestLocalCopy._id;
    }
    analyticsService.track('page/setContestAdmin', eventData);
  }

  ionViewDidLeave() {
    //For some reason manipulating the numbers and sliders turns them to strings in the model
    this.params.data.contestLocalCopy.teams[0].score = parseInt(this.params.data.contestLocalCopy.teams[0].score);
    this.params.data.contestLocalCopy.teams[1].score = parseInt(this.params.data.contestLocalCopy.teams[1].score);
    this.params.data.contestLocalCopy.systemParticipants = parseInt(this.params.data.contestLocalCopy.systemParticipants);
    this.params.data.contestLocalCopy.rating = parseInt(this.params.data.contestLocalCopy.rating);
  }

  startDateSelected(dateSelection: CalendarCell) {
    var nowDateWithTime = new Date();
    var nowDateWithoutTime = new Date();
    nowDateWithoutTime .clearTime();
    var nowEpochWithTime = nowDateWithTime.getTime();
    var nowEpochWithoutTime = nowDateWithoutTime.getTime();
    var currentTimeInMilliseconds = nowEpochWithTime - nowEpochWithoutTime;
    if (this.params.data.mode === 'add') {
      if (dateSelection.epochLocal > nowEpochWithoutTime) {
        //Future date - move end date respectfully
        this.params.data.contestLocalCopy.endDate += dateSelection.epochLocal - nowEpochWithoutTime + currentTimeInMilliseconds;
      }
    }

    this.params.data.contestLocalCopy.startDate = dateSelection.epochLocal + currentTimeInMilliseconds;
    if (this.params.data.contestLocalCopy.startDate > this.params.data.contestLocalCopy.endDate) {
      this.params.data.contestLocalCopy.endDate = this.params.data.contestLocalCopy.startDate + 24*60*60*1000; //add additional 24 hours
    }
  }

  removeContest() {
    analyticsService.track('contest/remove/click', {'contestId': this.params.data.contestLocalCopy._id});
    alertService.confirm('CONFIRM_REMOVE_TITLE', 'CONFIRM_REMOVE_TEMPLATE', {name: this.params.data.contestName}).then(() => {
      analyticsService.track('contest/removed', {'contestId': this.params.data.contestLocalCopy._id});
      contestsService.removeContest(this.params.data.contestLocalCopy._id).then(() => {
        let now: number = (new Date()).getTime();
        let finishedContest: boolean = (this.params.data.contestLocalCopy.endDate < now);
        this.client.events.publish('app:contestRemoved', this.params.data.contestLocalCopy._id, finishedContest);
        setTimeout(() => {
          this.client.nav.popToRoot({animate: false});
        }, 1000);
      }, () => {

      });
    }, () => {
      //Do nothing on cancel
    });
  }

}
