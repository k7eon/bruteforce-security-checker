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

  _getMetrics() {
    return _.assign(this.metrics, {left: this.queueLeft()});
  }

  /**
   * NEW this method replace this.setMetrics and this.startShowingMetrics in to one method
   * Create metrics object like counter to monitor custom metrics
   * start interval showing metrics
   * @param {object}  metrics    object of string like {'good':0, 'bad':0}
   * @param {number} interval    ms, interval of console.log
   */
  showMetrics(metrics, interval = 10000) {
    this.metrics = metrics;
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
   * 1. load accounts from file
   * 2. build they in like {email, password}[]
   *
   * You can define own methods for mutate left and right line half.
   * Please don`t load more than 1kk lines. It so slow.
   *
   * opts = {
   *   {string}   path           required. Path to file with accounts
   *   {string}   leftName       default 'email'. The of the left half
   *   {string}   rightName      default 'password'. The of the right half.
   *   {string}   delimiter      default /:|;/ . The delimiter between 'email' and 'password'
   *   {function} leftCallback   default null. May be (email) => {} Must return null, string or object
   *   {function} rightCallback  default null. May be (password) => {} Must return null, string or object
   * }
   *
   * example:
   *  let r = loadAccounts2({
   *    path: 'files/source.txt',
   *    leftName: 'email',
   *    rightName: 'password',
   *    leftCallback: (email) => {
   *      // let login = email.split('@')[0];
   *      // return {login, email};
   *      // // or
   *      // return null;
   *      // // or
   *      return email;
   *    },
   *    rightCallback: (password) => {
   *      // return null;
   *      // // or
   *      return password;
   *      // // or
   *      // return {password, p2: password};
   *    },
   *  })
   *
   * @param {object|string} opts - object or path string
   * @return {Array}
   */
  loadAccounts(opts) {

    // this need for backward compatibility
    let stringPath = null;
    if (typeof opts === 'string') {
      stringPath = opts;
      opts = {};
    }

    if (!opts.path) opts.path = 'files/source.txt';
    if (!opts.leftName) opts.leftName = 'email';
    if (!opts.rightName) opts.rightName = 'password';
    if (!opts.delimiter) opts.delimiter = /:|;/;
    if (!opts.leftCallback) opts.leftCallback = null;
    if (!opts.rightCallback) opts.rightCallback = null;

    let {path, leftName, rightName, delimiter, leftCallback, rightCallback} = opts;
    if (stringPath) path = stringPath; // and this

    let source = fs.readFileSync(path, 'utf8').split('\n');

    let accounts = _.compact(_.map(source, (line) => {
      if (!line) return null;

      let [left, right] = line.split(delimiter);

      let r = {};

      console.log([left, right]);

      if (leftCallback) {
        let newLeft = leftCallback(left);
        if (!newLeft) return null;
        if (typeof newLeft === 'string') left = newLeft;
        if (typeof newLeft === 'object') _.assign(r, newLeft);
      }

      if (rightCallback) {
        let newRight = rightCallback(right);
        if (!newRight) return null;
        if (typeof newRight === 'string') left = newRight;
        if (typeof newRight === 'object') _.assign(r, newRight);
      }

      r = _.assign({
        [leftName]: left,
        [rightName]: right
      }, r);

      return r;
    }));

    this.accounts = accounts;
    console.log('Success load registered accounts:', accounts.length);

    return accounts;
  }

  /**
   * Remove all lines from this.accounts that includes 'email' attr in 'path' file
   * Update this.accounts
   * @param {string} by          any attribute from this.accounts[0]
   * @param {string|array} path  path/s to file whose lines will be removed from this.accounts through indexOf
   * @return {Array}
   */
  removeAccountsBy(by='email', path = 'files/bad.log') {
    if (!this.accounts.length) throw new Error('Load account before remove bad!');

    let paths = (typeof path === 'string') ? [path] : path;
    let accounts = null;

    for (let path of paths) {
      let source = fs.readFileSync(path, 'utf8');

      let accounts = _.filter(this.accounts, (account) => {
        let thing = account[by];
        return (source.indexOf(thing) === -1);
      });

      let before = this.accounts.length;
      let now = accounts.length;
      let removed = before-now;
      console.log(`Success removed from ${path}`, {removed, now});

      this.accounts = accounts;
    }
    return accounts;
  }

  /**
   * todo http proxy support
   * File contain lines like: "128.12.1.1:1080"
   * Update this.proxies
   * @param {string} path
   * @param {boolean} silent    - is need showing message after success loading proxies
   * @return {Array}
   */
  loadProxies(path = 'files/proxy.txt', silent = false) {
    let source = fs.readFileSync(path, 'utf8');
    let proxies = _.compact(source.split('\n'));
    this.proxies = proxies;
    if (silent) console.log('Success load proxies:', proxies.length);
    return proxies;
  }

  /**
   * todo http proxy support
   * Loading  proxies and generate this.agents whose are used in http request options
   * @param {string} path
   * @return {Array}
   */
  loadProxyAgents(path = 'files/valid_proxy.txt') {
    let proxies = this.loadProxies(path, false);
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
   *   {boolean}    useProxy        default false
   * }
   *
   * @param {object} opts
   * @returns {boolean}
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

  /**
   * Add task in queue to execute again
   * @param task
   */
  reCheck(task) {
    this.queue.push(task);
  }

  /**
   * write content to file + '\n' and increase metrics counter if needed
   * @param path
   * @param line
   * @param metricsName
   */
  save(path, line, metricsName = null) {
    fs.appendFileSync(path, line+'\n');
    if (metricsName) this.metrics[metricsName]++;
  }

  /**
   * DEPRECATED, use this.showMetics instead
   * Create metrics object like counter to monitor custom metrics
   * @deprecated
   * @param {object} metrics     object of string like {'good':0, 'bad':0}
   */
  setMetrics(metrics) {
    this.metrics = metrics
  }

  /**
   * DEPRECATED, use this.showMetics instead
   * start interval showing metrics
   * @deprecated
   * @param {number} interval    ms, interval of console.log
   */
  startShowingMetrics(interval = 10000) {
    this.metricsInterval = setInterval(() => {
      console.log(this._getMetrics());
    }, interval);
  }

  /**
   * DEPRECATED use this.loadAccounts instead
   * @deprecated
   * @param {string] path
   * @return {Array}       like {login, email, password}[]
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
   * DEPRECATED use this.removeAccountsBy instead
   * @deprecated
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

}

module.exports = new BruteForce();