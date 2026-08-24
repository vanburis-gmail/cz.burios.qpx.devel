<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" language="java" %>
<!DOCTYPE html>
<html lang="cs">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">

		<title>${appTitle}</title>

		<link rel="icon" href="/devel/favicon.png">
		<link rel="stylesheet" href="/devel/libs/fonts/fontawesome/4.7/css/font-awesome.min.css" type="text/css" media="all" />
		<link rel="stylesheet" href="/devel/libs/qpx/themes/jquery.qpx.light.css?build=${ timeNo }" rel="stylesheet" type="text/css">

		<style>
			body.qpx-page-dark { background: #1b1b1b; color: #eee; }
			header.page-head { padding: 18px 24px 6px; }
			h1 { font-size: 18px; margin: 0 0 4px; }
			.subtitle { color: #767676; font-size: 12px; margin: 0; }

			.toolbar-wrap { margin: 12px 24px 4px; }

			main { padding: 8px 24px 60px; max-width: 760px; }

			.demo-block { margin: 26px 0; }
			.demo-block h2 { font-size: 14px; margin: 0 0 4px; }
			.demo-block .desc { font-size: 12px; color: #767676; margin: 0 0 10px; }
			body.qpx-page-dark .demo-block .desc { color: #a3a3a3; }

			.value-out {
				margin-top: 8px;
				font-family: monospace;
				font-size: 11px;
				padding: 6px 8px;
				border-radius: 4px;
				background: #eef4fb;
				color: #333;
			}
			body.qpx-page-dark .value-out { background: #333; color: #e6e6e6; }
			.qpx-back-home {
				font-size: 20px;
				color: #444;
				text-decoration: none;
				z-index: 9999;
				padding: 6px 10px;
				background: rgba(255,255,255,0.85);
				border-radius: 6px;
			}
			.qpx-back-home:hover {
				background: #fff;
				color: #000;
			}
		</style>

		<script type="text/javascript" src="/devel/libs/jquery/jquery-3.7.1.js"></script>
		<script type="text/javascript" src="/devel/libs/qpx/jquery.qpx.all.js"></script>
	</head>
	<body class="qpx-view">
		<!-- návratová ikona vlevo nahoře -->
		<div style="height: 32px; position: absolute; top: 0; left: 0; right: 0; border: 1px solid red;">
			<a href="/devel/" class="qpx-back-home" title="Zpět na hlavní stránku">
				<span class="fa fa-home"></span>
			</a>
		</div>
		<div style="min-height: 320px; position: absolute; top: 36px; left: 0; right: 0; border: 0; border: 1px solid red;">
			<header class="page-head">
				<h1>qpTextBox – test</h1>
				<p class="subtitle">Jednořádkové textové pole — analogie DevExtreme dxTextBox.</p>
			</header>
			<div class="toolbar-wrap">
				<div id="pageToolbar"></div>
			</div>
			<main>
				<div class="demo-block">
					<h2>1) Základní použití — showClearButton</h2>
					<p class="desc">placeholder, showClearButton, onValueChanged.</p>
					<div id="textbox1"></div>
					<div class="value-out" id="out1"></div>
				</div>
				<div class="demo-block">
					<h2>2) mode: "password"</h2>
					<p class="desc">Skryté zadávání hesla.</p>
					<div id="textbox2"></div>
				</div>
				<div class="demo-block">
					<h2>3) maxLength + valueChangeEvent: "input"</h2>
					<p class="desc">Hodnota (a event onValueChanged) se aktualizuje při každém stisku klávesy, max. 12 znaků.</p>
					<div id="textbox3"></div>
					<div class="value-out" id="out3"></div>
				</div>
				<div class="demo-block">
					<h2>4) disabled / readOnly</h2>
					<div id="textbox4"></div>
					<div id="textbox4b" style="margin-top: 8px;"></div>
				</div>
			</main>
		</div>

		<script>
		$(function () {
		    // -----------------------------------------------------------------
		    // 1) základní demo
		    // -----------------------------------------------------------------
		    var textbox1 = qpx.ui({
		        view: "qpTextBox",
		        width: 320,
		        value: "Ahoj světe",
		        placeholder: "Zadejte text...",
		        showClearButton: true,
		        stylingMode: "outlined",
		        onValueChanged: function (e) {
		            $("#out1").text("value: " + JSON.stringify(e.value));
		        }
		    }, "#textbox1");
		    $("#out1").text("value: " + JSON.stringify(textbox1.value()));

		    // -----------------------------------------------------------------
		    // 2) heslo
		    // -----------------------------------------------------------------
		    var textbox2 = qpx.ui({
		        view: "qpTextBox",
		        width: 320,
		        mode: "password",
		        placeholder: "Heslo...",
		        showClearButton: true,
		        stylingMode: "filled"
		    }, "#textbox2");

		    // -----------------------------------------------------------------
		    // 3) maxLength + valueChangeEvent: "input"
		    // -----------------------------------------------------------------
		    var textbox3 = qpx.ui({
		        view: "qpTextBox",
		        width: 320,
		        placeholder: "Max. 12 znaků...",
		        maxLength: 12,
		        valueChangeEvent: "input",
		        stylingMode: "underlined",
		        onValueChanged: function (e) {
		            $("#out3").text("value: " + JSON.stringify(e.value) + " (" + e.value.length + "/12)");
		        }
		    }, "#textbox3");
		    $("#out3").text("value: \"\" (0/12)");

		    // -----------------------------------------------------------------
		    // 4) disabled / readOnly
		    // -----------------------------------------------------------------
		    var textbox4 = qpx.ui({
		        view: "qpTextBox",
		        width: 320,
		        value: "Needitovatelné pole",
		        disabled: true,
		        stylingMode: "outlined"
		    }, "#textbox4");

		    var textbox4b = qpx.ui({
		        view: "qpTextBox",
		        width: 320,
		        value: "Jen ke čtení",
		        readOnly: true,
		        stylingMode: "outlined"
		    }, "#textbox4b");

		    // -----------------------------------------------------------------
		    // Horní panel: přepínač tématu + stylingMode (aplikuje se na všechny instance)
		    // -----------------------------------------------------------------
		    var allTextBoxes = [textbox1, textbox2, textbox3, textbox4, textbox4b];

		    function applyTheme(themeClass) {
		        allTextBoxes.forEach(function (tb) {
		            tb.getContainer().removeClass("qpx-theme-generic-light qpx-theme-generic-dark").addClass(themeClass);
		        });
		        toolbar.option("theme", themeClass.replace("qpx-theme-", ""));
		        $("body").toggleClass("qpx-page-dark", themeClass === "qpx-theme-generic-dark");
		    }

		    function applyStylingMode(mode) {
		        allTextBoxes.forEach(function (tb) { tb.option("stylingMode", mode); });
		    }

		    var toolbar = qpx.ui({
		        view: "qpToolBar",
		        theme: "generic-light",
		        items: [
		            {
		                location: "before", widget: "template",
		                template: "<b style='padding:0 4px;'>Styl:</b>"
		            },
		            {
		                location: "before", widget: "buttonGroup",
		                options: {
		                    items: [
		                        { text: "Světlé", key: "generic-light" },
		                        { text: "Tmavé", key: "generic-dark" }
		                    ],
		                    selectedItemKeys: ["generic-light"],
		                    onSelectionChanged: function (e) {
		                        var key = e.component.getSelectedItemKeys()[0] || "generic-light";
		                        applyTheme("qpx-theme-" + key);
		                    }
		                }
		            },
		            {
		                location: "after", widget: "buttonGroup",
		                options: {
		                    items: [
		                        { text: "outlined", key: "outlined" },
		                        { text: "filled", key: "filled" },
		                        { text: "underlined", key: "underlined" }
		                    ],
		                    selectedItemKeys: ["outlined"],
		                    onSelectionChanged: function (e) {
		                        var mode = e.component.getSelectedItemKeys()[0] || "outlined";
		                        applyStylingMode(mode);
		                    }
		                }
		            }
		        ]
		    }, "#pageToolbar");

		    applyTheme("qpx-theme-generic-light");
		});
		</script>
	</body>
</html>
