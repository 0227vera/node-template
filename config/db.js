/**
 * 数据存储，这里用的是 nedb（嵌入式数据库）
 * 可参考 github repo: https://github.com/louischatriot/nedb
 * 或 http://www.alloyteam.com/2016/03/node-embedded-database-nedb/
 */
var Datastore = require('nedb');

// 存储套件信息
exports.suites = new Datastore({
  filename: './db/suites.db',
  autoload: true
});


exports.permenentCodes = new Datastore({
  filename: './db/permanent_code.db',
  autoload: true
});


exports.accessTokens = new Datastore({
  filename: './db/access_token.db',
  autoload: true
});
