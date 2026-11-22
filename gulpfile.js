// Gulp workflow for Blood-Lagbe
//   npx gulp          build once (SCSS -> CSS, plus a minified copy)
//   npx gulp watch    rebuild automatically while editing .scss files
const gulp = require("gulp");
const sass = require("gulp-sass")(require("sass"));
const sourcemaps = require("gulp-sourcemaps");
const cleanCSS = require("gulp-clean-css");
const rename = require("gulp-rename");

const paths = {
    scss: "client/scss/**/*.scss",
    entry: "client/scss/main.scss",
    out: "client/css"
};

function styles() {
    return gulp
        .src(paths.entry)
        .pipe(sourcemaps.init())
        .pipe(sass.sync({ outputStyle: "expanded" }).on("error", sass.logError))
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest(paths.out));
}

function minify() {
    return gulp
        .src(`${paths.out}/main.css`)
        .pipe(cleanCSS())
        .pipe(rename({ suffix: ".min" }))
        .pipe(gulp.dest(paths.out));
}

function watch() {
    gulp.watch(paths.scss, gulp.series(styles, minify));
}

exports.styles = styles;
exports.minify = minify;
exports.watch = gulp.series(styles, minify, watch);
exports.default = gulp.series(styles, minify);