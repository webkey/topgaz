'use strict';

var gulp = require('gulp'), // Подключаем Gulp
	sass = require('gulp-sass'), // Подключаем Sass пакет https://github.com/dlmanning/gulp-sass
	browserSync = require('browser-sync').create(), // Подключаем Browser Sync
	reload = browserSync.reload,
	concat = require('gulp-concat'), // Подключаем gulp-concat (для конкатенации файлов)
	uglify = require('gulp-uglifyjs'), // Подключаем gulp-uglifyjs (для сжатия JS)
	cssnano = require('gulp-cssnano'), // Подключаем пакет для минификации CSS
	concatCss = require('gulp-concat-css'),
	rename = require('gulp-rename'), // Подключаем библиотеку для переименования файлов
	del = require('del'), // Подключаем библиотеку для удаления файлов и папок
	imagemin = require('gulp-imagemin'), // Подключаем библиотеку для работы с изображениями
	pngquant = require('imagemin-pngquant'), // Подключаем библиотеку для работы с png
	cache = require('gulp-cache'), // Подключаем библиотеку кеширования
	autoprefixer = require('gulp-autoprefixer'), // Подключаем библиотеку для автоматического добавления префиксов
	sourcemaps = require('gulp-sourcemaps'), // Подключаем Source Map для дебагинга sass-файлов https://github.com/floridoo/gulp-sourcemaps
	fileinclude = require('gulp-file-include'),
	markdown = require('markdown'),
	htmlbeautify = require('gulp-html-beautify'), // Причесываем
	fs = require('fs'), // For compiling modernizr.min.js
	modernizr = require('modernizr'), // For compiling modernizr.min.js
	config = require('./modernizr-config'), // Path to modernizr-config.json
	replace = require('gulp-string-replace')
	;

gulp.task('htmlCompilation', function () { // Таск формирования ДОМ страниц
	return gulp.src(['src/__*.html'])
		.pipe(fileinclude({
			filters: {
				markdown: markdown.parse
			}
		}))
		.pipe(rename(function (path) {
			path.basename = path.basename.substr(2);
		}))
		.pipe(htmlbeautify({
			"indent_with_tabs": true,
			"max_preserve_newlines": 0
		}))
		.pipe(gulp.dest('./src/'));
});

/// Таск для переноса normalize.css и его минификации
gulp.task('compressNormalizeCss', function () {
	return gulp.src('src/libs/normalize-css/normalize.css')
		.pipe(gulp.dest('src/sass/base/'))
		.pipe(cssnano())
		.pipe(rename({suffix: '.min'}))
		.pipe(gulp.dest('src/sass/base/'));
});

gulp.task('sassCompilation', ['compressNormalizeCss'], function () { // Создаем таск для компиляции sass файлов
	return gulp.src('src/sass/**/*.+(scss|sass)') // Берем источник
		.pipe(sourcemaps.init())
		.pipe(sass({
			outputStyle: 'expanded', // nested (default), expanded, compact, compressed
			indentType: 'tab',
			indentWidth: 1,
			precision: 3,
			linefeed: 'lf' // cr, crlf, lf or lfcr
		}).on('error', sass.logError)) // Преобразуем Sass в CSS посредством gulp-sass
		.pipe(replace('../../', '../')) /// в css файлах меняем пути к файлам с ../../ на ../
		.pipe(autoprefixer([
			'last 5 versions', '> 1%', 'ie >= 9', 'and_chr >= 2.3' //, 'ie 8', 'ie 7'
		], {
			cascade: true
		})) // Создаем префиксы
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest('./src/css')) // Выгружаем результата в папку src/css
		.pipe(browserSync.reload({
			stream: true
		})); // Обновляем CSS на странице при изменении
});

gulp.task('mergeCssLibs', function () { // Таск для мержа css библиотек
	return gulp.src([
		'src/css/temp/*.css' // see gulpfile-special.js
		, 'src/libs/select2/dist/css/select2.min.css'
		, 'src/libs/magnific-popup/dist/magnific-popup.css' // Magnific Popup - v1.1.0 - 2016-02-20 http://dimsemenov.com/plugins/magnific-popup/
	]) // Выбираем файлы для конкатенации
		.pipe(concatCss("src/css/libs.css", {
			rebaseUrls: false
		}))
		.pipe(gulp.dest('./')) // Выгружаем в папку src/css несжатую версию
		.pipe(cssnano()) // Сжимаем
		.pipe(rename({suffix: '.min'})) // Добавляем суффикс .min
		.pipe(gulp.dest('./')); // Выгружаем в папку src/css сжатую версию
});

gulp.task('createCustomModernizr', function (done) { // Таск для формирования кастомного modernizr
	modernizr.build(config, function (code) {
		fs.writeFile('src/js/modernizr.min.js', code, done);
	});
});

gulp.task('copyLibsScriptsToJs', ['copyJqueryToJs'], function () { // Таск для мераж js библиотек
	return gulp.src([
		'src/libs/device.js/lib/device.min.js' // определение устройств
		, 'src/libs/jquery-form/dist/jquery.form.min.js' // jquery form для валидации форм
		, 'src/libs/jquery-smartresize/jquery.debouncedresize.js' // "умный" ресайз
		, 'src/libs/jquery-placeholder/jquery.placeholder.min.js' // поддержка плейсхолдера в старых браузерах
		, 'src/libs/select2/dist/js/select2.full.min.js' // кастомный селект
		, 'src/libs/select2/dist/js/i18n/ru.js' // локализация для кастомного селекта
		, 'src/js/temp/filer.min.js' // инпут файл
		, 'src/libs/gsap/src/minified/TweenMax.min.js' // библиотека для создания анимаций
		// ==========sticky-sidebar==========
		, 'src/js/temp/rAF.js' // resize-sensor for "sticky-sidebar.js"
		, 'src/libs/resize-sensor/ResizeSensor.min.js' // resize-sensor for "sticky-sidebar.js"
		, 'src/libs/sticky-sidebar/dist/jquery.sticky-sidebar.min.js' // sticky element on scroll
		// ==========sticky-sidebar==========
		, 'src/libs/slick-carousel/slick/slick.min.js' // slick slider
		, 'node_modules/object-fit-images/dist/ofi.min.js' // object-fit fix for a non-support browsers
		, 'src/libs/matchHeight/dist/jquery.matchHeight-min.js' // скрипт для выравнивания элементов по максимальному
		, 'src/libs/magnific-popup/dist/jquery.magnific-popup.min.js' // Magnific Popup - v1.1.0 - 2016-02-20 http://dimsemenov.com/plugins/magnific-popup/
		, 'src/libs/imagesloaded/imagesloaded.pkgd.min.js' // JavaScript is all like "You images done yet or what?"
	])
		.pipe(concat('libs.js')) // Собираем их в кучу в новом файле libs.min.js
		.pipe(gulp.dest('src/js'))
		.pipe(rename({suffix: '.min'}))
		.pipe(uglify()) // Сжимаем JS файл
		.pipe(gulp.dest('src/js')); // Выгружаем в папку src/js
});

gulp.task('copyJqueryToJs', function () { // Таск для копирования jquery в js папку
	return gulp.src([
		'src/libs/jquery/dist/jquery.min.js'
	])
		.pipe(gulp.dest('src/js'));
});

gulp.task('browserSync', function (done) { // Таск browserSync
	browserSync.init({
		server: {
			baseDir: "./src"
		},
		notify: false // Отключаем уведомления
	});
	browserSync.watch(['src/*.html', 'src/js/**/*.js', 'src/includes/**/*.json', 'src/includes/**/*.svg']).on("change", browserSync.reload);
	done();
});

gulp.task('watch', ['createCustomModernizr', 'browserSync', 'htmlCompilation', 'sassCompilation', 'mergeCssLibs', 'copyLibsScriptsToJs'], function () {
	gulp.watch(['src/_tpl_*.html', 'src/__*.html', 'src/includes/**/*.json', 'src/includes/**/*.svg'], ['htmlCompilation']); // Наблюдение за tpl
	// файлами в папке include
	gulp.watch('src/sass/**/*.+(scss|sass)', ['sassCompilation']); // Наблюдение за sass файлами в папке sass
});

gulp.task('default', ['watch']); // Назначаем таск watch дефолтным

/************************************************************
 * Create Distribution folder and move files to it
 ************************************************************/

gulp.task('copyImgToDist', function () {
	return gulp.src('src/img/**/*')
		.pipe(cache(imagemin({ // Сжимаем их с наилучшими настройками с учетом кеширования
			interlaced: true,
			progressive: true,
			svgoPlugins: [{removeViewBox: false}],
			optimizationLevel: 7, //степень сжатия от 0 до 7
			use: [pngquant()]
		})))
		.pipe(gulp.dest('dist/img')); // Выгружаем на продакшен
});

gulp.task('build', ['cleanDistFolder', 'htmlCompilation', 'copyImgToDist', 'sassCompilation', 'mergeCssLibs', 'createCustomModernizr', 'copyLibsScriptsToJs'], function () {

	gulp.src(['src/css/*.css', 'src/css/*.map'])
	.pipe(gulp.dest('dist/css'));

	gulp.src('src/fonts/**/*') // Переносим шрифты в продакшен
		.pipe(gulp.dest('dist/fonts'));

	gulp.src(['!src/js/temp/**/*.js', '!src/js/**/temp-*.js', 'src/js/*.js']) // Переносим скрипты в продакшен
		.pipe(gulp.dest('dist/js'));

	gulp.src(['!src/__*.html', '!src/forms.html', '!src/_tpl_*.html', 'src/*.html']) // Переносим HTML в продакшен
		.pipe(gulp.dest('dist'));

	gulp.src(['src/*.png', 'src/*.ico', 'src/.htaccess']) // Переносим favicon и др. файлы в продакшин
		.pipe(gulp.dest('dist'));

});

gulp.task('cleanDistFolder', function () {
	return del.sync(['dist/']); // Удаляем папку dist
});

gulp.task('clearCache', function () { // Создаем такс для очистки кэша
	return cache.clearAll();
});