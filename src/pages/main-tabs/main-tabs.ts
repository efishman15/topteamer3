import {Component,ViewChild} from '@angular/core';
import {Tabs} from 'ionic-angular';
import {Client} from '../../providers/client';
import {Contest} from '../../objects/objects';

const ACTION_UPDATE_CONTEST: string = 'contestUpdated';
const ACTION_REMOVE_CONTEST:string = 'contestRemoved';
const ACTION_FORCE_REFRESH:string = 'forceRefresh';

@Component({
  templateUrl: 'main-tabs.html'
})
export class MainTabsPage {

  client:Client;
  @ViewChild(Tabs) mainTabs:Tabs;

  private rootMyContestsPage;
  private rootRunningContestsPage;
  private rootLeaderboardsPage;

  private contestCreatedHandler : () => void;
  private contestUpdatedHandler : (eventData:any) => void;
  private contestRemovedHandler : (eventData:any) => void;
  private languageChangedHandler : (eventData:any) => void;
  private switchedToFacebookHandler : () => void;
  private serverPopupHandler : (eventData:any) => Promise<any>;
  private noPersonalContestsHandler : () => void;
  private showLeaderContestsHandler : () => void;

  constructor() {

    this.client = Client.getInstance();

    // set the root pages for each tab
    this.rootMyContestsPage = this.client.getPage('MyContestsPage');
    this.rootRunningContestsPage = this.client.getPage('RunningContestsPage');
    this.rootLeaderboardsPage = this.client.getPage('LeaderboardsPage');
  }

  ionViewDidLoad() {
    this.contestCreatedHandler = () => {
      //Force refresh my contests only - leading contests will hardly be influenced by a new
      //contest just created
      this.publishActionToTab(0,ACTION_FORCE_REFRESH);
    }
    this.contestUpdatedHandler = (eventData:any) => {

      let contest:Contest = eventData[0];
      let previousStatus:string = eventData[1];
      let currentStatus:string = eventData[2];

      if (previousStatus === currentStatus) {
        //Was finished and remained finished, or was running and still running...
        switch (currentStatus) {
          case 'starting':
            //For admins - future contests - appear only in "my Contests"
            this.publishActionToTab(0,ACTION_UPDATE_CONTEST,contest);
            break;
          case 'running':
            //Appears in my contests / running contests
            this.publishActionToTab(0,ACTION_UPDATE_CONTEST,contest);
            this.publishActionToTab(1,ACTION_UPDATE_CONTEST,contest);
            break;
          case 'finished':
            //Appears in recently finished contests
            this.publishActionToTab(2,ACTION_UPDATE_CONTEST,contest);
            break;
        }
      }
      else {
        switch (previousStatus) {
          case 'starting':
            if (currentStatus === 'running') {

              //Update my contests
              this.publishActionToTab(0,ACTION_UPDATE_CONTEST,contest);

              //Refresh running contests - might appear there
              this.publishActionToTab(1,ACTION_FORCE_REFRESH);
            }
            else {
              //finished

              //Remove from my contests
              this.publishActionToTab(0,ACTION_REMOVE_CONTEST,contest._id);

              //Refresh recently finished contests
              this.publishActionToTab(2,ACTION_FORCE_REFRESH);
            }
            break;
          case 'running':
            if (currentStatus === 'starting') {

              //Update my contests
              this.publishActionToTab(0,ACTION_UPDATE_CONTEST,contest);

              //Remove from running contests
              this.publishActionToTab(1,ACTION_REMOVE_CONTEST,contest._id);
            }
            else {
              //finished

              //Remove from my contests and from running contests
              this.publishActionToTab(0,ACTION_REMOVE_CONTEST,contest._id);
              this.publishActionToTab(1,ACTION_REMOVE_CONTEST,contest._id);

              //Refresh recently finished contests
              this.publishActionToTab(2,ACTION_FORCE_REFRESH);
            }
            break;
          case 'finished':
            //Remove from finished contests
            this.publishActionToTab(2,ACTION_REMOVE_CONTEST,contest._id);

            if (currentStatus === 'starting') {

              //Refresh my contests
              this.publishActionToTab(0,ACTION_FORCE_REFRESH);
            }
            else {
              //running

              //Refresh my contests
              this.publishActionToTab(0,ACTION_FORCE_REFRESH);

              //Refresh running contests
              this.publishActionToTab(1,ACTION_FORCE_REFRESH);

            }
            break;
        }
      }
    }
    this.contestRemovedHandler = (eventData:any) => {

      let contestId:string = eventData[0];
      let finishedContest:boolean = eventData[1];

      if (!finishedContest) {
        //Try to remove it from 'my contests' and 'running contests' tabs
        this.publishActionToTab(0,ACTION_REMOVE_CONTEST, contestId);
        this.publishActionToTab(1,ACTION_REMOVE_CONTEST, contestId);
      }
      else {
        //Try to remove it from the recently finished tab
        this.publishActionToTab(2,ACTION_REMOVE_CONTEST, contestId);
      }

    }
    this.languageChangedHandler = (eventData:any) => {
      if (eventData[0]) {
        window.location.reload();
      }
      else {
        //Just refresh the contests to reflect the new language
        this.publishActionToTab(0,ACTION_FORCE_REFRESH);
        this.publishActionToTab(1,ACTION_FORCE_REFRESH);
        this.publishActionToTab(2,ACTION_FORCE_REFRESH);
      }
    }
    this.switchedToFacebookHandler = () => {
      //Just refresh the contests to reflect the user
      this.publishActionToTab(0,ACTION_FORCE_REFRESH);
      this.publishActionToTab(1,ACTION_FORCE_REFRESH);
      this.publishActionToTab(2,ACTION_FORCE_REFRESH);
    }
    this.serverPopupHandler = (eventData:any) => {
      return this.client.showModalPage('ServerPopupPage', {'serverPopup': eventData[0]});
    }
    this.noPersonalContestsHandler = () => {
      this.mainTabs.select(1); //Switch to "Running contests"
    }
    this.showLeaderContestsHandler = () => {
      this.mainTabs.select(1); //Switch to "Running contests"
    }

    this.client.events.subscribe('app:contestCreated', this.contestCreatedHandler);
    this.client.events.subscribe('app:contestUpdated', this.contestUpdatedHandler);
    this.client.events.subscribe('app:contestRemoved', this.contestRemovedHandler);
    this.client.events.subscribe('app:languageChanged', this.languageChangedHandler);
    this.client.events.subscribe('app:switchedToFacebook', this.switchedToFacebookHandler);
    this.client.events.subscribe('app:serverPopup', this.serverPopupHandler);
    this.client.events.subscribe('app:noPersonalContests', this.noPersonalContestsHandler);
    this.client.events.subscribe('app:showLeadingContests', this.showLeaderContestsHandler);
  }

  ionViewWillUnload() {
    this.client.events.unsubscribe('app:contestCreated', this.contestCreatedHandler);
    this.client.events.unsubscribe('app:contestUpdated', this.contestUpdatedHandler);
    this.client.events.unsubscribe('app:contestRemoved', this.contestRemovedHandler);
    this.client.events.unsubscribe('app:languageChanged', this.languageChangedHandler);
    this.client.events.unsubscribe('app:switchedToFacebook', this.switchedToFacebookHandler);
    this.client.events.unsubscribe('app:serverPopup', this.serverPopupHandler);
    this.client.events.unsubscribe('app:noPersonalContests', this.noPersonalContestsHandler);
    this.client.events.unsubscribe('app:showLeadingContests', this.showLeaderContestsHandler);
  }

  ionViewDidEnter() {
    //Events here could be serverPopup just as the app loads - the page should be fully visible
    this.client.processInternalEvents();

    //Came from external deep linking - only for the case the the appp is running
    if (this.client.deepLinkContestId) {
      var contestId = this.client.deepLinkContestId;
      this.client.deepLinkContestId = null;
      this.client.displayContestById(contestId).then(() => {
      }, () => {
      });
    }
  }

  publishActionToTab(index:number, action: string, param?: any) {

    let eventName: string = 'app:';
    switch (index) {
      case 0:
            eventName += 'myContests';
            break;
      case 1:
        eventName += 'runningContests';
        break;
      case 2:
        eventName += 'recentlyFinishedContests';
        break;
    }

    eventName += ':' + action;

    if (param) {
      this.client.events.publish(eventName, param);
    }
    else {
      this.client.events.publish(eventName);
    }
  }
}
