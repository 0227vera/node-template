var express = require('express');
// 处理post请求数据
var bodyParser = require('body-parser');
// 日志管理
var logger = require('morgan');
// 错误处理函数，文档上面说仅限于开发环境，至于为什么之前的大佬们没在正式环境上面做一次区分我也不知道
var errorHandler = require('errorhandler');
var path = require('path');
var expressValidator = require('express-validator');
// 防止请求中出现XSS攻击
var xss = require('xss');
// 上传存储处理 注意处理 nginx 上传 1M 限制
var multer = require('multer');
// 加密处理
var crypto = require('crypto');
// 这个地方也可以使用path来获取后缀名的
var mime = require('mime');
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/')
  },
  filename: function (req, file, cb) {
    crypto.pseudoRandomBytes(16, function (err, raw){
      cb(null, raw.toString('hex') + Date.now() + '.' + mime.extension(file.mimetype))
    })
  }
});
var uploads = multer({storage: storage});
// 加载各种秘钥信息
var dotenv = require('dotenv');
dotenv.load({ path: '.env' });


// 控制器
var appsController = require('./controllers/apps');
var proxyController = require('./controllers/proxy');

var app = express();
app.set('port', process.env.PORT || 3000);
// 指定模版引擎
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
// 处理post请求的数据
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true,
  limit: '1000000kb'
}));

// 数据请求的验证，但是也不知道目前的验证规则是什么
app.use(expressValidator());

// 在服务端对请求的地址做一次过滤，如果存在可能有威胁的地址，先转义一次
app.use('/',(req, res, next) => {
  if (req.url !== xss(req.url)) {
    req.url = xss(req.url)
  }
  next()
})

// 对public下面的文件不做缓存
app.use(express.static(path.join(__dirname, 'public'), {
  'maxAge': '1d',
  'setHeaders': function(res, path){
    if (express.static.mime.lookup(path) === 'text/html') {
      res.setHeader('Cache-Control', 'no-store')
    }
  }
}));

app.use('/uploads',express.static(path.join(__dirname, 'uploads'), {maxAge: 31557600000}));

app.get('/', appsController.getApps);

app.get('/apps/*', appsController.auth);
// 转发代理
app.use('/', proxyController.forward);
app.use(errorHandler());

app.listen(app.get('port'), function() {
  console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
});

module.exports = app;
