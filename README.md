# bruteforce-security-checker

By this module you can:
1. Test site for bruteforce security by implement HTTP/WS login requests
2. Test site accessibility on mass user signups.


## Table of contents

- [Installation](#installation)
- [Documentation](#documentation)
- [Bruteforce](#bruteforce)
- [Service](#service)
- [Examples](#examples)
---

## Installation
```npm i @k7eon/bruteforce-security-checker --save```

## Documentation
For methods documentation visit [Doxdox generated docs](https://doxdox.org/k7eon/bruteforce-security-checker)

---------------------------------
# BruteForce
include:
```js
const b = require('@k7eon/bruteforce-security-checker').bruteforce;
// or
const {bruteforce} = require('@k7eon/bruteforce-security-checker');
```

---------------------------------
# Service class
Service is a class with some usefully methods for implement HTTP request

include:
```js
const Service = require('@k7eon/bruteforce-security-checker').Service;
// or
const {Service} = require('@k7eon/bruteforce-security-checker');
```

---------------------------------
## Examples


---------------------------------
#### Example of *Service* usage
```js
  // MySiteClass.js
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
          'accept-language':  'en-US,en;q=0.5',
          'content-type':     'application/x-www-form-urlencoded; charset=UTF-8',
          'origin':           'http://mysite.com',
          'referer':          'http://mysite.com/login',
          'user-agent':       'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 YaBrowser/18.1.1.835 Yowser/2.5 Safari/537.36',
          'x-requested-with': 'XMLHttpRequest',
        },
        form: {
          'username': login,
          'password': password,
        },
        json: true,
      };
      let {response, body} = this.r(config, agent);
      
      if (!body.success) return null;
      let logCookies = this.getSetCookies(response);
      return logCookies;
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
b.loadRegisteredAccounts(FILE.registered);
b.removeAccountsFrom('email', FILE.bad);
b.loadProxyAgents(FILE.proxies);

b.setMetrics({'good':0, 'bad':0})
b.startShowingMetrics(10000);

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
        fs.appendFileSync(FILE.bad, email+'\n');
        b.metrics.bad++;
        return {agent};
      }
      if (cookie) {
        console.log('good');
        fs.appendFileSync(FILE.good, `${[email, password].join(':')]}\n`);
        b.metrics.good++;
        return {agent};
      }
    } catch (e) {
      console.log('error', e);
      brute.queue.push(account);  // recheck account
      fs.appendFileSync(FILE.errors, `${JSON.stringify({account, proxy: agent.options.host})}\n${e.stack}\n\n`);
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


---------------------------------
#### Bruteforce proxy checker example
```js
// proxy_checker.js
const request = require('request');
const rp = require('request-promise');
const brute = require('@k7eon/bruteforce-security-checker').bruteforce;
const FILE = {
  proxies:        'proxy.txt',
  valid_proxies:  'valid_proxies.txt',
};
// create empty files in they are not exists. Be careful, 
// create directory 'files' if not exists
brute.createFilesIfNotExists(FILE);

// For interval showing statistic
brute.setMetrics({'active': 0});
brute.startShowingMetrics(10000);

// Load proxies and create agents
brute.loadProxyAgents(FILE.proxies);
brute.start({
  THREADS: 1000,
  whatToQueue: 'agents',
  handlerFunc: async (task, t) => {
    /* workflow start */
    let agent = task;

    try {
      await rp({
        url: 'https://api.ipify.org?format=json',
        method: 'GET',
        timeout: 60000,
        agent: agent,
      });
      let host = agent.options.host;
      fs.appendFileSync(FILE.valid_proxies, host+'\n');
      brute.metrics.active++;  // increment metric
    } catch (e) {
      // there all errors if HTTP layer. 
      // This proxy are not needed.
    }
    return {task, agent: t};
    /* end workflow */
  },
  drainCallback: () => {
    console.log('drainCallback');
  }
});
```
- Put some proxies in **files/proxy.txt**
- Run ```node proxy_checker.js```
