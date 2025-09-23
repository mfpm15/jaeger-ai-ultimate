describe('Basic Environment Tests', () => {
    test('should load environment variables', () => {
        expect(process.env.NODE_ENV).toBe('test');
    });

    test('should have basic Node.js functionality', () => {
        expect(typeof require).toBe('function');
        expect(typeof module).toBe('object');
    });

    test('should be able to access file system', () => {
        const fs = require('fs');
        const path = require('path');

        const packagePath = path.join(__dirname, '..', 'package.json');
        expect(fs.existsSync(packagePath)).toBe(true);
    });
});