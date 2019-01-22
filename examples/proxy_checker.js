const proxyChecker = require('../index').proxyChecker; // in prod: require('@k7eon/bruteforce-security-checker').proxyChecker;

proxyChecker.run(
  '../files/proxy.txt',
  '../files/valid_proxies.txt',
  'http'
);