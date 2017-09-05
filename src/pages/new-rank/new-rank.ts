import {Component} from '@angular/core';
import {NavParams,ViewController} from 'ionic-angular';
import {Client} from '../../providers/client';
import * as soundService from '../../providers/sound';
import * as analyticsService from '../../providers/analytics';

@Component({
  templateUrl: 'new-rank.html'
})
export class NewRankPage {

  client:Client;
  xpProgress:Object;
  viewController:ViewController;

  constructor(params:NavParams, viewController: ViewController) {
    this.client = Client.getInstance();
    this.xpProgress = params.data.xpProgress;
    this.viewController = viewController;
    analyticsService.track('page/newRank', {'rank' : this.client.session.rank});
  }

  //The only life cycle eve currently called in modals
  ngAfterViewInit() {
    analyticsService.track('page/newRank', {'rank' : this.client.session.rank});
    soundService.play('audio/finish_great_1');
  }

  dismiss(okPressed) {
    this.viewController.dismiss(okPressed);
  }
}
