import {Component,ViewChild} from '@angular/core';
import {Refresher} from 'ionic-angular'
import {ContestListComponent} from '../../components/contest-list/contest-list';
import {Client} from '../../providers/client';
import * as analyticsService from '../../providers/analytics';

@Component({
  templateUrl: 'running-contests.html'
})

export class RunningContestsPage {

  @ViewChild(ContestListComponent) contestList: ContestListComponent;
  client: Client;
  private updateContestHandler:(eventData:any) => void;
  private removeContestHandler:(eventData:any) => void;
  private forceRefreshHandler:() => void;

  constructor() {
    this.client = Client.getInstance();
  }

  ionViewDidLoad() {
    this.updateContestHandler = (eventData:any) => {
      this.contestList.updateContest(eventData[0]);
    }
    this.removeContestHandler = (eventData:any) => {
      this.contestList.removeContest(eventData[0]);
    }
    this.forceRefreshHandler = () => {
      this.refreshList(true).then(()=> {
      }, ()=> {
      });
    }

    this.client.events.subscribe('app:runningContests:contestUpdated', this.updateContestHandler);
    this.client.events.subscribe('app:runningContests:contestRemoved', this.removeContestHandler);
    this.client.events.subscribe('app:runningContests:forceRefresh', this.forceRefreshHandler);
  }

  ionViewWillUnload() {
    this.client.events.unsubscribe('app:runningContests:contestUpdated', this.updateContestHandler);
    this.client.events.unsubscribe('app:runningContests:contestRemoved', this.removeContestHandler);
    this.client.events.unsubscribe('app:runningContests:forceRefresh', this.forceRefreshHandler);
  }

  ionViewWillEnter() {
    analyticsService.track('page/runningContests');
    this.refreshList().then (() => {
    }, () => {
    });
  }

  refreshList(forceRefresh? : boolean) {
    return this.contestList.refresh(forceRefresh);
  }

  doRefresh(refresher: Refresher) {
    this.refreshList(true).then(() => {
      refresher.complete();
    }, () => {
      refresher.complete();
    })
  }
}
