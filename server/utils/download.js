var path = require('path');
var exceptions = require(path.resolve(__dirname,'./exceptions'));

//--------------------------------------------------------------------------
// download
//
// data: <NA>
//--------------------------------------------------------------------------
module.exports.download = function (req, res, next) {

  var platform = req.params.platform;
  if (!platform || platform === undefined) {
    platform = 'android';
  }
  else if (platform !== 'android') {
    res.send(403,'supported platforms are: android');
    return;
  }

  var version = req.params.version;
  if (!version || version === undefined) {
    version = '';
  }
  else if (version !== 'armv7' && version !== 'x86') {
    res.send(403,'supported versions are: armv7, x86 or do not specify version for the standard version');
    return;
  }

  var downloadDir = '../../build/' + platform + '/apks/release/';
  var fileNameFriendlyName = 'topteamer';
  var fileName = downloadDir + 'topteamer';
  if (version) {
    fileNameFriendlyName += '-' + version;
    fileName += '-' + version;
  }
  fileName += '-release.apk';
  fileNameFriendlyName += '.apk';

  var downloadFile = path.resolve(__dirname,fileName);

  res.download(downloadFile, fileNameFriendlyName);

}
