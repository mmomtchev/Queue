import typescript from '@rollup/plugin-typescript';
import modify from 'rollup-plugin-modify';
import terser from '@rollup/plugin-terser';

export default [
  {
    input: 'src/index.ts',
    output: {
      format: 'cjs',
      file: 'cjs/index.cjs',
      sourcemap: true
    },
    plugins: [
      modify({
        find: /debug\(.*\);?/,
        replace: ''
      }),
      typescript(),
      terser()
    ]
  },
  {
    input: 'src/index.ts',
    output: {
      format: 'es',
      file: 'es6/index.mjs',
      sourcemap: true
    },
    plugins: [
      modify({
        find: /debug\((.*\));?/,
        replace: (_, expr) => process?.env?.QUEUE_DEBUG ? `console.debug(${expr});` : ''
      }),
      typescript(),
      terser()
    ]
  }
];
