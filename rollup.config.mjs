import typescript from '@rollup/plugin-typescript';
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
      typescript(),
      terser()
    ]
  }
];
