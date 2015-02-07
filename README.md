# jsdelivr - api-sync
[![Build Status](https://travis-ci.org/jsdelivr/api-sync.svg?branch=master)](https://travis-ci.org/jsdelivr/api-sync)

This service keeps [jsdelivr API](https://github.com/jsdelivr/api) database up to date. Head there for the user facing part.

## Usage

[Install node](http://nodejs.org/download/) and npm on your system.  For Mac, you can <a href="http://brew.sh/">install Homebrew</a> and then run `brew install node`

### Install dependencies

    npm install

### Configure module

From the project root:

1. `$ cp ./config/config.template.js ./config/config.js`
2. Edit newly created `./config/config.js` w/ appropriate values.
  * Github API token under key `githubToken`
  * Logentries API token under key `logentriesToken`
  * Nodemailer smtp `host` and `port` values under key `smtp`
  * Nodemailer smtp `user` and `pass` values under key `smtpAuth`
  * Address to send notifications from under key `smtpFrom`
  * Address to send notifications to under key `smtpTo`

Alternatively you can specify the config values via process environment variables:

  * GITHUB_TOKEN
  * LOGENTRIES_TOKEN
  * SMTP_HOST and SMTP_PORT
  * SMTP_AUTH_USER and SMTP_AUTH_PASS
  * SMTP_FROM_EMAIL
  * SMTP_TO_EMAIL

### Run the module

```
  $ npm start
```

Your output data will be in the `data/` directory.

To stop the process, send a shell termination (`[Ctrl+c]` in Windows), then `y`.

### Select CDNs

If you want to limit which CDNs api-sync crawls, edit the `var cdns` line in `[tasks/index.js](https://github.com/jsdelivr/api-sync/blob/master/tasks/index.js)`.

## License

MIT. See LICENSE for details.
