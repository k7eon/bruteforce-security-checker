const _ = require('lodash');
const request = require('request');

class Service {

  /**
   * Send request and return promise.
   * @param config    - all the same for 'request' module
   * @param agent     - for convenience. agent by 'request'.agent
   * @return {Promise<{response, body}>}
   * @throws any errors on request
   * @throws "Request die" if request timeout not executed.
   *         It usefull to backconnect proxies (in my case they not call default request.timeout sometimes)
   */
  async r(config, agent = null) {
    return new Promise((resolve, reject) => {
      if (!config.agent && agent) _.assign(config, {agent: agent});

      if (!config.timeout) _.assign(config, {timeout: 60*1000});

      let t = setTimeout(() => {
        return reject(new Error("Request die..."));
      }, config.timeout+2*1000);

      request(config, (error, response, body) => {
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