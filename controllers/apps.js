var Promise = require('yaku');
var suitesDB = require('../config/db').suites;
var permenentCodesDB = require('../config/db').permenentCodes;
var APICorp = require('wechat-corp-service');

exports.getApps = function(req, res, next){
  var suitesDB = require('../config/db').suites;
  suitesDB.find({}, function(err, docs) {
    if(err) { return next(err) }
    res.render('apps', { suites: docs, timestamp: new Date().getTime()})
  });
};

exports.auth = function(req, res){
  console.log(req.originalUrl);
  var suitePath = req.originalUrl.replace(/^\/+apps\//, '');
  suitePath = suitePath.replace(/\?.+/, '');
  if(!suitePath) {
    return res.redirect('/');
  }
  var apiCrop;
  var authCode = req.query.auth_code;
  var state = req.query.state;
  var expiresIn = req.query.expires_in;
  var theSuite;
  /**
   * 1. 根据 suitePath 拿到 suiteTicket;
   * 2. new APICorp(suiteid,suite_secret,suite_ticket).getPreAuthCode 拿到预授权码;
   * 3. 生成授权URL；
   * 4. 渲染页面；
   */
  var getSuite = new Promise(function(resolve, reject) {
    suitesDB.findOne({path:suitePath}, function(err, suite){
      if(err) {return reject(err)}
      if(!suite) {
        return reject('没有该套件');
      }
      if(suite && !suite.suiteTicket) {
        return reject('没有suiteTicket');
      }
      theSuite = suite;
      resolve(suite);
    })
  });

  var getAuthUrl = function(suite) {
    /**
     * Don\'t save token in memory, when cluster or multi-computer!
     * !!! 注意这里cluster 模式应该存储下 suite_access_token 不能存在内存中
     * !!! 现在用户少，就先不处理了。 具体可见 wechat-corp-service api_common.js
     */
    apiCrop = new APICorp(suite.suiteId, suite.suiteSecret, suite.suiteTicket);
    var appIds = [];
    for(var i = 0; i < suite.apps.length; i++) {
      appIds.push(suite.apps[i]);
    }
    return new Promise(function(resolve, reject){
      apiCrop.getPreAuthCode(appIds, function(err, result){
        if(err) {return reject(err)}
        var redirectUrl = process.env.DOMAIN + '/apps/' + suite.path;
        var authUrl = apiCrop.generateAuthUrl(result.pre_auth_code, encodeURIComponent(redirectUrl), 'OK');
        resolve(authUrl);
      })
    });
  };
  var renderPage = function(authUrl){
      var authSuccess = false;
      // 授权成功
      if(authCode && state === 'OK'){
        authSuccess = true;
        apiCrop.getPermanentCode(authCode, function(err, result){
            if(err) { console.warn(err);return;}
            var corpId= result.auth_corp_info.corpid;
            var permanentCode = result.permanent_code;
            var authedSuite = {
              corpId: corpId,
              suite: suitePath,
              permanentCode:permanentCode,
              info: result
            };
            permenentCodesDB.find({
              corpId: corpId,
              suite: suitePath
            }, function(err, docs) {
              if(err) {console.warn(err); return;}
              if(!docs.length) {
                permenentCodesDB.insert(authedSuite, function(err, result){
                  if(err) {return reject(err);}
                  console.log('已存储永久授权码');
                })
              }
              permenentCodesDB.update({
                corpId: corpId,
                suite: suitePath
              }, {$set: {
                permanentCode: permanentCode,
                info: result
              }});
            })
        })
      }
      res.render('one_app', { authUrl: authUrl, authSuccess: authSuccess, suite: theSuite })
  };
  getSuite.then(getAuthUrl).then(renderPage).catch(function(err){
    res.status(422).json({
      msg: err
    })
  })
};
