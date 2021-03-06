'use strict';
var path = require('path');
var gutil = require('gulp-util');
var through = require('through2-concurrent');
var prettyBytes = require('pretty-bytes');
var chalk = require('chalk');
var imagemin = require('imagemin');
var imageminGifsicle = require('imagemin-gifsicle');
var imageminJpegtran = require('imagemin-jpegtran');
var imageminOptipng = require('imagemin-optipng');
var imageminSvgo = require('imagemin-svgo');
var plur = require('plur');

module.exports = (plugins, opts) => {
	if (typeof plugins === 'object' && !Array.isArray(plugins)) {
		opts = plugins;
		plugins = null;
	}

	opts = Object.assign({
		// TODO: remove this when gulp get's a real logger with levels
		verbose: process.argv.indexOf('--verbose') !== -1
	}, opts);

	var validExts = ['.jpg', '.jpeg', '.png', '.gif', '.svg'];

	let totalBytes = 0;
	let totalSavedBytes = 0;
	let totalFiles = 0;

	return through.obj((file, enc, cb) => {
		if (file.isNull()) {
			cb(null, file);
			return;
		}

		if (file.isStream()) {
			cb(new gutil.PluginError('gulp-imagemin', 'Streaming not supported'));
			return;
		}

		if (validExts.indexOf(path.extname(file.path).toLowerCase()) === -1) {
			if (opts.verbose) {
				gutil.log(`gulp-imagemin: Skipping unsupported image ${chalk.blue(file.relative)}`);
			}

			cb(null, file);
			return;
		}

		var use = plugins || [
			imageminGifsicle(),
			imageminJpegtran(),
			imageminOptipng(),
			imageminSvgo()
		];

		imagemin.buffer(file.contents, {use})
			.then(data => {
				var originalSize = file.contents.length;
				var optimizedSize = data.length;
				var saved = originalSize - optimizedSize;
				var percent = originalSize > 0 ? (saved / originalSize) * 100 : 0;
				var savedMsg = `saved ${prettyBytes(saved)} - ${percent.toFixed(1).replace(/\.0$/, '')}%`;
				var msg = saved > 0 ? savedMsg : 'already optimized';

				totalBytes += originalSize;
				totalSavedBytes += saved;
				totalFiles++;

				if (opts.verbose) {
					gutil.log('gulp-imagemin:', chalk.green('✔ ') + file.relative + chalk.gray(` (${msg})`));
				}

				file.contents = data;
				cb(null, file);
			})
			.catch(err => {
				// TODO: remove this setImmediate when gulp 4 is targeted
				setImmediate(cb, new gutil.PluginError('gulp-imagemin', err, {fileName: file.path}));
			});
	}, cb => {
		var percent = totalBytes > 0 ? (totalSavedBytes / totalBytes) * 100 : 0;
		let msg = `Minified ${totalFiles} ${plur('image', totalFiles)}`;

		if (totalFiles > 0) {
			msg += chalk.gray(` (saved ${prettyBytes(totalSavedBytes)} - ${percent.toFixed(1).replace(/\.0$/, '')}%)`);
		}

		gutil.log('gulp-imagemin:', msg);
		cb();
	});
};

module.exports.gifsicle = imageminGifsicle;
module.exports.jpegtran = imageminJpegtran;
module.exports.optipng = imageminOptipng;
module.exports.svgo = imageminSvgo;
