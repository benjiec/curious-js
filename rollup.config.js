import pkg from './package.json';

export default [
  {
    entry: 'curious.js',
    dest: pkg.browser,
    format: 'umd',
    moduleName: 'curious',
  },
  {
    entry: 'curious.js',
    targets: [
      { dest: pkg.main, format: 'cjs' },
      { dest: pkg.module, format: 'es' },
    ],
  },
];
