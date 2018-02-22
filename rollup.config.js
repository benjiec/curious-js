import pkg from './package.json';

export default {
  input: 'curious.js',
  output: [
    { file: pkg.unpkg, format: 'umd', name: 'curious' },
    { file: pkg.main, format: 'cjs' },
    { file: pkg.module, format: 'es' },
  ]
};
