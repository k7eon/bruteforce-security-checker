const _      = require('lodash');
const fs     = require('fs');

const b = require('../index').bruteforce; // in prod: require('@k7eon/bruteforce-security-checker').proxyChecker;

let FILE = {
  s: 'files/proxy.txt',
  r: 'files/valid_proxies.txt',
};

b.loadAccounts(FILE.s);
b.removeAccountsBy('email', [FILE.r, FILE.r]);

// console.log('loadAccounts', loadAccounts({
//   leftCallback: (email) => {
//     let login = email.split('@')[0];
//     // return null;
//     // return {login, email};
//     return email;
//   },
//   rightCallback: (password) => {
//     return {password};
//     // return {password, p2: password};
//   },
// }));

