const _ = require('lodash');
const fs     = require('fs');
const SocksProxyAgent = require('socks-proxy-agent');
const async  = require('async');

// todo put file paths and create files if they are not exists
// todo store custom metrics and interval show them

class BruteForce {
  constructor() {
    this.accounts = [];
    this.proxies = [];
    this.agents = [];
    this.queue = null;
  }

  /**
   * parse lines from file and load account to check
   * example of line in file: email@e.mail:mypass
   * @param path
   * @return { [{email, password}] }
   */
  loadAccounts(path = 'files/source.txt', getLogin = false) {
    let source = fs.readFileSync(path, 'utf8').split('\n');

    let accounts = _.compact(_.map(source, (line) => {
      if (!line) return null;
      let [email, password] = line.split(':');
      password = password.replace('\r', '');

      if (getLogin) {
        // todo universalize
        let login = email.split('@')[0];
        login     = login.replace(/\.|\!|\@|\_/g, '');
        if (login.length >= 13) return null;
        return {login, email, password};
      }
      return {email, password};
    }));

    this.accounts = accounts;
    console.log('Success load registered accounts:', accounts.length);
    return accounts;
  }

  /**
   * // todo universalize
   * @param path
   * @return { [{login, email, password}] }
   */
  loadRegisteredAccounts(path = 'files/registered.log') {
    let registered = fs.readFileSync(path, 'utf8').split('\n');

    let accounts = _.compact(_.map(registered, (line) => {
      if (!line) return null;

      let login = line.split('::')[0];
      let email = line.split('::')[1].split(':')[0];
      let password = line.split('::')[1].split(':')[1];

      password = password.replace('\r', '');
      return {login, email, password};
    }));

    this.accounts = accounts;
    console.log('Success load registered accounts:', accounts.length);
    return accounts;
  }

  /**
   * remove all lines of this.accounts that includes in 'path' file
   * @param by
   * @param path
   * @return {Array}
   */
  removeAccountsFrom(by='email', path = 'files/bad.log') {
    if (!this.accounts.length) throw new Error('Load account before remove bad!');

    let bad = fs.readFileSync(badPath, 'utf8');
    let accounts = _.filter(this.accounts, (account) => {
      let thing = account[by];
      return (bad.indexOf(thing) === -1);
    });

    let before = this.accounts.length;
    let now = accounts.length;
    let removed = before-now;
    console.log('Success remove bads', {removed, now});
    this.accounts = accounts;
    return accounts;
  }

  /**
   *
   * @param path
   * @return {Array}
   */
  loadProxies(path = 'files/proxy.txt') {
    let source = fs.readFileSync(path, 'utf8');
    let proxies = _.compact(source.split('\n'));
    this.proxies = proxies;
    console.log('Success load proxies:', proxies.length);
    return proxies;
  }

  /**
   * todo http proxy support
   * @param path
   * @return {Array}
   */
  loadProxyAgents(path = 'files/valid_proxy.txt') {
    let proxies = this.loadProxies(path);
    let agents = _.compact(_.map(proxies, (proxy) => {
      return (proxy) ? new SocksProxyAgent('socks://' + proxy) : null
    }));
    this.agents = agents;
    console.log('Success load proxy agents:', agents.length);
    return agents
  }

  /**
   * Return count of left work
   * @return {number}
   */
  queueLeft() {
    return this.queue._tasks.length;
  }

  /**
   * @return {*}
   */
  getAgent() {
    if (this.agents.length === 0) return null;
    return this.agents.shift();
  }

  /**
   * @param agent
   * @param timeout
   */
  returnAgent(agent, timeout = 1) {
    setTimeout(() => {
      this.agents.push(agent);
    }, timeout);
  }

  /**
   *
   * @param opts = {
   *   THREADS       - threads amount
   *   handlerFunc   - example: async (task,agent)=>{ try/catch, return {agent?} }.
   *                   if return {agent} then will call this.returnAgent
   *
   *   whatToQueue   - from this. context. ('accounts'|'agents')
   *   startMessage  - this will print on bruteforce start checking
   *
   *   drainMessage  - this will print when all tasks are processed
   *   drainCallback - call callback when all tasks are processed
   *
   *   useProxy      - is need to return agent to every opts.handlerFunc
   * }
   */
  start(opts) {
    if (!opts.THREADS)         opts.THREADS       = 100;
    if (!opts.handlerFunc)     throw new Error('handlerFunc not defined!');
    if (!opts.whatToQueue)     opts.whatToQueue   = 'accounts';
    if (!opts.startMessage)    opts.startMessage  = `Start ${opts.whatToQueue} checking`;
    if (!opts.drainMessage)    opts.drainMessage  = `All ${opts.whatToQueue} have been processed`;
    if (!opts.drainCallback)   throw new Error('drainCallback not defined!');
    if (!opts.useProxy)        opts.useProxy      = false;

    let {THREADS, handlerFunc, whatToQueue, startMessage, drainMessage, drainCallback, useProxy} = opts;

    let source = this[whatToQueue];
    if (!source || !source.length) throw new Error(`Nothing ${whatToQueue} to check`);

    let self = this;

    this.queue = async.queue(async function(task, callback) {
      let agent = null;
      // get proxy
      if (useProxy) {
        agent = self.getAgent();
        while(!agent) {
          await self.timeout(5000);
          agent = self.getAgent();
        }
      }

      let result = await opts.handlerFunc(task, agent);
      agent = result.agent;

      if (useProxy && agent) self.returnAgent(agent);
      callback();
    }, THREADS);

    this.queue.drain = function() {
      console.log(drainMessage);
      drainCallback();
    };
    this.queue.push(source);
    console.log(startMessage);
  }

  timeout(ms) {
    return new Promise(res => setTimeout(res, ms));
  }
}

module.exports = new BruteForce();