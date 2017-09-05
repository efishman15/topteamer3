import {Component, Input} from '@angular/core';
import {Client} from '../../providers/client';
import * as contestsService from '../../providers/contests';
import {Contest} from "../../objects/objects";

@Component({
  selector: 'contest-list',
  templateUrl: 'contest-list.html'
})

export class ContestListComponent {
  @Input() tab:String;

  contests:Array<Contest>;
  client:Client;
  lastRefreshTime;

  constructor() {
    this.client = Client.getInstance();
    this.lastRefreshTime = 0;
  }

  refresh(forceRefresh?:boolean) {
    return new Promise((resolve, reject) => {
      var now = (new Date()).getTime();

      //Check if refresh frequency reached
      if (now - this.lastRefreshTime < this.client.settings.lists.contests.refreshFrequencyInMilliseconds && !forceRefresh) {
        resolve();
        return;
      }

      contestsService.list(this.tab).then((contests:Array<Contest>) => {
        this.lastRefreshTime = now;
        this.contests = contests;
        resolve();
      }, () => {
        reject();
      });
    });
  }

  onContestSelected(data:any) {
    this.showContest(data, false);
  }

  onMyTeamSelected(data:any) {
    this.showContest(data, true);
  }

  showContest(data:any, tryRun:boolean) {
    data.source = this.tab + '/' + data.source;
    this.client.showContest(data.contest, data.source, tryRun).then((contest:Contest) => {
      if (contest) {
        //A new copy from the server
        this.updateContest(contest);
      }
    }, () => {
    });
  }

  onContestButtonClick(data:any) {
    switch (data.contest.status) {
      case 'finished':
      case 'starting':
        this.showContest(data, false);
        break;
      default:
        this.showContest(data, true);
        break;
    }
  }

  findContestIndex(contestId:string) {
    if (this.contests && this.contests.length > 0) {
      for (var i = 0; i < this.contests.length; i++) {
        if (this.contests[i]._id === contestId) {
          return i;
        }
      }
    }
    return -1;
  }

  updateContest(contest:Contest) {
    var index = this.findContestIndex(contest._id);
    if (index > -1) {
      this.contests[index] = contest;
    }
  }

  removeContest(contestId:string) {
    var index = this.findContestIndex(contestId);
    if (index > -1) {
      this.contests.splice(index, 1);
    }
  }
}
