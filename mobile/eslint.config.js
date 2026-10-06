// Flat config. `eslint-config-expo` brings the React Native, hooks and
// import rules that match this SDK.
const expo = require('eslint-config-expo/flat');

module.exports = [
  ...expo,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*'],
  },
  {
    rules: {
      // This rule exists to stop raw apostrophes and quotes being ambiguous in
      // HTML. React Native renders no HTML, and Uzbek spells ordinary words
      // with an apostrophe — o'qidim, bog', to'liq. Escaping them would make
      // every string unreadable to fix a problem this platform does not have.
      'react/no-unescaped-entities': 'off',
    },
  },
];
