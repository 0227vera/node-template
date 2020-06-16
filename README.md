# 企业号相关服务

## 目录结构

```md
.
├── README.md
├── app.js // 启动文件
├── config
│   ├── db.js // 数据库配置文件
│   ├── ecosystem.config.js // pm2 启动配置文件可以不使用
├── controllers
│   ├── apps.js // 套件里所有的 H5 应用控制器
│   ├── proxy.js // 代理转发到各个学校的后端服务器接口
├── db
│   ├── access_token.db // 存储 微信的 access_token 过期即更新
│   ├── auth.db
│   ├── permanent_code.db // 存储所有授权的永久授权码
│   ├── suites.db // 套件信息
├── package-lock.json
├── package.json
├── public      // 静态文件
├── uploads     // 上传的文件都放在这里
├── views
│   ├── apps.ejs // 首页
```

## todo

这个知识最简单的一个结构，具体的开发还需要看具体的场景需要那些东西去再次做更多的处理,事后会在阿里元的服务器上面去使用node搭建一个自己的网站，到时候会会更新这个模版
