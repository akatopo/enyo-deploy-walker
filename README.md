# :feet: enyo-deploy-walker

A simple node library to extract the paths of sript, css, and asset dependencies for an enyo bootplate project, useful when wanting to build enyo apps with gulp etc.

## Example usage

Get the dependencies for enyo and the app:

```javascript
const enyoWalker = require('enyo-deploy-walker').default;

const boot = enyoWalker.getDependencies('./bootplate/lib/enyo/source/boot');
const source = enyoWalker.getDependencies('./bootplate/lib/enyo/source');
const enyo = enyoWalker.mergeDependencyCollections(boot, source);
const app = enyoWalker.getDependencies('./bootplate');
```

And later use them in gulp tasks:

```javascript
return gulp.src(enyo.scripts)
  .pipe(concat('enyo.js'))
  .pipe(gulp.dest('./dist/build'));
```

```javascript
return gulp.src(enyo.css)
  .pipe(concat('enyo.css'))
  .pipe(gulp.dest('./dist/build'));
```


```javascript
return gulp.src(app.scripts)
  .pipe(concat('app.js'))
  // sourcemaps, babel, etc.
  .pipe(gulp.dest('./dist/build'));
```

```javascript
gulp.src(app.css)
  // possibly rebase css urls and other preprocessing here
  .pipe(concat('app.css'))
  .pipe(gulp.dest('./dist/build'));
```

## API

### `getDependencies(bootplatePath, opts)`

`(string, { verbose: boolean }) → `[`DependencyCollection`](#dependencycollection)

Given a `bootplatePath` path to a directory, it parses its `deploy.json`, or `package.json` if `deploy.json` is not present, and returns a `DependencyCollection` object.

Prints logging messages if `opts.verbose` is truthy.

###  `mergeDependencyCollections(c1, c2)`

`(DependencyCollection, DependencyCollection) → DependencyCollection`

Merges two `DependencyCollection`s into a new `DependencyCollection`.

###  `pushDependecyCollection(c1, c2)`

`(DependencyCollection, DependencyCollection) → DependencyCollection`

Pushes `DependencyCollection` c2 to c1.

###  `createDependencyCollection()`

`* → DependencyCollection`

Creates a new `DependencyCollection`.

### `DependencyCollection`

An object that holds string arrays with the paths of scripts, css, and assets

```
{
  scripts: [string],
  css: [string],
  assets: [string]
}
```