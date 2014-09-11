# jsdelivr - api-sync

This service keeps [jsdelivr API](https://github.com/jsdelivr/api) database up to date. Head there for the user facing part.

## Usage

[Install node](http://nodejs.org/download/) and npm on your system.  For Mac, you can <a href="http://brew.sh/">install Homebrew</a> and then run `brew install node`

Install dependencies

    npm install

Run the module

    node serve.js

Your output data will be in the `data/` directory.

To stop the process, send a shell termination (`[Ctrl+c]` in Windows), then `y`.

### Select CDNs

If you want to limit which CDNs api-sync crawls, edit the `var cdns` line in `[tasks/index.js](https://github.com/jsdelivr/api-sync/blob/master/tasks/index.js)`.

## License

MIT. See LICENSE for details.
