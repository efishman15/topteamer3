import { DocumentDirection } from 'ionic-angular/platform/platform';

export class BasicListSettings {
    refreshFrequencyInMilliseconds: number;
}

export class LeaderboardListSettings {
    friends: BasicListSettings;
    weekly: BasicListSettings;
    contest: BasicListSettings;
}

export class ListSettings {
    contests: BasicListSettings;
    leaderboards: LeaderboardListSettings;
}

export class Settings {
    general: GeneralSettings;
    facebook: FacebookSettings;
    quiz: QuizSettings;
    charts: ChartsSettings;
    platforms: Array<Object>;
    xpControl: XpControl;
    google: GoogleSettings;
    languages: Array<Language>;
    ui: Array<Array<Object>>;
    newContest: NewContestSettings;
    lists: ListSettings;
    share: ShareSettings;
    contest: ContestSettings;
    branch: BranchSettings;
    admin: AdminSettings;
    analytics: AnalyticsSettings;
}

export class GeneralInputsSettings {
    name: FormInputSettings;
}

export class AnalyticsSettings {
    track: AnalyticsTrackSettings;
    mixpanel: MixpanelAnalyticsSettings;
}

export class AnalyticsTrackSettings {
    events: boolean;
    errors: boolean;
}

export class MixpanelAnalyticsSettings {
    token: string;
}

export class AdminSettings {
    commands: Array<AdminCommand>;
}

export class AdminCommand {
    id: string;
    text: string;
    action: string;
    type: string;
    confirm: string;
    returnValue: string;
}

export class BranchSettings {
    key: string;
}

export class ContestSettings {
    refreshTresholdInMilliseconds: number;
    maxTeamsLengthForLargeFonts: number;
}

export class ShareSettings {
    web: ShareWebSettings;
    mobile: ShareMobileSettings;
    iconSize: Size;
}

export class ShareWebSettings {
    networks: Array<Array<ShareWebNetwork>>;
}

export class ShareWebNetwork {
    name: string;
    url: string;
    image: string;
}

export class ShareMobileSettings {
    discoverApps: Array<ClientShareDiscoverApp>;
    extraApps: Array<ClientShareApp>;
    maxsApps: number;
}

export class NewContestSettings {
    privateQuestions: NewContestPrivateQuestionsSettings;
    contestTypes: any;
    endOptions: any;
    selectableContestTypes: Array<Array<string>>;
    inputs: NewContestInputSettings;
}

export class NewContestInputSettings {
    team: FormInputSettings;
    subject: FormInputSettings;
}

export class FormInputSettings {
    maxLength: number;
}

export class NewContestPrivateQuestionsSettings {
    min: number;
    max: number;
}

export class GoogleSettings {
    gcm: GoogleGcmSettings;
}

export class GoogleGcmSettings {
    senderID: string;
    sound: boolean;
    vibrate: boolean;
}

export class XpControl {
    radius: number;
    fillColor: string;
    lineWidth: number;
    fullLineColor: string;
    progressLineColor: string;
    textColor: string;
    font: XpControlFont;
}

export class XpControlFont {
    name: string;
    bold: boolean;
    d1: string;
    d2: string;
    d3: string;
}

export class GeneralSettings {
    webCanvasWidth: number;
    facebookFanPage: string;
    postErrors: boolean;
    network: GeneralNetworkSettings;
    avatarTemplate: string;
    allowGuest: boolean;
    avatars: Array<string>;
    inputs: GeneralInputsSettings;
}

export class GeneralNetworkSettings {
    retries: number;
    initialDelay: number;
}

export class FacebookSettings {
    friendsPermissions: Array<string>;
    appId: string;
    version: string;
    sdk: string;
    avatarTemplate: string;
}

export class QuizSettings {
    canvas: QuizCanvasSettings;
    question: QuizQuestionSettings;
    questions: QuizQuestionsSettings;
    finish: FinishQuizSettings;
}

export class FinishQuizSettings {
    animateResultsTimeout: number;
    animateResultsExitTimeout: number;
    exitAnimation: string;
}

export class QuizQuestionsSettings {
    score: Array<number>;
}

export class QuizCanvasSettings {
    font: QuizCanvasFontsSettings;
    scores: QuizCanvasScoresSettings;
    circle: QuizCanvasCircleSettings;
    size: QuizCanvasSizeSettings;
    line: QuizCanvasLineSettings;
}

export class QuizCanvasFontsSettings {
    scores: QuizCanvasFontSettings;
    signs: QuizCanvasFontSettings;
}

export class QuizCanvasFontSettings {
    bold: boolean;
    size: string; //e.g 20px
    name: string;
}

export class QuizCanvasSizeSettings {
    height: number;
    topOffset: number;
    widthRatio: number;
}

export class QuizCanvasScoresSettings {
    size: QuizCanvasScoresSizeSettings;
    colors: QuizCanvasScoresColorsSettings;
}

export class QuizCanvasScoresSizeSettings {
    top: number;
}

export class QuizCanvasScoresColorsSettings {
    default: string;
    correct: string;
}

export class QuizCanvasCircleSettings {
    radius: QuizCanvasCircleRadiusSettings;
    states: QuizCanvasCircleStatesSettings;
}

export class QuizCanvasCircleRadiusSettings {
    min: number;
    max: number;
    spaceRatio: number;
    outerBorderRatio: number;
}

export class QuizCanvasCircleStateSettings {
    innerColor: string;
    outerColor: string;
    text: string;
    textFillStyle: string;
}

export class QuizCanvasLineSettings {
    color: string;
    width: number;
}

export class QuizCanvasCircleStatesSettings {
    previous: QuizCanvasCircleStatePreviousSettings;
    current: QuizCanvasCircleStateCurrentSettings;
    next: QuizCanvasCircleStateSettings;
}

export class QuizCanvasCircleStatePreviousSettings {
    correct: QuizCanvasCircleStateSettings;
    incorrect: QuizCanvasCircleStateSettings;
}

export class QuizCanvasCircleStateCurrentSettings {
    stats: QuizCanvasCircleStateSettings;
    noStats: QuizCanvasCircleStateSettings;
}

export class QuizQuestionSettings {
    maxLength: number;
    answer: QuizQuestionAnswerSettings;
    wrongAnswerMillisecondsDelay: number;
}

export class QuizQuestionAnswerSettings {
    maxLength: number;
}

export class ChartsSettings {
    contest: ContestChartSettings;
    questionStats: QuestionStatsChartSettings;
}

export class Size {
    width: number;
    height: number;
}

export class ChartSizeSettings extends Size {
    widthRatio: number;
    heightRatio: number;
    heightRatioFromWidth: number;
}

export class ContestChartSizeSettings extends ChartSizeSettings {
    labelsPadding: number;
    barPercentRatio;
}


export class ContestChartSettings {
    size: ContestChartSizeSettings;
}

export class QuestionStatsChartSettings {
    size: QuestionStatsChartSizeSettings;
    colors: QuestionStatsChartSettingsColors;
}

export class QuestionStatsChartSizeSettings extends ChartSizeSettings {
    radiusRatio: number;
    innerDoughnutRadiusRatio: number;
}

export class QuestionStatsChartSettingsColors {
    correct: string;
    incorrect: string;
    innerDoughnut: string;
}

export class Question {
    _id: string;
    deleted: boolean;
    checked: boolean;
    text: string;
    answers: Array<string>;

    constructor() {
        this._id = null;
        this.text = null;
        this.answers = [null, null, null, null];
    }
}

export class Questions {
    list: Array<Question>;
    visibleCount: number;

    constructor() {
        this.visibleCount = 0;
        this.list = [];
    }
}

export class User {
    clientInfo: ClientInfo;
    settings: UserSettings;
    geoInfo: Object;
    credentials: ConnectInfo;
    gcmRegistrationId: string;

    constructor(language: string, clientInfo: ClientInfo, geoInfo?: Object) {
        this.settings = new UserSettings(language, (new Date).getTimezoneOffset());
        this.clientInfo = clientInfo;

        if (geoInfo) {
            this.geoInfo = geoInfo;
        }
    }
}

export class UserSettings {
    language: string;
    timezoneOffset: number;
    sound: boolean;
    notifications: NotificationSettings;

    constructor(language: string, timezoneOffset: number) {
        this.language = language;
        this.timezoneOffset = timezoneOffset;
        this.sound = true;
        this.notifications = new NotificationSettings();
    }
}

export class NotificationSettings {
    on: boolean;
    sound: boolean;
    vibrate: boolean;
    endingContests: boolean;
    myTeamLosing: boolean;

    constructor() {
        this.on = true;
        this.sound = true;
        this.vibrate = true;
        this.endingContests = true;
        this.myTeamLosing = true;
    }

}

export class ClientInfo {
    appVersion: string;
    platform: string;
    mobile: boolean;
    device: any;
}

export class Session {
    name: string;
    rank: number;
    features: any;
    score: number;
    settings: SessionSettings;
    isAdmin: boolean;
    xpProgress: XpProgress;
    gcmRegistrationId: string;
    token: string;
    avatar: Avatar;
    dob: number;
}

export class ClientShareApp {
    name: string;
    title: string;
    image: string;

    constructor(name: string, title: string, image: string) {
        this.name = name;
        this.title = title;
        this.image = image;
    }
}

export class ClientShareDiscoverApp extends ClientShareApp {
    package: ClientShareAppPackage;
}

export class ClientShareAppPackage {
    android: ClientShareAppPlatformPackage;
    ios: ClientShareAppPlatformPackage;
}

export class ClientShareAppPlatformPackage {
    name: string;
    installed: boolean;
}

export class SessionSettings {
    sound: boolean;
    language: string;
    notifications: NotificationSettings;
}

export class Feature {
    name: string;
    lockText: string;
    unlockText: string;
    purchaseProductId: string;
    purchaseData: PurchaseData;
}

export class PurchaseData {
    productId: string;
    status: string;
    url: string;
}

export class PaymentData {
    method: string;
    data: PurchaseData;

    constructor(method: string, data: PurchaseData) {
        this.method = method;
        this.data = data;
    }
}

export class View {
    name: string;
    isRoot: boolean;
    params: Object;
}

export class Language {
    value: string;
    direction: DocumentDirection;
    align: string;
    oppositeAlign: string;
    displayNames: Object;
    wiki: string;
    oppositeDirection: string;
    localeDateOptions: LocaleDateOptions;
    locale: string;
    backButtonIcon: string;
}

export class LocaleDateOptions {
    month: string;
    day: string;
    year: string;
}

export class ContestChart {
    contest: Contest;
}

export class CalendarCell {
    dateObject: Date;
    date: number;
    month: number;
    year: number;
    day: number;
    dateString: string;
    epochLocal: number;
    epochUTC: number;
    inMonth: boolean;
    disabled: boolean;
    selected: boolean;
    today: boolean;
}

export class Contest {
    _id: string;
    name: ContestName;
    subject: string;
    startDate: number;
    endDate: number;
    status: string;
    link: string;
    myTeam: number;
    participants: number;
    systemParticipants;
    rating: number;
    teams: Array<Team>;
    type: ContestType;
    endOption: string;
    questions: Questions;
    state: string;
    owner: boolean;
    leadingTeam: number;
    time: ContestTime;
    lastUpdated: number;
    buttonText: string;

    constructor(typeId: string, startDate: number, endDate?: number, endOption?: string) {
        this.startDate = startDate;
        if (endDate == null || endDate === undefined) {
            this.endDate = this.startDate + 1 * 24 * 60 * 60 * 1000;
        }
        else {
            this.endDate = endDate;
        }

        if (endOption !== undefined && endOption != null) {
            this.endOption = endOption;
        }
        this.type = new ContestType(typeId);
        this.teams = [new Team(null), new Team(null)];
    }
}

export class ContestTimeData {
    text: string;
    color: string;
}

export class ContestTime {
    start: ContestTimeData;
    end: ContestTimeData;
}

export class ContestName {
    short: string;
    long: string;
}

export class Team {
    name: string;
    score: number;
    chartValue: number;
    chartPercent: number;
    adminScoreAddition: number;

    constructor(name: string) {
        this.name = name;
    }
}

export class ContestType {
    id: string;
    randomOrder: boolean;
    questions: Questions;
    userQuestions: Array<string>;

    constructor(typeId: string) {
        this.id = typeId;
        this.randomOrder = false;
    }
}

export class ContestTypeImage {
    url: string;
    width: number;
    height: number;
}

export class ContestTypeText {
    title: string;
    description: string;
    name: string;
    titleColor: string;
}

export class QuizResults {
    data: QuizResultsData;
    contest: Contest;
    facebookPost: FacebookPostData;
}

export class QuizResultsData {
    score: number;
    sound: string;
    clientKey: string;
    clientValues: Object;
    animation: string;
    facebookPost: FacebookPostData;
}

export class FacebookPostData {
    action: string;
    object: string;
    dialogImage: FacebookPostDialogImage;
}

export class FacebookPostDialogImage {
    url: string;
    width: number;
    height: number;
}

export class QuizData {
    currentQuestion: QuizQuestion;
    reviewMode: QuizReviewMode;
    currentQuestionIndex: number;
    totalQuestions: number;
    results: QuizResults;
    xpProgress: XpProgress;
    finished: boolean;
}

export class QuizQuestion {
    _id: string;
    text: string;
    answered: boolean;
    currentQuestionIndex: number;
    hintUsed: boolean;
    answerUsed: boolean;
    score: number;
    answers: Array<QuizAnswer>;
    doAnimation: boolean;
    correctRatio: number;
    wikipediaHint: string;
    wikipediaAnswer: string;
    hintCost: number;
    answerCost: number;

    constructor(score: number) {
        this.score = score;
    }
}

export class QuizAnswer {
    answeredCorrectly: boolean;
    text: string;
    originalIndex: number;
    correct: boolean;
}

export class QuizReviewMode {
    reason: string;
}

export class XpProgress {
    current: number;
    max: number;
    addition: number;
    rankChanged: number;
    rank: number;
}

export class ServerPopup {
    title: string;
    message: string;
    preventBack: boolean;
    image: string;
    buttons: Array<ServerPopupButton>;
}

export class ServerPopupButton {
    action: string;
    link: string;
    text: string;
}

export class ShareVariables {
    shareUrl: string;
    shareSubject: string;
    shareBody: string;
    shareBodyEmail: string;
    shareBodyNoUrl: string;
    shareImage: string;
}

export class AppPage {
    page: string;
    params: any;

    constructor(page: string, params: any) {
        this.page = page;
        this.params = params;
    }
}

export class FacebookInfo {
    accessToken: string;
    userId: string;

    constructor(accessToken: string, userId: string) {
        this.accessToken = accessToken;
        this.userId = userId;
    }
}

export class GuestInfo {
    uuid: string;

    constructor(uuid: string) {
        this.uuid = uuid;
    }
}

export class ConnectInfo {
    type: string;
    facebookInfo: FacebookInfo;
    guestInfo: GuestInfo;

    constructor(type: string) {
        this.type = type;
    }
}

export class Avatar {
    type: number;
    id: string;
}
