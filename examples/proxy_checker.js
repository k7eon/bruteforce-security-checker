const fs    = require('fs');
const rp    = require('request-promise');
const brute = require('../index').bruteforce; // in prod: require('@k7eon/bruteforce-security-checker').bruteforce;

const FILE = {
  proxies:        'files/proxy.txt',
  valid_proxies:  'files/valid_proxies.txt',
};
brute.createFilesIfNotExists(FILE);

// Clear valid_proxies
fs.writeFileSync(FILE.valid_proxies, '', 'utf8');

brute.setMetrics({'active': 0});
brute.startShowingMetrics(10000);

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
      brute.metrics.active++;
    } catch (e) {
      // Сюда попадает любая ошибка уровня HTTP это 'bad'
    }
    return {task, agent: t};
  },
  drainCallback: () => {
    console.log('drainCallback');
  }
});