var request = require('request'),
  async = require('async');

module.exports = function () {
  var self = this,
    requestBuilds = function (callback) {
      request({
        'url': getRequestURL(),
        'json': true
      },
        function (error, e, body) {
          callback(error, body);
        });
    },
    getRequestURL = function () {
      let config = self.configuration;
      let branch = isExplicitBranch(config.branch) ? '/tree/' + config.branch : '';
      let endPoint = getProjectAPIURL() + branch + getAdditionParams();

      return endPoint;
    },
    isExplicitBranch = function (branchName) {
      return branchName && !isGlobBranch(branchName);
    },
    isGlobBranch = function (branchName) {
      return branchName && branchName.endsWith('*');
    },
    getAdditionParams = function () {
      let config = self.configuration;
      let limit = isGlobBranch(config.branch) ? '' : '&limit=' + config.numberOfBuilds;
      return '?circle-token=' + config.token + limit;
    },
    getProjectAPIURL = function () {
      return self.configuration.url + '/api/v1.1/project/' + self.configuration.vcsType + '/' + self.configuration.slug;
    },
    filterBuilds = function (results) {
      let branchName = self.configuration.branch;
      let numberOfBuilds = self.configuration.numberOfBuilds;

      if (!Array.isArray(results)) {
        console.warn('Request build failed from circle ci: ', results);
        return self.lastBuild;
      }
      if (!isGlobBranch(branchName)) return results;

      let branchList = [];

      self.lastBuild = results
        .filter((build) => {
          if (self.configuration.unique) {
            let name = build.branch;
            if(branchList.indexOf(name) != -1) {
              return false;
            }
            branchList.push(name);
          }

          return filterBuild(branchName, build);
        }).slice(0, numberOfBuilds);

      return self.lastBuild;
    },
    filterBuild = function (partten, res) {
      let prefix = partten.replace('*', '');
      return res.branch && res.branch.startsWith(prefix) && res.dont_build != 'prs-only';
    },
    queryBuilds = function (callback) {
      requestBuilds(function (error, body) {
        if (error) {
          callback(error);
          return;
        }

        let filteredResults = filterBuilds(body);
        let results = filteredResults.map(simplifyBuild);
        callback(error, results);
      });
    },
    parseDate = function (dateAsString) {
      return new Date(dateAsString);
    },
    getStatus = function (result, state) {
      if (state === 'scheduled'
        || state === 'queued'
        || state === 'running') {
        return "Blue";
      }
      if (state === 'canceled'
        || state === 'not_run'
        || state === 'not_running') {
        return "Gray";
      }
      if (state === 'fixed') return "Green";
      if (result === null || result === true) return "Red";
      if (result === false) return "Green";

      return null;
    },
    simplifyBuild = function (res) {
      let branceType = isGlobBranch(self.configuration.branch) ? 'Pull Request' : res.branch;
      return {
        id: self.configuration.slug + '|' + res.build_num,
        project: self.configuration.slug + ' | ' + branceType,
        number: '#' + res.build_num + '   ' + res.branch,
        isRunning: res.status === 'running',
        startedAt: parseDate(res.start_time),
        finishedAt: parseDate(res.stop_time),
        requestedFor: res.author_name,
        status: getStatus(res.failed, res.status),
        statusText: res.status,
        reason: res.subject,
        hasErrors: false,
        hasWarnings: false,
        url: self.configuration.url + '/gh/' + self.configuration.slug + '/' + res.build_num
      };
    };

  self.configure = function (config) {
    self.configuration = config;

    self.configuration.url = 'https://circleci.com';
    self.configuration.token = config.token || '';
    self.configuration.branch = config.branch || null;
    self.configuration.vcsType = config.vcsType || 'github'; //this value ['github', 'bitbucket']
    self.configuration.numberOfBuilds = config.numberOfBuilds || 30; //1 to 100
    self.configuration.unique = config.unique || false;
<<<<<<< HEAD
=======
    self.lastBuild = [];
>>>>>>> Handle error senario when request circle CI failed.
  };

  self.check = function (callback) {
    queryBuilds(callback);
  };
};
