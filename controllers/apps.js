const Promise = require('yaku');
const suitesDB = require('../config/db').suites;
const permenentCodesDB = require('../config/db').permenentCodes;
const APICorp = require('wechat-corp-service');

exports.getApps = function(req, res, next){
  const suitesDB = require('../config/db').suites;
  suitesDB.find({}, function(err, docs) {
    if(err) { return next(err) }
    res.render('apps', { suites: docs, timestamp: new Date().getTime()})
  });
};

exports.auth = function(req, res){
  console.log(req.originalUrl);
  const suitePath = req.originalUrl.replace(/^\/+apps\//, '');
  suitePath = suitePath.replace(/\?.+/, '');
  if(!suitePath) {
    return res.redirect('/');
  }
  const apiCrop;
  const authCode = req.query.auth_code;
  const state = req.query.state;
  const expiresIn = req.query.expires_in;
  const theSuite;
  /**
   * 1. 根据 suitePath 拿到 suiteTicket;
   * 2. new APICorp(suiteid,suite_secret,suite_ticket).getPreAuthCode 拿到预授权码;
   * 3. 生成授权URL；
   * 4. 渲染页面；
   */
  const getSuite = new Promise(function(resolve, reject) {
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

  const getAuthUrl = function(suite) {
    /**
     * Don\'t save token in memory, when cluster or multi-computer!
     * !!! 注意这里cluster 模式应该存储下 suite_access_token 不能存在内存中
     * !!! 现在用户少，就先不处理了。 具体可见 wechat-corp-service api_common.js
     */
    apiCrop = new APICorp(suite.suiteId, suite.suiteSecret, suite.suiteTicket);
    const appIds = [];
    for(const i = 0; i < suite.apps.length; i++) {
      appIds.push(suite.apps[i]);
    }
    return new Promise(function(resolve, reject){
      apiCrop.getPreAuthCode(appIds, function(err, result){
        if(err) {return reject(err)}
        const redirectUrl = process.env.DOMAIN + '/apps/' + suite.path;
        const authUrl = apiCrop.generateAuthUrl(result.pre_auth_code, encodeURIComponent(redirectUrl), 'OK');
        resolve(authUrl);
      })
    });
  };
  const renderPage = function(authUrl){
      const authSuccess = false;
      // 授权成功
      if(authCode && state === 'OK'){
        authSuccess = true;
        apiCrop.getPermanentCode(authCode, function(err, result){
            if(err) { console.warn(err);return;}
            const corpId= result.auth_corp_info.corpid;
            const permanentCode = result.permanent_code;
            const authedSuite = {
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
