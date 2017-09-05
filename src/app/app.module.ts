import { NgModule, ErrorHandler } from '@angular/core';
import { HttpModule } from '@angular/http';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { AppVersion } from '@ionic-native/app-version';
//App
import { TopTeamerApp } from './app.component';

//Components
import { ContestChartComponent } from '../components/contest-chart/contest-chart';
import { ContestListComponent } from '../components/contest-list/contest-list';
import { DatePickerComponent } from '../components/date-picker/date-picker';
import { LeadersComponent } from '../components/leaders/leaders';
import { LoadingModalComponent } from '../components/loading-modal/loading-modal';
import { PlayerInfoComponent } from '../components/player-info/player-info';
import { SimpleTabComponent } from '../components/simple-tab/simple-tab';
import { SimpleTabsComponent } from '../components/simple-tabs/simple-tabs';

//Pages
import { ContestPage } from '../pages/contest/contest';
import { ContestParticipantsPage } from '../pages/contest-participants/contest-participants';
import { ContestTypePage } from '../pages/contest-type/contest-type';
import { LeaderboardsPage } from '../pages/leaderboards/leaderboards';
import { LoginPage } from '../pages/login/login';
import { MainTabsPage } from '../pages/main-tabs/main-tabs';
import { MyContestsPage } from '../pages/my-contests/my-contests';
import { NewRankPage } from '../pages/new-rank/new-rank';
import { PurchaseSuccessPage } from '../pages/purchase-success/purchase-success';
import { QuestionEditorPage } from '../pages/question-editor/question-editor';
import { QuestionStatsPage } from '../pages/question-stats/question-stats';
import { QuizPage } from '../pages/quiz/quiz';
import { RunningContestsPage } from '../pages/running-contests/running-contests';
import { SearchQuestionsPage } from '../pages/search-questions/search-questions';
import { ServerPopupPage } from '../pages/server-popup/server-popup';
import { SetContestPage } from '../pages/set-contest/set-contest';
import { SetContestAdminPage } from '../pages/set-contest-admin/set-contest-admin';
import { SettingsPage } from '../pages/settings/settings';
import { SetUserPage } from '../pages/set-user/set-user';
import { SharePage } from '../pages/share/share';
import { ShareSuccessPage } from '../pages/share-success/share-success';
import { SystemToolsPage } from '../pages/system-tools/system-tools';

//Providers
//TODO: import { MyErrorHandler } from '../providers/exceptions';
import { Client } from '../providers/client'

import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

@NgModule({
  declarations: [
      TopTeamerApp,
      ContestChartComponent,
      ContestListComponent,
      ContestParticipantsPage,
      DatePickerComponent,
      LeadersComponent,
      LoadingModalComponent,
      PlayerInfoComponent,
      SimpleTabComponent,
      SimpleTabsComponent,
      ContestPage,
      ContestParticipantsPage,
      ContestTypePage,
      LeaderboardsPage,
      LoginPage,
      MainTabsPage,
      MyContestsPage,
      NewRankPage,
      PurchaseSuccessPage,
      QuestionEditorPage,
      QuestionStatsPage,
      QuizPage,
      RunningContestsPage,
      SearchQuestionsPage,
      ServerPopupPage,
      SetContestPage,
      SetContestAdminPage,
      SettingsPage,
      SetUserPage,
      SharePage,
      ShareSuccessPage,
      SystemToolsPage
    ],
  imports: [
      HttpModule,
      Client,
      ReactiveFormsModule,
      BrowserModule,
      IonicModule.forRoot(TopTeamerApp)
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    TopTeamerApp,
      ContestChartComponent,
      ContestListComponent,
      ContestParticipantsPage,
      DatePickerComponent,
      LeadersComponent,
      LoadingModalComponent,
      PlayerInfoComponent,
      SimpleTabComponent,
      SimpleTabsComponent,
      ContestPage,
      ContestTypePage,
      LeaderboardsPage,
      LoginPage,
      MainTabsPage,
      MyContestsPage,
      NewRankPage,
      PurchaseSuccessPage,
      QuestionEditorPage,
      QuestionStatsPage,
      QuizPage,
      RunningContestsPage,
      SearchQuestionsPage,
      ServerPopupPage,
      SetContestPage,
      SetContestAdminPage,
      SettingsPage,
      SetUserPage,
      SharePage,
      ShareSuccessPage,
      SystemToolsPage
  ],
  providers: [
      AppVersion,
      StatusBar,
      SplashScreen,
    { provide: ErrorHandler, useClass: IonicErrorHandler }
  ]
})
export class AppModule {}
