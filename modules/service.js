const _ = require('lodash');
const request = require('request');
const {requestCloudflare} = require('request-cloudflare');

class Service {

  /**
   * Send request and return promise.
   * @param config     - all the same for 'request' module
   * @param agent      - for convenience. agent by 'request'.agent
   * @param retryCount - amount of retries if not called 'timeout'
   * @return {Promise<{response, body}>}
   * @throws any errors on request
   */
  async r(config, agent = null, retryCount = 3) {
    return new Promise((resolve, reject) => {
      if (!config.agent && agent) _.assign(config, {agent: agent});
      if (!config.timeout) _.assign(config, {timeout: 60*1000});

      let t = setTimeout(async () => {
        // console.log('request die');
        if (retryCount === 0) return reject("r.retryCount === 0");
        return resolve(await this.r(config, agent, retryCount-1));
      }, config.timeout+2*1000);

      request(config, (error, response, body) => {
        clearTimeout(t);
        if (error) return reject(error);
        return resolve({response, body});
      });
    })
  }

  /**
   * by pass cloudflare and work same as this.r
   * @param config     - all the same for 'request' module
   * @param agent      - for convenience. agent by 'request'.agent
   * @param retryCount - amount of retries if not called 'timeout'
   * @return {Promise<void>}
   */
  async rCloudFlare(config, agent=null, retryCount = 3) {
    return new Promise((resolve, reject) => {
      if (!config.agent && agent) _.assign(config, {agent: agent});
      if (!config.timeout) _.assign(config, {timeout: 60*1000});

      let t = setTimeout(async () => {
        // console.log('request die');
        if (retryCount === 0) return reject("r.retryCount === 0");
        return resolve(await this.r(config, agent, retryCount-1));
      }, config.timeout+2*1000);

      requestCloudflare.request(config, (error, response, body) => {
        clearTimeout(t);
        if (error) return reject(error);
        return resolve({response, body});
      });
    })
  }

  /**
   * retrieve 'set-cookie' header from 'request'.response
   * @param rResponse
   * @return {*}
   */
  getSetCookies(rResponse) {
    let headers = rResponse.headers;
    if (!headers['set-cookie']) return null;
    return headers['set-cookie'].map(e => e.split(';')[0]+';').join(' ');
  }

  /**
   * Retrieve sub string by passing 'start' and 'end' substring
   * example: parse('123baaz321', '123', '321') will return 'baaz'
   * @param {string} source   source string
   * @param {string} start    start substring
   * @param {string} end      end substring
   * @return {string}
   */
  parse(source, start, end) {
    if (!source.length ||
      source.indexOf(start) === -1 ||
      source.indexOf(end) === -1) return "";
    let startPos = source.indexOf(start)+start.length;
    let secondSource = source.substr(startPos, source.length);
    let endPos = secondSource.indexOf(end);
    return secondSource.substring(0, endPos);
  }
}

module.exports = Service;