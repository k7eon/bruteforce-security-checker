const _      = require('lodash');
const fs     = require('fs');
const async  = require('async');
const SocksProxyAgent = require('socks-proxy-agent');

class BruteForce {
  constructor() {
    this.accounts = [];
    this.proxies = [];
    this.agents = [];
    this.queue = null;

    this.metrics = {};
    this.metricsInterval = null;
  }

  /**
   * Create metrics object like counter to monitor custom metrics
   * @param {object} metrics     object of string like {'good':0, 'bad':0}
   */
  setMetrics(metrics) {
    this.metrics = metrics
  }

  _getMetrics() {
    return _.assign(this.metrics, {left: this.queueLeft()});
  }

  /**
   * start interval showing metrics
   * @param {number} interval    ms, interval of console.log
   */
  startShowingMetrics(interval = 10000) {
    this.metricsInterval = setInterval(() => {
      console.log(this._getMetrics());
    }, interval);
  }

  _stopShowingMetrics() {
    if (!this.metricsInterval) return;
    console.log(this._getMetrics());
    clearInterval(this.metricsInterval);
  }

  /**
   * Creates files if they are not exists
   * But directories must be created by hand
   * @param {object} filesObj     like {loggedIn: './loggedIn.log'}
   */
  createFilesIfNotExists(filesObj) {
    let paths = _.values(filesObj);
    for (let path of paths) {
      if (fs.existsSync(path)) continue;
      fs.closeSync(fs.openSync(path, 'a'));
    }
  }

  /**
   * // todo universalize
   * parse lines from file and load account to check
   * example of line in file: email@e.mail:mypass
   * @param  {string}   path
   * @param  {boolean}  getLogin=false  need to retrieve login from email, is it?
   * @return {Array}                    like {email, password}[]
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
   * @param {string] path
   * @return {Array}   like {login, email, password}[]
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
   * Remove all lines from this.accounts that includes 'email' attr in 'path' file
   * Update this.accounts
   * @param {string} by          any attribute from this.accounts[0]
   * @param {string} path        path to file whose lines must be removed from this.accounts
   * @return {Array}
   */
  removeAccountsFrom(by='email', path = 'files/bad.log') {
    if (!this.accounts.length) throw new Error('Load account before remove bad!');

    let bad = fs.readFileSync(path, 'utf8');
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
   * todo http proxy support
   * File contain lines like: "128.12.1.1:1080"
   * Update this.proxies
   * @param {string} path
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
   * Loading  proxies and generate this.agents whose are used in http request options
   * @param {string} path
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
   * Return count of left work in queue
   * @return {number}
   */
  queueLeft() {
    return this.queue._tasks.length;
  }

  /**
   * this.agents.shift()
   * @return {Agent | null}
   */
  getAgent() {
    if (this.agents.length === 0) return null;
    return this.agents.shift();
  }

  /**
   * push(agent) after 'timeout'
   * @param {Agent} agent
   * @param {number} timeout
   * @return {undefined}
   */
  returnAgent(agent, timeout = 1) {
    setTimeout(() => {
      this.agents.push(agent);
    }, timeout);
  }

  /**
   * Start processing
   * handlerFunc example: async (task,agent)=>{ try/catch, return {agent?} }. if return {agent} then will call this.returnAgent
   *
   * opts = {
   *   {integer}    THREADS         threads amount
   *   {function}   handlerFunc     required.
   *   {string}     whatToQueue     from this. context. ('accounts' or 'agents')
   *   {string}     startMessage    this will print on bruteforce start checking
   *   {string}     drainMessage    this will print when all tasks are processed
   *   {function}   drainCallback   required. Callback when all tasks are processed
   *   {boolean}    useProxy
   * }
   *
   * @param {object} opts
   * @returns {true}
   */
  start(opts) {
    if (!opts.THREADS)         opts.THREADS       = 100;
    if (!opts.handlerFunc)     throw new Error('handlerFunc not defined!');
    if (!opts.whatToQueue)     opts.whatToQueue   = 'accounts';
    if (!opts.startMessage)    opts.startMessage  = `Start ${opts.whatToQueue} checking`;
    if (!opts.drainMessage)    opts.drainMessage  = `All ${opts.whatToQueue} have been processed`;
    if (!opts.drainCallback)   throw new Error('drainCallback not defined!');
    if (!opts.useProxy)        opts.useProxy      = false;

    let {THREADS, whatToQueue, startMessage, drainMessage, drainCallback, useProxy} = opts;

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
      self._stopShowingMetrics();
      drainCallback();
    };
    this.queue.push(source);
    console.log(startMessage);
    return true;
  }

  /**
   * Async timeout implementation
   * Usage: await this.timeout(5000)
   * @param {number} ms
   * @return {Promise<any>}
   */
  timeout(ms) {
    return new Promise(res => setTimeout(res, ms));
  }
}

module.exports = new BruteForce();