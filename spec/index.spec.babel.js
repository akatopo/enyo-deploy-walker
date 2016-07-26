/* eslint-env jasmine */

import walker from '../src/index';
import mockFs from 'mock-fs';
import { oneLine } from 'common-tags';

describe('Enyo deploy walker', () => {
  describe('has an API that', () => {
    it('should have a getDependencies function', () => {
      expect(typeof walker.getDependencies).toBe('function');
    });

    it('should have a mergeDependencyCollections function', () => {
      expect(typeof walker.mergeDependencyCollections).toBe('function');
    });

    it('should have a pushDependecyCollection function', () => {
      expect(typeof walker.pushDependecyCollection).toBe('function');
    });

    it('should have a createDependencyCollection function', () => {
      expect(typeof walker.createDependencyCollection).toBe('function');
    });
  });

  describe('has a getDependencies function that', () => {
    afterEach(() => { mockFs.restore(); });

    it(
      oneLine`should extract dependency paths (*.js, *.css, *.less)
        from a package.js file present in the given directory`,
      () => {
        mockFs({
          '/enyoProject': {
            source: {
              'script1.js': '',
              'script2.js': '',
              'css1.css': '',
              'ignore.me': '',
            },
            'package.js': oneLine`enyo.depends(
              "source/script1.js", "source/script2.js", "source/css1.css")`,
          },
        });
        const deps = walker.getDependencies('/enyoProject');

        expect(deps.scripts).toEqual([
          '/enyoProject/source/script1.js',
          '/enyoProject/source/script2.js',
        ]);
        expect(deps.assets).toEqual([]);
        expect(deps.css).toEqual(['/enyoProject/source/css1.css']);
      });

    it('should rename .less dependencies to .css (by convention)', () => {
      mockFs({
        '/enyoProject': {
          source: {
            'style.css': '',
            'style.less': '',
          },
          'package.js': 'enyo.depends("source/style.less")',
        },
      });
      const deps = walker.getDependencies('/enyoProject');

      expect(deps.scripts).toEqual([]);
      expect(deps.css).toEqual(['/enyoProject/source/style.css']);
      expect(deps.assets).toEqual([]);
    });

    it(
      oneLine`should recursively read package.js files from
        extensionless names (directories by convention) in a package.js
        file present in the given directory`,
      () => {
        mockFs({
          '/enyoProject': {
            source: {
              style: {
                'style.css': '',
                'package.js': 'enyo.depends("style.css");',
              },
              'script.js': '',
              'package.js': 'enyo.depends("style", "script.js")',
            },
            'package.js': 'enyo.depends("source")',
          },
        });
        const deps = walker.getDependencies('/enyoProject');

        expect(deps.scripts).toEqual(['/enyoProject/source/script.js']);
        expect(deps.css).toEqual(['/enyoProject/source/style/style.css']);
        expect(deps.assets).toEqual([]);
      }
    );

    it(
      oneLine`should ignore dependency paths that have file extensions
        and do not end in .js, .css, and .less)`,
      () => {
        mockFs({
          '/enyoProject': {
            source: {
              'ignore.html': '',
              'ignore.design': '',
              'ignore.me': '',
            },
            'package.js': oneLine`enyo.depends(
              "source/ignore.html", "source/ignore.me", "source/ignore.design")`,
          },
        });
        const deps = walker.getDependencies('/enyoProject');

        expect(deps.scripts).toEqual([]);
        expect(deps.assets).toEqual([]);
        expect(deps.css).toEqual([]);
      }
    );

    it(
      oneLine`should extract dependency paths and assets (any file or directory)
        from a deploy.json file present in the given directory`,
      () => {
        mockFs({
          '/enyoProject': {
            source: {
              'script.js': '',
            },
            assets: {
              'icon.png': '',
            },
            'package.js': 'enyo.depends("source/script.js")',
            'deploy.json': oneLine`{
              "packagejs": "./package.js", "assets": ["./assets/icon.png"] }`,
          },
        });

        const deps = walker.getDependencies('/enyoProject');

        expect(deps.scripts).toEqual(['/enyoProject/source/script.js']);
        expect(deps.assets).toEqual(['/enyoProject/assets/icon.png']);
        expect(deps.css).toEqual([]);
      }
    );

    it('should recursively read asset directories (checks if path is a directory)', () => {
      mockFs({
        '/enyoProject': {
          source: {
            'script.js': '',
          },
          assets: {
            'icon.png': '',
            sprites: {
              'sprite.png': '',
              LICENSE: '',
            },
          },
          'package.js': 'enyo.depends("source/script.js")',
          'deploy.json': '{ "packagejs": "./package.js", "assets": ["./assets"] }',
        },
      });

      const deps = walker.getDependencies('/enyoProject');

      expect(deps.scripts).toEqual(['/enyoProject/source/script.js']);
      expect(deps.assets).toEqual([
        '/enyoProject/assets/icon.png',
        '/enyoProject/assets/sprites/LICENSE',
        '/enyoProject/assets/sprites/sprite.png',
      ]);
      expect(deps.css).toEqual([]);
    });

    it('should prefer deploy.json files over package.js files', () => {
      mockFs({
        '/enyoProject': {
          source: {
            'script.js': '',
          },
          assets: {
            'icon.png': '',
          },
          'another-package.js': 'enyo.depends("source/script.js")',
          'package.js': 'garbage',
          'deploy.json': '{ "packagejs": "./another-package.js", "assets": ["./assets/icon.png"] }',
        },
      });

      const deps = walker.getDependencies('/enyoProject');

      expect(deps.scripts).toEqual(['/enyoProject/source/script.js']);
      expect(deps.assets).toEqual(['/enyoProject/assets/icon.png']);
      expect(deps.css).toEqual([]);
    });

    it('should ignore properties other than assets and packagejs from deploy.json files', () => {
      mockFs({
        '/enyoProject': {
          source: {
            'script.js': '',
          },
          assets: {
            'icon.png': '',
          },
          'another-package.js': 'enyo.depends("source/script.js")',
          'package.js': 'garbage',
          'deploy.json': oneLine`{
            "packagejs": "./another-package.js",
            "assets": ["./assets/icon.png"],
            "libs": ["1", "2"]
          }`,
        },
      });

      const deps = walker.getDependencies('/enyoProject');

      expect(deps.scripts).toEqual(['/enyoProject/source/script.js']);
      expect(deps.assets).toEqual(['/enyoProject/assets/icon.png']);
      expect(deps.css).toEqual([]);
    });

    it('should normalize the dependency paths returned', () => {
      mockFs({
        '/enyoProject': {
          source: {
            'script.js': '',
          },
          assets: {
            'icon.png': '',
          },
          'package.js': 'enyo.depends("source/script.js", "../../../root.js")',
          'deploy.json': oneLine`{
            "packagejs": "./package.js", "assets": ["./assets/onemorelevel/../icon.png"] }`,
        },
      });

      const deps = walker.getDependencies('/enyoProject');

      expect(deps.scripts).toEqual(['/enyoProject/source/script.js', '/root.js']);
      expect(deps.assets).toEqual(['/enyoProject/assets/icon.png']);
      expect(deps.css).toEqual([]);
    });

    it('does NOT check if file dependencies in package.js actually exist', () => {
      const fs = require('fs');
      mockFs({
        '/enyoProject': {
          source: {
            'script.js': '',
          },
          'package.js': 'enyo.depends("source/nonexistent.js", "source/script.js")',
        },
      });
      const deps = walker.getDependencies('/enyoProject');

      expect(() => { fs.statSync('/enyoProject/source/nonexistent.js'); }).toThrow();

      expect(deps.scripts).toEqual([
        '/enyoProject/source/nonexistent.js',
        '/enyoProject/source/script.js',
      ]);
      expect(deps.assets).toEqual([]);
      expect(deps.css).toEqual([]);
    });

    it(
      oneLine`should throw an exception if the directory given
        does not contain a package.js or a deploy.json file`,
      () => {
        mockFs({
          '/enyoProject': {
            source: {
              'script.js': '',
            },
          },
        });

        expect(() => { walker.getDependencies('/enyoProject'); }).toThrow();
      }
    );

    it('should throw an exception if the directory given is not a directory', () => {
      mockFs({
        '/enyoProject': {
          source: {
            'script.js': '',
          },
        },
      });
      expect(() => { walker.getDependencies('/enyoProject/source/script.js'); }).toThrow();
    });

    it('should throw an exception if the directory given does not exist', () => {
      mockFs({
        '/enyoProject': {
          source: {
            'script.js': '',
          },
        },
      });
      expect(() => { walker.getDependencies('/nonexistent'); }).toThrow();
    });
  });

  describe('has a createDependencyCollection function that', () => {
    it(
      oneLine`creates a dependency collection object,
        that contains exactly three empty arrays: scripts, assets, and css`,
      () => {
        const deps = walker.createDependencyCollection();

        expect(deps.css).toEqual([]);
        expect(deps.scripts).toEqual([]);
        expect(deps.assets).toEqual([]);
      }
    );
  });

  describe('has a pushDependecyCollection function that', () => {
    it('pushes dependencies from another dependency collection into a collection', () => {
      const deps1 = {
        scripts: ['1', '2'],
        assets: ['1', '2'],
        css: ['1', '2'],
      };
      const deps2 = {
        scripts: ['3', '4'],
        assets: [],
        css: [],
      };

      walker.pushDependecyCollection(deps1, deps2);

      expect(deps1.scripts).toEqual(['1', '2', '3', '4']);
      expect(deps1.assets).toEqual(['1', '2']);
      expect(deps1.css).toEqual(['1', '2']);
    });

    it('should return the modified dependency collection', () => {
      const deps1 = walker.createDependencyCollection();
      const deps2 = walker.createDependencyCollection();

      expect(walker.pushDependecyCollection(deps1, deps2)).toBe(deps1);
    });

    it('does NOT check for duplicate dependencies', () => {
      const deps1 = {
        scripts: ['1', '2'],
        assets: ['1', '2'],
        css: ['1', '2'],
      };
      const deps2 = {
        scripts: ['1', '2'],
        assets: ['1'],
        css: ['2'],
      };

      walker.pushDependecyCollection(deps1, deps2);

      expect(deps1.scripts).toEqual(['1', '2', '1', '2']);
      expect(deps1.assets).toEqual(['1', '2', '1']);
      expect(deps1.css).toEqual(['1', '2', '2']);
    });
  });

  describe('has a mergeDependencyCollections function that', () => {
    it('merges two dependency collections into a new collection', () => {
      const deps1 = {
        scripts: ['1', '2'],
        assets: ['1', '2'],
        css: ['1', '2'],
      };
      const deps2 = {
        scripts: ['3', '4'],
        assets: [],
        css: [],
      };

      const deps3 = walker.mergeDependencyCollections(deps1, deps2);

      expect(deps3).not.toBe(deps1);
      expect(deps3).not.toBe(deps2);

      expect(deps3.scripts).toEqual(['1', '2', '3', '4']);
      expect(deps3.assets).toEqual(['1', '2']);
      expect(deps3.css).toEqual(['1', '2']);

      expect(deps1.scripts).toEqual(['1', '2']);
      expect(deps1.assets).toEqual(['1', '2']);
      expect(deps1.css).toEqual(['1', '2']);

      expect(deps2.scripts).toEqual(['3', '4']);
      expect(deps2.assets).toEqual([]);
      expect(deps2.css).toEqual([]);
    });
  });
});
