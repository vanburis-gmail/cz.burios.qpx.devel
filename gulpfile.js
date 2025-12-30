const gulp = require('gulp');
const concat = require('gulp-concat');

// Definice úkolu pro sestavení JS
gulp.task('build-js', function() {
	return gulp.src([
		// Zde definujte soubory v PŘESNÉM pořadí, jak mají jít za sebou
		"src/main/webapp/libs/qpx/src/qpClass.js",
		"src/main/webapp/libs/qpx/src/qpEvents.js",
		"src/main/webapp/libs/qpx/src/qpRegistry.js",
		"src/main/webapp/libs/qpx/src/qpMixin.js",
		"src/main/webapp/libs/qpx/src/qpWidget.js",
		"src/main/webapp/libs/qpx/src/qpDefine.js",
		/*
		"src/main/webapp/libs/qpx/src/qpCore.js",
		*/
		"src/main/webapp/libs/qpx/src/qpWidgetFactory.js",
		"src/main/webapp/libs/qpx/src/qpOverflowWidget.js",
		"src/main/webapp/libs/qpx/src/qpButton.js",
		"src/main/webapp/libs/qpx/src/qpDropdownMenu.js",
		"src/main/webapp/libs/qpx/src/qpToolBar.js",
		"src/main/webapp/libs/qpx/src/qpTabs.js",
		"src/main/webapp/libs/qpx/src/qpDataGrid.js",
		"src/main/webapp/libs/qpx/src/qpDataGridHeader.js",
		"src/main/webapp/libs/qpx/src/qpDataGridHeaderCell.js",
		"src/main/webapp/libs/qpx/src/qpDataGridRow.js"
	])
	.pipe(concat('jquery.qpx.all.js')) // Název výsledného souboru
	.pipe(gulp.dest('src/main/webapp/libs/qpx/')); // Cílová složka
});