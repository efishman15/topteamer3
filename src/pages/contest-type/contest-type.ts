import {Component} from '@angular/core';
import {ViewController} from 'ionic-angular';
import {Client} from '../../providers/client';
import * as analyticsService from '../../providers/analytics';

@Component({
  templateUrl: 'contest-type.html'
})
export class ContestTypePage {

  client:Client;
  viewController: ViewController;

  constructor(viewController: ViewController) {
    this.client = Client.getInstance();
    this.viewController = viewController;
  }

  //The only life cycle event currently called in modals
  ngAfterViewInit() {
    analyticsService.track('page/contestType');
  }

  selectContestContent(contestTypeId) {
    if (contestTypeId && this.client.settings.newContest.contestTypes[contestTypeId].disabled) {
      return;
    }
    analyticsService.track('newContest/type/' + (contestTypeId ? contestTypeId : 'cancel'));
    this.viewController.dismiss(contestTypeId);
  }

}
