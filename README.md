# bruteforce-security-checker

By this module you can:
1. Test site for bruteforce security by implement HTTP/WS login requests
2. Test site accessibility on mass user signups.

Examples of usage in **/examples** directory


## Table of contents

- [Bruteforce setup](#bruteforce_setup)
- [Bruteforce example](#bruteforce_examples)
- [Service](#service)
- [Service example](#service_examples)

---

## Bruteforce setup

Require module:
```js
const b = require('@k7eon/bruteforce-security-checker').bruteforce;
```

Create metrics object like counter to monitor custom metrics
```js
setMetrics(['loggedIn', 'captcha']);
```

Start showing metrics in console. Argument is interval in ms
```js
startShowingMetrics(10*1000);
```

Create not exist files
```js
createFilesIfNotExists({loggedIn: './loggedIn.log'});
```

Load file, split to lines and return [{email, password}]

Example of expected line: email@email.com:password1

if (getLogin=true) retrieve login from email

after execute they update this.accounts
```js
loadAccounts('accounts.txt', getLogin=false);
```

Expect lines in file like this **someLogin::email@e.co:pass1**
```js
loadRegisteredAccounts('accounts.txt');
```


```js
removeAccountsFrom('accounts.txt');
```


### Basic usage {bruteforce}:
- ```npm i @k7eon/bruteforce-security-checker --save```
- Create proxy_checker.js and put content below:
```js
const brute = require('@k7eon/bruteforce-security-checker').bruteforce;
const FILE = {
  proxies:        'files/proxy.txt',
  valid_proxies:  'files/valid_proxies.txt',
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
  },
  drainCallback: () => {
    console.log('drainCallback');
  }
});
```
- Create directory 'files'
- ```node proxy_checker.js```

// todo basic usage {Service}


---------------------------------
# BruteForce
usage:
```js
  const b = require('@k7eon/bruteforce-security-checker').bruteforce;
  or
  const {bruteforce} = require('@k7eon/bruteforce-security-checker');
```


# [@k7eon/bruteforce-security-checker](https://github.com/k7eon/bruteforce-security-checker#readme) *1.0.13*



### modules/bruteforce.js


#### setMetrics(metrics) 

Create metrics object like counter to monitor custom metrics




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| metrics |  | Array of string like ['good', 'bad'] | &nbsp; |




##### Returns


- `Void`



#### startShowingMetrics(interval) 

start interval showing metrics




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| interval |  | ms, interval of console.log | &nbsp; |




##### Returns


- `Void`



#### createFilesIfNotExists(filesObj) 

Creates files if they are not exists
But directories must be created by hand




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| filesObj | `object`  | like {loggedIn: './loggedIn.log'} | &nbsp; |




##### Returns


- `Void`



#### loadAccounts(path, getLogin&#x3D;false) 

// todo universalize
parse lines from file and load account to check
example of line in file: email@e.mail:mypass




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| path | `string`  |  | &nbsp; |
| getLogin&#x3D;false | `boolean`  | need to retrieve login from email, is it? | &nbsp; |




##### Returns


- `Array`  like {email, password}[]



#### loadRegisteredAccounts({string path) 

// todo universalize




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| {string path |  |  | &nbsp; |




##### Returns


- `Array`  like {login, email, password}[]



#### removeAccountsFrom(by, path) 

Remove all lines from this.accounts that includes 'email' attr in 'path' file
Update this.accounts




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| by | `string`  | any attribute from this.accounts[0] | &nbsp; |
| path | `string`  | path to file whose lines must be removed from this.accounts | &nbsp; |




##### Returns


- `Array`  



#### loadProxies(path) 

todo http proxy support
File contain lines like: "128.12.1.1:1080"
Update this.proxies




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| path | `string`  |  | &nbsp; |




##### Returns


- `Array`  



#### loadProxyAgents(path) 

todo http proxy support
Loading  proxies and generate this.agents whose are used in http request options




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| path | `string`  |  | &nbsp; |




##### Returns


- `Array`  



#### queueLeft() 

Return count of left work in queue






##### Returns


- `number`  



#### getAgent() 

this.agents.shift()






##### Returns


- `Agent`  



#### returnAgent(agent, timeout) 

push(agent) after 'timeout'




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| agent | `Agent`  |  | &nbsp; |
| timeout | `number`  |  | &nbsp; |




##### Returns


-  



#### start(opts) 

Start processing
handlerFunc example: async (task,agent)=>{ try/catch, return {agent?} }. if return {agent} then will call this.returnAgent

opts = {
  {integer}    THREADS         threads amount
  {function}   handlerFunc     required.
  {string}     whatToQueue     from this. context. ('accounts' or 'agents')
  {string}     startMessage    this will print on bruteforce start checking
  {string}     drainMessage    this will print when all tasks are processed
  {function}   drainCallback   required. Callback when all tasks are processed
  {boolean}    useProxy
}




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| opts | `object`  |  | &nbsp; |




##### Returns


- `true`  



#### timeout(ms) 

Async timeout implementation
Usage: await this.timeout(5000)




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| ms | `number`  |  | &nbsp; |




##### Returns


- `Promise.&lt;any&gt;`  




### modules/service.js


#### getSetCookies(rResponse) 

retrieve 'set-cookie' header from 'request'.response




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| rResponse |  |  | &nbsp; |




##### Returns


-  



#### parse(source, start, end) 

Retrieve sub string by passing 'start' and 'end' substring
example: parse('123baaz321', '123', '321') will return 'baaz'




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| source | `string`  | source string | &nbsp; |
| start | `string`  | start substring | &nbsp; |
| end | `string`  | end substring | &nbsp; |




##### Returns


- `string`  




*Documentation generated with [doxdox](https://github.com/neogeek/doxdox).*
