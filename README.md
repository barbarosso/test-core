# Project setup

This project users following plugins to automate the build process and to
>**Browserify**
>Browserify lets you require('modules') in the browser by bundling up all of your dependencies.

>**Gulp**
browserify
mocha *chai*
jshint
jsdoc
build
minify

>**Testem**
Unit testing in Javascript can be tedious and painful, but Testem makes it so easy that you will actually want to write tests.

>**jsHint**
SHint is a community-driven tool to detect errors and potential problems in JavaScript code. It is very flexible so you can easily adjust it to your particular coding guidelines and the environment you expect your code to execute in.

>**jsDoc**
JSDoc 3 is an API documentation generator for JavaScript, similar to JavaDoc or PHPDoc. You add documentation comments directly to your source code, right along side the code itself. The JSDoc Tool will scan your source code, and generate a complete HTML documentation website for you.

# Installation

## Getting Started
If you don't already have Node.js and NPM, go install them.
https://nodejs.org/en/

Once you do, you can then install the gulp executable globally:

```
$> npm install -g gulp
```

## cloning the project and add to new git
To create a duplicate of a repository without forking, you need to run a special clone command against the original repository and mirror-push to the new one.

Before starting make sure you first create a new repository where you can push the current project to.
We have called ours
```
new-repository.git
```

*clone  the bare git to your machine*
```
$> git clone --bare https://github.com/dreamsandcreations/javascript-setup-with-build.git
```
*move into the cloned git*
```
$> cd javascript-setup-with-build.git/
```
*push the git to the new remote git*
```
$> git push --mirror https://github.com/dreamsandcreations/new-repository.git
```


```
$> cd ..
```
*now you can remove the local copy*
```
$>rm -rf javascript-setup-with-build.git/
```
*Clone the new repository to your local machine*
```
$> git clone https://github.com/dreamsandcreations/new-repository.git
```

## installing all npm modules
In the folder where you have cloned the repository, install the build dependencies using npm:

```
$> npm install
```

#### Run gulp tasks
```
$> gulp test
```

```
$> gulp jshint
```

```
$> gulp build
```

```
$> gulp watch
```

#### Testem
Will run all tests in different browsers
```
$> testem
```

#### How to generate the documentation ###

The docs can be generated using npm:

```
$> npm run docs
```

There is also a gulp task to generate them if you want to:

```
$> gulp jsdoc
```

## License

[MIT license](http://opensource.org/licenses/MIT)
