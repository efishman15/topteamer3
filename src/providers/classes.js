var contest_1 = require('../pages/contest/contest');
var contest_participants_1 = require('../pages/contest-participants/contest-participants');
var contest_type_1 = require('../pages/contest-type/contest-type');
var share_success_1 = require('../pages/share-success/share-success');
var leaderboards_1 = require('../pages/leaderboards/leaderboards');
var login_1 = require('../pages/login/login');
var main_tabs_1 = require('../pages/main-tabs/main-tabs');
var my_contests_1 = require('../pages/my-contests/my-contests');
var new_rank_1 = require('../pages/new-rank/new-rank');
var purchase_success_1 = require('../pages/purchase-success/purchase-success');
var question_editor_1 = require('../pages/question-editor/question-editor');
var question_stats_1 = require('../pages/question-stats/question-stats');
var quiz_1 = require('../pages/quiz/quiz');
var running_contests_1 = require('../pages/running-contests/running-contests');
var search_questions_1 = require('../pages/search-questions/search-questions');
var server_popup_1 = require('../pages/server-popup/server-popup');
var set_contest_1 = require('../pages/set-contest/set-contest');
var set_contest_admin_1 = require('../pages/set-contest-admin/set-contest-admin');
var set_user_1 = require('../pages/set-user/set-user');
var settings_1 = require('../pages/settings/settings');
var share_1 = require('../pages/share/share');
var system_tools_1 = require('../pages/system-tools/system-tools');
var appClasses = {
    'ContestPage': contest_1.ContestPage,
    'ContestParticipantsPage': contest_participants_1.ContestParticipantsPage,
    'ContestTypePage': contest_type_1.ContestTypePage,
    'ShareSuccessPage': share_success_1.ShareSuccessPage,
    'LeaderboardsPage': leaderboards_1.LeaderboardsPage,
    'LoginPage': login_1.LoginPage,
    'MainTabsPage': main_tabs_1.MainTabsPage,
    'MyContestsPage': my_contests_1.MyContestsPage,
    'NewRankPage': new_rank_1.NewRankPage,
    'PurchaseSuccessPage': purchase_success_1.PurchaseSuccessPage,
    'QuestionEditorPage': question_editor_1.QuestionEditorPage,
    'QuestionStatsPage': question_stats_1.QuestionStatsPage,
    'QuizPage': quiz_1.QuizPage,
    'RunningContestsPage': running_contests_1.RunningContestsPage,
    'SearchQuestionsPage': search_questions_1.SearchQuestionsPage,
    'ServerPopupPage': server_popup_1.ServerPopupPage,
    'SetContestPage': set_contest_1.SetContestPage,
    'SetContestAdminPage': set_contest_admin_1.SetContestAdminPage,
    'SetUserPage': set_user_1.SetUserPage,
    'SettingsPage': settings_1.SettingsPage,
    'SharePage': share_1.SharePage,
    'SystemToolsPage': system_tools_1.SystemToolsPage
};
//------------------------------------------------------
//-- get
//------------------------------------------------------
exports.get = function (className) {
    return appClasses[className];
};
//# sourceMappingURL=classes.js.map