export default {
  testEnvironment: 'node',
  transform: {},          // we use native ES modules, no Babel
  testTimeout: 20000,     // the database is remote, so give it time
  setupFiles: ['./tests/setup.js'],
};