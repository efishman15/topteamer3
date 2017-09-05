import {ContestPage} from '../pages/contest/contest';
import {ContestParticipantsPage} from '../pages/contest-participants/contest-participants';
import {ContestTypePage} from '../pages/contest-type/contest-type';
import {ShareSuccessPage} from '../pages/share-success/share-success';
import {LeaderboardsPage} from '../pages/leaderboards/leaderboards';
import {LoginPage} from '../pages/login/login';
import {MainTabsPage} from '../pages/main-tabs/main-tabs';
import {MyContestsPage} from '../pages/my-contests/my-contests';
import {NewRankPage} from '../pages/new-rank/new-rank';
import {PurchaseSuccessPage} from '../pages/purchase-success/purchase-success';
import {QuestionEditorPage} from '../pages/question-editor/question-editor';
import {QuestionStatsPage} from '../pages/question-stats/question-stats';
import {QuizPage} from '../pages/quiz/quiz';
import {RunningContestsPage} from '../pages/running-contests/running-contests';
import {SearchQuestionsPage} from '../pages/search-questions/search-questions';
import {ServerPopupPage} from '../pages/server-popup/server-popup';
import {SetContestPage} from '../pages/set-contest/set-contest';
import {SetContestAdminPage} from '../pages/set-contest-admin/set-contest-admin';
import {SetUserPage} from '../pages/set-user/set-user';
import {SettingsPage} from '../pages/settings/settings';
import {SharePage} from '../pages/share/share';
import {SystemToolsPage} from '../pages/system-tools/system-tools';

let appClasses = {
  'ContestPage': <any>ContestPage,
  'ContestParticipantsPage': <any>ContestParticipantsPage,
  'ContestTypePage': <any>ContestTypePage,
  'ShareSuccessPage': <any>ShareSuccessPage,
  'LeaderboardsPage': <any>LeaderboardsPage,
  'LoginPage': <any>LoginPage,
  'MainTabsPage': <any>MainTabsPage,
  'MyContestsPage': <any>MyContestsPage,
  'NewRankPage': <any>NewRankPage,
  'PurchaseSuccessPage': <any>PurchaseSuccessPage,
  'QuestionEditorPage': <any>QuestionEditorPage,
  'QuestionStatsPage': <any>QuestionStatsPage,
  'QuizPage': <any>QuizPage,
  'RunningContestsPage': <any>RunningContestsPage,
  'SearchQuestionsPage': <any>SearchQuestionsPage,
  'ServerPopupPage': <any>ServerPopupPage,
  'SetContestPage': <any>SetContestPage,
  'SetContestAdminPage': <any>SetContestAdminPage,
  'SetUserPage': <any>SetUserPage,
  'SettingsPage': <any>SettingsPage,
  'SharePage': <any>SharePage,
  'SystemToolsPage': <any>SystemToolsPage
};

//------------------------------------------------------
//-- get
//------------------------------------------------------
export let get = (className:string) => {
  return appClasses[className];
}

