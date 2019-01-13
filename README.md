# bruteforce-security-checker

Благодаря этому модулю можно понять, 
насколько тяжело осуществить 
брутфорс атаку (перебор паролей) через http уровень сайта.


Examples of usage in **/examples** directory

### Basic usage {bruteforce}:
- ```npm i @k7eon/bruteforce-security-checker --save```
- Create proxy_checker.js and put content below:
```
const brute = require('@k7eon/bruteforce-security-checker').bruteforce;
const FILE = {
  proxies:        'files/proxy.txt',
  valid_proxies:  'files/valid_proxies.txt',
};
// create empty files in they are not exists. Be careful, create directory 'files' if not exists
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
      brute.metrics.active++;                                   // increment metric
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
