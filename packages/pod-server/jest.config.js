module.exports = {
    roots: [
        "<rootDir>/src",
        "<rootDir>/test",
    ],
    preset: 'ts-jest',
    testEnvironment: 'node',
    verbose: false,
    collectCoverage: false,
    globals: {
        'ts-jest': {
            // reference: https://kulshekhar.github.io/ts-jest/user/config/
        }
    },
    transformIgnorePatterns: [
        'node_modules/(?!(solid-server-ts|.*/node_modules/solid-server-ts)/)'
    ]
};
