process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const request = require('request');
const URL = require('url');
exports.forward = function(req, res) {
  // 第一次请求时候的静态文件都是没有加token和host的的
  const apiServer = req.headers['x-api-server'];
  const jwtToken = req.headers['authorization'];
  if (!apiServer || !jwtToken) {
    const UrlObj = URL.parse(req.url, true)
    const pathname = UrlObj.pathname
    const msg = '你没有权限, 请联系管理员。<div style="margin-top: 30px;color: #999;">host: ' + req.headers.host + '<br/>url: ' + req.url + '<br/>';
    if (pathname) {
      const arr = pathname.split('/');
      if (arr.length > 1 && /3$/.test(arr[1])) {
        let proxyUrl = 'http://ci_h5.4yec.com:90'
        req.pipe(request({
          'url': proxyUrl + pathname
        })).pipe(res);
      } else {
        return res.status(422).send(msg);
      }
    } else {
      return res.status(422).send(msg);
    }
  } else {
    // 截取 token
    const token = jwtToken.replace(/Bearer\s/i, '');
    /**
     * 看传过来的 URL 地址 是否 是 http:// 或者 https:// 或//开头 统一换为 http://
     * 如果没有协议加上 http://
     * 这里如果后端服务器为 https 则会有问题
     */
    const reg = /^((http|https):)?\/\//;
    // apiServer = reg.test(apiServer) ? apiServer.replace(reg, 'http://') : 'http://' + apiServer;
    // 2018年01月26日12:33:22 处理https代理问题
    if (apiServer.indexOf('http') === -1) {
      apiServer = 'http://' + apiServer
    }
    if (/\/$/.test(apiServer)) {
      apiServer = apiServer.substring(0, apiServer.length - 1)
    }
    const url = apiServer + req.originalUrl;
    console.log('请求真实后台服务器地址是:');
    console.log(url);
    const contentType = req.headers['content-type'];
    // 如果是表单上传特殊处理
    if ((req.method === 'POST') && contentType
      && contentType.indexOf('application/x-www-form-urlencoded') !== -1) {
      request.post(
        url, {
          form: req.body,
          'auth': {
            'bearer': token
          }
        },
        function (error, response, body) {
          console.log('post x-www-form-urlencoded 请求返回数据 body：');
          console.log(body);
          console.log('post x-www-form-urlencoded 请求返回数据 body： end');
          if (error) {
            console.log('post x-www-form-urlencode error');
            console.error(error);
            return res.status(422).send(body);
          }
          // TODO 这里待测试
          if (response && response.statusCode) {
            return res.status(response.statusCode).send(body);
          }
          return res.send(body);
        }
      )
    }
    else if ((req.method === 'POST') && contentType
      && contentType.indexOf('application/json') !== -1) { // 因为application/json 走最后一个失败了
      request.post(
        url, {
          body: req.body,
          json: true,
          'auth': {
            'bearer': token
          }
        },
        function (error, response, body) {
          console.log('post application/json 请求返回数据 body：');
          console.log(body);
          if (error) {
            console.log('post x-www-form-urlencode error');
            console.error(error);
            return res.status(422).send(body);
          }
          // TODO 这里待测试
          if (response && response.statusCode) {
            return res.status(response.statusCode).send(body);
          }
          return res.send(body);
        }
      )
    }
    else if (req.method === 'PUT') {
      request.put(url, { form: req.body, auth: { bearer: token } }, function (error, response, body) {
        console.log('post x-www-form-urlencoded 请求返回数据 body：');
        console.log(body);
        console.log('post x-www-form-urlencoded 请求返回数据 body： end');
        if (error) {
          console.log('post x-www-form-urlencode error');
          console.error(error);
          return res.staus(422).send(body);
        }
        res.status(response.statusCode).send(body);
      })
    }
    else if (req.method === 'DELETE') {
      request.delete(url, { form: req.body, auth: { bearer: token } }, function (error, response, body) {
        console.log('post x-www-form-urlencoded 请求返回数据 body：');
        console.log(body);
        console.log('post x-www-form-urlencoded 请求返回数据 body： end');
        if (error) {
          console.log('post x-www-form-urlencode error');
          console.error(error);
          return res.staus(422).send(body);
        }
        res.status(response.statusCode).send(body);
      })
    }
    else if (req.method === 'GET') {
      console.log(url)
      request.get(url, { auth: { bearer: token } }, function (error, response, body) {
        console.log(body);
        if (error) {
          console.log('get 请求 error');
          console.error(error);
          return res.status(422).send(body);
        }
        res.status(response.statusCode).send(body);
      })
    }
    else {
      req.pipe(request({
        'url': url,
        'auth': {
          'bearer': token
        },
        'timeout': 36 * 1000 * 1000
      }, function (error, response, body) {
        if (error) {
          console.log('--- 代理 err start ---');
          console.log(error);
          console.log('--- 代理 err end ---');
        }
        console.log('从服务器取回来的 body');
        console.log(body);
      })).pipe(res);
    }
  }

};
