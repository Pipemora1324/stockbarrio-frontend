// Karma setup used by `ng test`. Adds a per-file coverage table and a headless Chrome that also works in CI.
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [require('karma-jasmine'), require('karma-chrome-launcher'), require('karma-jasmine-html-reporter'), require('karma-coverage')],
    client: {
      jasmine: { random: true },
      clearContext: false,
    },
    jasmineHtmlReporter: { suppressAll: true },
    coverageReporter: {
      dir: require('path').join(__dirname, 'coverage'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text' }, { type: 'text-summary' }, { type: 'json-summary' }],
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    customLaunchers: {
      // CI containers run as root without a sandbox.
      ChromeHeadlessCI: { base: 'ChromeHeadless', flags: ['--no-sandbox'] },
    },
    restartOnFileChange: true,
  });
};
