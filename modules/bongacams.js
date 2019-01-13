const _ = require('lodash');
const Promise = require('bluebird');
const rp = require('request-promise');
const request = require('request');
const querystring = require('querystring');
const fs     = require('fs');

// Для эмуляции браузера
const chrome = require('selenium-webdriver/chrome');
const {Builder, By, Key, until, Actions} = require('selenium-webdriver');
const {Config} = require('selenium-webdriver/lib/proxy');

function parse(source, start, end) {
  if (!source.length ||
    source.indexOf(start) === -1 ||
    source.indexOf(end) === -1) return "";
  let startPos = source.indexOf(start)+start.length;
  let secondSource = source.substr(startPos, source.length);
  let endPos = secondSource.indexOf(end);
  return secondSource.substring(0, endPos);
}

function removeHtml(str) {
  return str.replace(/<(?:.|\n)*?>/gm, '').replace(/&nbsp;/gm, ' ').trim();
}

class Bongocams {
  constructor() {
    this.RECAPTCHA_SITE    = 'https://en.bongacams2.com/login';
    this.RECAPTCHA_SITEKEY = '6LfqtSATAAAAAMd_bCul5C2la5jBcmFJOWenBDGs';
    this.anticaptchaReady  = false;
    this.ac                = null;
  }

  async r(config, agent = null) {
    return new Promise((resolve, reject) => {
      if (!config.agent && agent) _.assign(config, {agent: agent});
      _.assign(config, {timeout: 60*1000});

      request(config, (error, response, body) => {
        if (error) return reject(error);
        return resolve({response, body});
      });
    })
  }

  getSetCookies(rResponse) {
    let headers = rResponse.headers;
    if (!headers['set-cookie']) return null;
    return headers['set-cookie'].map(e => e.split(';')[0]+';').join(' ');
  }

  /**
   * Проверяет, зарегистрирован ли аккаунт по логину
   * @param login
   * @param agent - SocksProxyAgent
   * @return {Promise<boolean>}
   */
  async registerCheck(login, agent = null) {
    let config = {
      method: 'GET',
      // url: `https://spygasm.com/validate-username?value=${login}`,
      url: `https://rt.bongacams2.com/validate-username?value=${login}`,
      timeout: 60000,
      headers: {
        'accept':'application/json, text/javascript, */*; q=0.01',
        'x-requested-with':'XMLHttpRequest',
        'referer':'https://rt.bongacams2.com/',
        'content-type':'text/html; charset=UTF-8',
      },
      json: true,
    };

    if (agent) _.assign(config, {agent: agent});

    let response = await rp(config);
    // console.log(response.status, login);
    return (response.status === 'error');
  }

  async isIpBanned(agent = null) {
    let notExistsLogin = 'livori123131';
    let notExistsResponse = await this.registerCheck(notExistsLogin);
    return !notExistsResponse
  }

  // anticaptcha
  prepareAnticaptcha(ANTICAPTCHA_KEY) {

    this.ac = Promise.promisifyAll(require('../modules/anticaptcha')(ANTICAPTCHA_KEY));
    this.ac.setWebsiteURL(this.RECAPTCHA_SITE);
    this.ac.setWebsiteKey(this.RECAPTCHA_SITEKEY);
    this.ac.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116");
    this.anticaptchaReady = true;
    console.log('Anticaptcha is ready');

    this.ac.getBalanceAsync().then((balance) => {
      console.log('ac balance:', balance);
    })
  }

  /**
   * получаем большое число через гет
   * @param cookie
   * @param timestamp
   * @param agent
   * @return {Promise<*>}
   */
  async number(cookie, timestamp, agent=null) {
    function subOneThing(a) {
      return '' + a.substring(0, 32) + (a.substring(32, 34)-1) + a.substring(34, 64)
    }

    let timeConfig = {
      method: 'GET',
      url: `https://en.bongacams2.com/tools/js.php?_=${timestamp}`,
      timeout: 60000,
      headers: {
        'Accept': 'text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01',
        'Accept-Language':  'en-US,en;q=0.5',
        'Referer':          'https://en.bongacams2.com/login',
        'User-Agent':       'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 YaBrowser/18.1.1.835 Yowser/2.5 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'cookie': cookie,
      },
    };

    let {response, body} = await this.r(timeConfig, agent);
    try {
      let number = body.split(' = "')[1].split('"')[0];
      return subOneThing(number);
    } catch (e) {
      return null;
    }
  }

  /**
   *
   * {"status":"success","redirect_url":"\/"}
   *
   * {"status":"error","captcha_force":true,"message":"Please, fill the reCaptcha field"}
   *
   * @param cookie
   * @param login
   * @param password
   * @param prettyDate
   * @param number
   * @param agent
   * @param gRecaptchaResponse
   * @return {Promise<void>}
   */
  async loginRequest(cookie, login, password, prettyDate, number, agent = null, gRecaptchaResponse = null) {

    let formData = {
      security_log_additional_info: JSON.stringify({
        "language": "en",
        "cookieEnabled": true,
        "javaEnabled": false,
        "flashVersion":"29.0.0",
        "dateTime": prettyDate.replace(' ', '+').replace(' ', '+'),
        "ips":["192.168.1.4"]
      }),
      'log_in[bfpt]': Buffer.from(number, 'hex').toString('utf8'),
      'log_in[username]': login,
      'log_in[password]': password,
    };
    if (gRecaptchaResponse) _.assign(formData, {'g-recaptcha-response': gRecaptchaResponse});
    formData = querystring.stringify(formData);

    let config = {
      method: 'POST',
      url: `https://en.bongacams2.com/login`,
      timeout: 60000,
      headers: {
        'accept':           'application/json, text/javascript, */*; q=0.01',
        'accept-language':  'en-US,en;q=0.5',
        'content-type':     'application/x-www-form-urlencoded; charset=UTF-8',
        'origin':           'https://en.bongacams2.com',
        'referer':          'https://en.bongacams2.com/login',
        'user-agent':       'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 YaBrowser/18.1.1.835 Yowser/2.5 Safari/537.36',
        'x-requested-with': 'XMLHttpRequest',
        'TE': 'Trailers',
        'cookie': cookie,
      },
      form: formData,
      json: true
    };

    return this.r(config, agent);
  }

  async firstCookies(agent = null) {
    let fConfig = {
      method: 'GET',
      url: 'https://en.bongacams2.com/login',
      headers: {'Accept-Encoding':  'gzip, deflate, br'},
      gzip: true,
    };
    let {response, body} = await this.r(fConfig, agent);
    return this.getSetCookies(response);
  }

  /**
   * Авторизация
   *
   * null = bad
   * (string)cookies = good
   *
   * @param login
   * @param password
   * @param agent
   * @return {Promise<*>}
   */
  async login(login, password, agent = null) {
    if (!this.anticaptchaReady) throw 'anticaptcha not ready!';

    let gRecaptchaResponse = null;
    let captchaRetries = 2;

    while (captchaRetries > 0) {
      let cookie = await this.firstCookies(agent);

      let date       = new Date;
      let timestamp  = date.getTime();
      let prettyDate = date.toLocaleString('en-US');

      let number = await this.number(cookie, timestamp, agent);
      if (!number) throw new Error("Need rebrute, bad 'number'");

      let {response, body} = await this.loginRequest(
        cookie, login, password, prettyDate, number, agent, gRecaptchaResponse
      );

      // {"status":"error","global":"      <div class=\"form_error_list\">\n        <div class=\"form_error\">The username or password is invalid.<\/div>\n      <\/div>\n"}
      if (body.status === 'error' && body.global &&
        body.global.includes("The username or password is invalid")
      ) {
        return null;
      }

      // need captcha!
      if (body.status === 'error' && body.captcha_force && !body.global) {
        console.log('solving recaptcha...');
        let taskId   = await this.ac.createTaskProxylessAsync();
        gRecaptchaResponse = await this.ac.getTaskSolutionAsync(taskId);
        captchaRetries--;
        continue;
      }

      if (body.status === 'success') {
        return this.getSetCookies(response);
      }
      console.log('body', body);

      // todo detect suspect login
    }
    throw new Error('Recaptcha > 2 times')
  }

  async getMetrics(cookie, agent = null) {
    let config = {
      method: 'GET',
      url: 'https://en.bongacams2.com/',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64; rv:65.0) Gecko/20100101 Firefox/65.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://en.bongacams2.com/login',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Cookie': cookie,
        'Upgrade-Insecure-Requests': '1',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
      },
      gzip: true,
    };
    if (agent) _.assign(config, {agent: agent});
    let {response, body} = await this.r(config);

    let tokens = parse(body, '"/ajax-few-tokens-im">', '</span');
    if (tokens === '&nbsp;') tokens = 0;

    let membership = removeHtml(parse(body, 'class="membership">', '</span')).split(': ')[1];
    let vip        = removeHtml(parse(body, 'class="vip">',        '</span')).split(': ')[1];

    return {tokens, vip, membership};
  }

  // /**
  //  *
  //  * Выполняет авторизацию на сайте и выделяет основные метрики: токены, вип, статус
  //  * Смог залогиниться:       Promise.resolve<[true, {tokens, vip, membership}]>
  //  * Неверные логин/пароль:   Promise.resolve<[false, 'some reason']>
  //  * Ошибка:                  Promise.reject <[false, 'номер ошибки для дебага', err]>, err - объект ошибки
  //  *
  //  * @param login
  //  * @param password
  //  * @param socksProxy
  //  * @return {Promise<any>}
  //  */
  // async login(login, password, socksProxy = null) {
  //   if (!this.anticaptchaReady) throw 'anticaptcha not ready!';
  //
  //   let ac = this.ac;
  //
  //   return new Promise(async function(resolve, reject) {
  //
  //     let chromeOptions = new chrome.Options()
  //       .headless()
  //       .windowSize({width:1280, height:1024})
  //       .addArguments('log-level=4')
  //       .addArguments('blink-settings=imagesEnabled=false');
  //
  //     if (socksProxy) {
  //       chromeOptions.addArguments(`--proxy-server=socks5://${socksProxy}`);
  //     }
  //
  //     let driver = new Builder()
  //       .forBrowser('chrome')
  //       .setChromeOptions(chromeOptions)
  //       .build();
  //
  //     /**
  //      * Позволяет закрыть браузер
  //      * @param type
  //      * @param args
  //      */
  //     function genResult(type='resolve', args) {
  //       console.log('genResult');
  //       try {
  //         // if (type === 'resolve' || type === 'reject') driver.quit();
  //       } catch (e) {}
  //       if (type === 'resolve') return resolve(args);
  //       if (type === 'reject') return reject(args);
  //     }
  //
  //     try {
  //       let startUrl = 'https://en.bongacams2.com/login';
  //       await driver.get(startUrl);
  //
  //       // yes, 18+
  //       let _18Block = await driver.wait(until.elementLocated(By.css('.button_block a')));
  //       _18Block.click();
  //
  //       let loginInput = await driver.wait(until.elementLocated(By.id('log_in_username')));
  //       await loginInput.sendKeys(login);
  //
  //       let passwordInput = await driver.wait(until.elementLocated(By.id('log_in_password')));
  //       await passwordInput.sendKeys(password);
  //
  //       await driver.findElement(By.css('form.remote')).submit();
  //
  //
  //       // Если смогли авторизоваться
  //       driver.wait(until.elementLocated(By.css('.header_control'))).then(async (e) => {
  //         let tokens     = await driver.findElement(By.css('.bTokens')).getText();
  //         let vip        = await driver.executeScript('return $(\'a[href="/members/account/vip-overview"]\').text().trim()');
  //         let membership = await driver.executeScript('return $(\'a[href="/members/account/membership"]\').text().trim()');
  //
  //         return genResult('resolve', [true, {tokens, vip, membership}])
  //
  //       }).catch((err) => {return reject([false, '#1', err]) });
  //
  //       // "Вы зашли с другого ip, введите капчу"
  //       driver.wait(until.urlContains('/suspect-login')).then(async (e) => {
  //         console.log('suspect-login');
  //
  //         console.log('Resolving recaptcha...');
  //         let taskId   = await ac.createTaskProxylessAsync();
  //         let solution = await ac.getTaskSolutionAsync(taskId);
  //         await driver.executeScript(
  //           `$('<input>').attr({
  //             type: 'hidden',
  //             name: 'g-recaptcha-response',
  //             value:'${solution}'
  //           }).appendTo('.suspect_login_page form');`
  //         );
  //         // Подтверждаем форму
  //         await driver.findElement(By.css('.suspect_login_page form')).submit();
  //
  //       }).catch((err) => {return reject([false, '#1.1', err]) });
  //
  //
  //       // Ждем появление ошибки (неверный пароль или рекапча)
  //       driver.wait(until.elementLocated(By.css('.form_error'))).then(async (errBlock) => {
  //         try {
  //           await driver.wait(until.urlContains('/login'));
  //           console.log('form_error');
  //
  //           let hasError = await errBlock.getText();
  //           console.log('hasError', hasError);
  //
  //           if (hasError === 'The username or password is invalid.') {
  //             return genResult('resolve', [false, hasError]);
  //           }
  //           await passwordInput.sendKeys(password);
  //
  //           // Ищем рекапчу, если она появилась, нам нужно ее разгадать через anticaptcha
  //           await driver.wait(until.elementLocated(By.css('.recaptcha')), 60000);
  //
  //           console.log('Resolving recaptcha...');
  //           let taskId   = await ac.createTaskProxylessAsync();
  //           let solution = await ac.getTaskSolutionAsync(taskId);
  //           await driver.executeScript(
  //             `$('<input>').attr({
  //               type: 'hidden',
  //               name: 'g-recaptcha-response',
  //               value:'${solution}'
  //             }).appendTo('.remote');`
  //           );
  //           // Подтверждаем форму во второй раз
  //           await driver.findElement(By.css('form')).submit();
  //
  //           // Если появляется ошибка - выводим результат
  //           hasError = await driver.wait(until.elementLocated(By.css('.form_error'))).getText();
  //           return genResult('resolve', [false, hasError]);
  //         } catch (err) {
  //           return genResult('reject', [false, '#2', err])
  //         }
  //
  //       }).catch((err) => {return genResult('reject', [false, '#3', err])} );
  //
  //     } catch (err) {return genResult('reject', [false, '#4', err])}
  //   })
  // }

}
module.exports = new Bongocams();