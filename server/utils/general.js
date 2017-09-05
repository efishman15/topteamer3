var path = require('path');
var mathjs = require('mathjs');
var httpUtils = require(path.resolve(__dirname, './http'));
var util = require('util');
var async = require('async');
var get_ip = require('ipware')().get_ip;
var logger = require(path.resolve(__dirname, './logger'));

//-------------------------------------------------------------------------------------------------------
// returns okResponse sent to the client
//-------------------------------------------------------------------------------------------------------
module.exports.okResponse = {'status': 0};

var settings;
var evalSettings = [];

module.exports.injectSettings = function (dbSettings) {

  settings = dbSettings;

  var regularExpression = new RegExp(/\$settings\{(.*?)\}/);
  var regularExpressionGlobal = new RegExp(/\$settings\{(.*?)\}/g);
  identifySettingsVariables(settings, regularExpressionGlobal);

  while (evalSettings.length > 0) {

    while (evalSettings[evalSettings.length - 1].vars.length > 0) {
      var currentVariable = evalSettings[evalSettings.length - 1].vars[0];
      var evalExpression = 'settings.' + currentVariable.substring(10,currentVariable.length - 1);
      var currentValue = eval(evalExpression);
      if (typeof currentValue !== 'string' || !regularExpression.exec(currentValue)) {
        //final replace
        evalSettings[evalSettings.length - 1].object[evalSettings[evalSettings.length - 1].property] = evalSettings[evalSettings.length - 1].object[evalSettings[evalSettings.length - 1].property].replace(regularExpression, currentValue);
        evalSettings[evalSettings.length - 1].vars.shift(); //Removes the first item
      }
      else {
        break;
      }
    }

    if (evalSettings[evalSettings.length - 1].vars.length === 0) {
      //All variables replaced
      evalSettings.pop();
    }
    else {
      //Still variables left - move this last item to the "end of the queue" (first)
      evalSettings.unshift(evalSettings.pop());
    }
  }

  //Init the mail logger that sends mail on server severe (error,fatal) errors
  logger.initMail(settings.server.general.mailgun);

  module.exports.settings = settings;

}

//-------------------------------------------------------------------------------
// Private functions
//-------------------------------------------------------------------------------

//-----------------------------------------------------------------------------------------------------------------------------------------
// identifySettingsVariables
//
// Iterates recursively through all the currentObject (root=settings) and prepares an array to replace them
// data: geoLocator (0,1,...), ip
//-----------------------------------------------------------------------------------------------------------------------------------------
function identifySettingsVariables(currentObject, regularExpression) {
  for (var property in currentObject) {
    if (currentObject.hasOwnProperty(property)) {
      if (typeof currentObject[property] === 'object') {
        identifySettingsVariables(currentObject[property], regularExpression);
      }
      else if (typeof currentObject[property] === 'string') {
        var vars = currentObject[property].match(regularExpression);
        if (vars) {
          evalSettings.push({object: currentObject, property: property, vars: vars});
        }
      }
    }
  }
}

//---------------------------------------------------------------------------------------------------
// getGeoInfo
//
// Retrieves geoInfo based on client ip
// data: geoLocator (0,1,...), ip
//---------------------------------------------------------------------------------------------------
function getGeoInfo(data, callback) {

  if (data.geoLocator == null) {
    data.geoLocator = 0;
  }

  var options = {
    'url': util.format(settings.server.geoIpLocators[data.geoLocator].url, data.ip),
    'timeout': settings.server.geoIpLocators[data.geoLocator].timeout
  };

  httpUtils.get(options, function (err, result) {
    if (err) {
      if (data.geoLocator < settings.server.geoIpLocators.length - 1) {
        data.geoLocator++;
        getGeoInfo(data, callback);
      }
      else {
        data.clientResponse.language = data.defaultLanguage;
        callback(null, data);
      }
      return;
    }

    var countryCode = result[settings.server.geoIpLocators[data.geoLocator].countryCodeField[0]];
    for (var i = 1; i < settings.server.geoIpLocators[data.geoLocator].countryCodeField.length; i++) {
      countryCode = countryCode[settings.server.geoIpLocators[data.geoLocator].countryCodeField[i]];
    }

    var language = getLanguageByCountryCode(countryCode);

    data.clientResponse.geoInfo = result;
    data.clientResponse.language = language;

    callback(null, data);

  });
}

//-------------------------------------------------------------------------------
// binaryRangeSearch - searches a number within a range array
//-------------------------------------------------------------------------------
function binaryRangeSearch(arr, searchProperty, number) {

  if (arr.length == 1) {
    return arr[0][resultProperty];
  }

  var left = 0;
  var right = arr.length - 1;

  var middle;
  while (left < right) {
    middle = mathjs.floor(left + (right - left) / 2);
    if (number <= arr[middle][searchProperty]) {
      right = middle;
    }
    else {
      left = middle + 1;
    }
  }

  return arr[left];
}

//-----------------------------------------------------------------------
// getDirectionByLanguage
//
// returns the direction (ltr/rtl) based on language
//-----------------------------------------------------------------------
module.exports.getDirectionByLanguage = getDirectionByLanguage;
function getDirectionByLanguage(languageCodeIso2) {

  var direction = settings.server.directionByLanguage[languageCodeIso2];

  if (direction) {
    return direction;
  }
  else {
    return settings.server.directionByLanguage['default'];
  }
}

//-----------------------------------------------------------------------
// getLanguageByCountryCode
//
// returns the default language based on country ISO2 code
//-----------------------------------------------------------------------
module.exports.getLanguageByCountryCode = getLanguageByCountryCode;
function getLanguageByCountryCode(countryCode) {

  var language = settings.server.languageByCountryCode[countryCode];

  if (language) {
    return language;
  }
  else {
    return settings.server.languageByCountryCode['default'];
  }
}

//-------------------------------------------------------------------------------------------------------------------------
// getSettings (client request)
//
// data: settingsVersion, language (optional), defaultLanguage (optional) platform (optional), platformVersion (optional), appVersion (optional)
//
// returns general server settings for each client.
// Optionally return a serverPopup to request to upgrade
//-------------------------------------------------------------------------------------------------------------------------
module.exports.getSettings = function (req, res, next) {

  var data = req.body;

  data.clientResponse = {};

  var operations = [

    //Check to invoke geoInfo
    function (callback) {
      if (!data.language) {
        var ipInfo = get_ip(req);
        if (ipInfo && ipInfo.clientIp) {
          data.geoLocator = 0;
          if (ipInfo.clientIp.indexOf('::') === 0) {
            data.ip = ipInfo.clientIp.slice(7);
          }
          else {
            data.ip = ipInfo.clientIp;
          }
          getGeoInfo(data, callback);
        }
        else {
          data.clientResponse.language = data.defaultLanguage;
          callback(null, data);
        }
      }
      else {
        callback(null, data);
      }
    },

    //The setttings for the client
    function (data, callback) {

      //Sends the client settings only if server has a newer version
      if (!data.settingsVersion || data.settingsVersion < settings.client.version) {
        data.clientResponse.settings = settings.client;
      }
      callback(null, data);
    }
  ];

  async.waterfall(operations, function (err, data) {
    if (!err) {
      res.json(data.clientResponse);
    }
    else {
      res.send(err.httpStatus, err);
    }
  })
}

//-----------------------------------------------------------------------
// checkAppVersion
//
// returns a serverPopup object to be concatenated to any server result
//-----------------------------------------------------------------------
module.exports.checkAppVersion = checkAppVersion;
function checkAppVersion(clientInfo, language) {

  if (!clientInfo || !clientInfo.appVersion) {
    return null;
  }

  if (versionCompare(settings.server.versions.mustUpdate.minVersion, clientInfo.appVersion) === 1) {
    return settings.server.versions.mustUpdate.popup[language];
  }
}

//-----------------------------------------------------------------------
// translate
//
// returns a translation term object to be concatenated to any server result
//-----------------------------------------------------------------------
module.exports.translate = translate;
function translate(language, key, params) {

  var translatedValue = settings.client.ui[language][key];
  if (translatedValue && params) {
    translatedValue = translatedValue.format(params);
  }

  return translatedValue;
}

//---------------------------------------------------------------------------------------------------
// XpProgress class
//
// Constructs the xp in a relational manner to be presented in a progress element
// addXP function:
// object can be either a session or a user - both should contain xp and rank as properties
//---------------------------------------------------------------------------------------------------
module.exports.XpProgress = XpProgress;
function XpProgress(xp, rank) {
  this.addition = 0;
  this.xp = xp;
  this.rank = rank;
  this.refresh();
}

XpProgress.prototype.addXp = function (object, action) {
  var xp = settings.server.xpCredits[action];
  if (xp) {

    object.xp += xp;
    var result = binaryRangeSearch(settings.server.rankByXp, 'xp', object.xp);

    //update object (session, user)
    object.rank = result.rank;


    //update my progress
    this.addition += xp;
    this.xp += xp;

    if (result.rank > this.rank) {
      this.rankChanged = true;
      if (result.unlockFeature && result.unlockFeatureMessage) {
        this.unlockFeatureMessage = result.unlockFeatureMessage;
      }
      this.rank = result.rank
    }
    else {
      this.rankChanged = false;
    }

    this.refresh();

  }
};

XpProgress.prototype.refresh = function () {
  var xpForRank;
  if (this.rank - 2 >= 0) {
    xpForRank = settings.server.rankByXp[this.rank - 2].xp;
  }
  else {
    xpForRank = 0;
  }

  var xpForNextRank = settings.server.rankByXp[this.rank - 1].xp;
  var xpAchievedInRank = this.xp - xpForRank;
  var xpDiff = xpForNextRank - xpForRank;

  this.current = xpAchievedInRank;
  this.max = xpDiff;
};

//---------------------------------------------------------------------------------------------------
// versionCompare
//
// compares 2 software versions.
// returns:
// 1  if v1>v2
// -1 if v1<v2
// 0  if v1=v2
//---------------------------------------------------------------------------------------------------
module.exports.versionCompare = versionCompare;
function versionCompare(v1, v2, options) {
  var lexicographical = options && options.lexicographical,
    zeroExtend = options && options.zeroExtend,
    v1parts = v1.split('.'),
    v2parts = v2.split('.');

  function isValidPart(x) {
    return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
  }

  if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
    return NaN;
  }

  if (zeroExtend) {
    while (v1parts.length < v2parts.length) v1parts.push('0');
    while (v2parts.length < v1parts.length) v2parts.push('0');
  }

  if (!lexicographical) {
    v1parts = v1parts.map(Number);
    v2parts = v2parts.map(Number);
  }

  for (var i = 0; i < v1parts.length; ++i) {
    if (v2parts.length == i) {
      return 1;
    }

    if (v1parts[i] == v2parts[i]) {
      continue;
    }
    else if (v1parts[i] > v2parts[i]) {
      return 1;
    }
    else {
      return -1;
    }
  }

  if (v1parts.length != v2parts.length) {
    return -1;
  }

  return 0;
}

//---------------------------------------------------------------------------------------------------
// add 'contains' function to an array to check if an item exists in an array
//---------------------------------------------------------------------------------------------------
Array.prototype.contains = function (obj) {
  var i = this.length;
  while (i--) {
    if (this[i] === obj) {
      return true;
    }
  }
  return false;
};

//---------------------------------------------------------------------------------------------------
// add 'replaceAll' function to string using RegExp
//---------------------------------------------------------------------------------------------------
String.prototype.replaceAll = function (search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, 'g'), replacement);
};

//---------------------------------------------------------------------------------------------------
// add 'format' function to replace variables
//---------------------------------------------------------------------------------------------------
String.prototype.format = function () {
  var args = arguments;
  var str = this;

  function replaceByObjectProperies(obj) {
    for (var property in obj)
      if (obj.hasOwnProperty(property))
      //replace all instances case-insensitive
        str = str.replace(new RegExp(escapeRegExp('{{' + property + '}}'), 'gi'), String(obj[property]));
  }

  function escapeRegExp(string) {
    return string.replace(/([.*+?^=!:${{}}()|\[\]\/\\])/g, '\\$1');
  }

  function replaceByArray(arrayLike) {
    for (var i = 0, len = arrayLike.length; i < len; i++)
      str = str.replace(new RegExp(escapeRegExp('{{' + i + '}}'), 'gi'), String(arrayLike[i]));
  }

  if (!arguments.length || arguments[0] === null || arguments[0] === undefined)
    return str;
  else if (arguments.length == 1 && Array.isArray(arguments[0]))
    replaceByArray(arguments[0]);
  else if (arguments.length == 1 && typeof arguments[0] === 'object')
    replaceByObjectProperies(arguments[0]);
  else
    replaceByArray(arguments);

  return str;
}

//-------------------------------------------------------------------------------------------------------
// getWeekYear returns a string of current year and current week (e.g. 201541 - means year 2015 week 41
//-------------------------------------------------------------------------------------------------------
module.exports.getYearWeek = function () {

  var d = new Date();
  var thisYear = d.getFullYear();
  var startOfYear = new Date(thisYear, 0, 1);
  var week = Math.ceil((((d - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);
  return '' + thisYear + '' + week;
};

//-------------------------------------------------------------------------------------------------------
// Receives and array of strings and converts it to object
// in which each item is a property in the new object having the specified object value
//-------------------------------------------------------------------------------------------------------
module.exports.arrayToObject = function (array, objectValue) {

  var newObject = {};
  array.forEach(function (element, index, array) {
    newObject[element] = objectValue;
  });

  return newObject;
};

//-------------------------------------------------------------------------------------------------------------------------
// logClientError
//
// data: clientInfo (object), error (string)
//-------------------------------------------------------------------------------------------------------------------------
module.exports.logClientError = function (req, res, next) {

  var data = req.body;
  data.userAgent = req.headers['user-agent'];

  logger.client.fatal(data, null);

  res.json(this.okResponse);

}
