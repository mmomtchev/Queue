module.exports = {
    env: {
        browser: true,
        commonjs: true,
        es6: true,
        node: true
    },
    extends: [
        "eslint:recommended"
    ],
    parserOptions: {
        ecmaVersion: 2017
    },
    rules: {
        quotes: ['error', 'single'],
        semi: ['error', 'always']
    }
};