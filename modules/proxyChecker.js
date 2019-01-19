const fs    = require('fs');
// const rp    = require('request-promise');
const brute = require('../index').bruteforce; // in prod: require('@k7eon/bruteforce-security-checker').bruteforce;
const Service = require('../index').Service;  // in prod: require('@k7eon/bruteforce-security-checker').Service;

/**
 * This things are doing many times. I add this in module
 * Support only socks proxy
 */
class ProxyChecker extends Service {
  /**
   *
   * @param startPath     file to load proxy. Lines like 123.321.321.33:31233
   * @param endPath       file to store valid proxies
   * @param THREADS       amount of thread running in parallel
   * @param timeout       amount of milliseconds to wait response
   */
  run(startPath = 'files/proxy.txt', endPath = 'files/valid_proxies.txt', THREADS = 1000, timeout=60000) {
    let FILE = {
      proxies:        startPath,
      valid_proxies:  endPath,
    };

    brute.createFilesIfNotExists(FILE);

    // Clear valid_proxies file
    fs.writeFileSync(FILE.valid_proxies, '', 'utf8');

    brute.showMetrics({'active': 0}, 3000);

    brute.loadProxyAgents(FILE.proxies);
    brute.start({
      THREADS: THREADS,
      whatToQueue: 'agents',
      handlerFunc: async (task, t) => {
        let agent = task;

        try {
          let {response, body} = await this.r({
            method: 'GET',
            url: 'https://api.ipify.org?format=json',
            timeout: timeout,
            agent: agent,
          });
          brute.save(FILE.valid_proxies, agent.options.host, 'active');
        } catch (e) {
          // Here come any errors on HTTP level. This mains 'bad' proxy
        }

        return {task, agent: t};
      },
      drainCallback: () => {
        console.log('drainCallback');
      }
    });
  }
}

module.exports = new ProxyChecker();