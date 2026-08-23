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
    html, body {
        margin: 0;
        font-family: "Segoe UI", Arial, sans-serif;
        font-size: 13px;
        background: #f4f6f8;
        color: #222;
    }
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
			position: fixed;
			top: 8px;
			left: 8px;
			font-size: 20px;
			color: #444;
			text-decoration: none;
			z-index: 9999;
			padding: 6px 10px;
			background: rgba(255,255,255,0.85);
			border-radius: 6px;
			box-shadow: 0 0 4px rgba(0,0,0,0.2);
		}
		.qpx-back-home:hover {
			background: #fff;
			color: #000;
		}	
		</style>

		<script type="text/javascript" src="/devel/libs/jquery/jquery-3.7.1.js"></script>
		<script type="text/javascript" src="/devel/libs/qpx/jquery.qpx.all.js"></script>
	</head>
	<body>
		<!-- návratová ikona vlevo nahoře -->
		<div>
			<a href="/devel/" class="qpx-back-home" title="Zpět na hlavní stránku">
				<span class="fa fa-home"></span>
			</a>
		</div>

<header class="page-head">
    <h1>qpAutocomplete – test</h1>
    <p class="subtitle">Textové pole s automatickým našeptáváním — analogie DevExtreme dxAutocomplete. Hodnotou je vždy zadaný text, položka z nabídky ho jen doplní.</p>
</header>

<div class="toolbar-wrap">
    <div id="pageToolbar"></div>
</div>

<main>

    <div class="demo-block">
        <h2>1) Základní použití — dataSource z objektů</h2>
        <p class="desc">displayExpr: "name", minSearchLength: 1, showClearButton.</p>
        <div id="autocomplete1"></div>
        <div class="value-out" id="out1"></div>
    </div>

    <div class="demo-block">
        <h2>2) maxItemCount</h2>
        <p class="desc">Nabídka je omezena na max. 4 zobrazené položky, i když jich vyhovuje víc.</p>
        <div id="autocomplete2"></div>
    </div>

    <div class="demo-block">
        <h2>3) onSelectionChanged / onEnterKey</h2>
        <p class="desc">Odlišení, zda hodnota vznikla výběrem položky, nebo jen volným zadáním textu.</p>
        <div id="autocomplete3"></div>
        <div class="value-out" id="out3"></div>
    </div>

    <div class="demo-block">
        <h2>4) disabled / readOnly</h2>
        <div id="autocomplete4"></div>
    </div>

</main>

<script>
$(function () {

    var countries = [
        { id: 1, name: "Česko" },
        { id: 2, name: "Slovensko" },
        { id: 3, name: "Rakousko" },
        { id: 4, name: "Německo" },
        { id: 5, name: "Polsko" },
        { id: 6, name: "Maďarsko" },
        { id: 7, name: "Francie" },
        { id: 8, name: "Itálie" },
        { id: 9, name: "Španělsko" },
        { id: 10, name: "Portugalsko" },
        { id: 11, name: "Nizozemsko" },
        { id: 12, name: "Belgie" }
    ];

    // -----------------------------------------------------------------
    // 1) základní demo
    // -----------------------------------------------------------------
    var autocomplete1 = qpx.ui({
        view: "qpAutocomplete",
        width: 320,
        dataSource: countries,
        displayExpr: "name",
        placeholder: "Začněte psát zemi...",
        minSearchLength: 1,
        showClearButton: true,
        stylingMode: "outlined",
        onValueChanged: function (e) {
            $("#out1").text("value: " + JSON.stringify(e.value));
        }
    }, "#autocomplete1");
    $("#out1").text("value: " + JSON.stringify(autocomplete1.value()));

    // -----------------------------------------------------------------
    // 2) maxItemCount
    // -----------------------------------------------------------------
    var autocomplete2 = qpx.ui({
        view: "qpAutocomplete",
        width: 320,
        dataSource: countries,
        displayExpr: "name",
        minSearchLength: 0,
        maxItemCount: 4,
        stylingMode: "filled"
    }, "#autocomplete2");

    // -----------------------------------------------------------------
    // 3) onSelectionChanged vs. volný text
    // -----------------------------------------------------------------
    var autocomplete3 = qpx.ui({
        view: "qpAutocomplete",
        width: 320,
        dataSource: ["JavaScript", "TypeScript", "Java", "Python", "Go"],
        value: "JavaScript",
        minSearchLength: 0,
        stylingMode: "underlined",
        onSelectionChanged: function (e) {
            $("#out3").text("vybráno ze seznamu: " + e.item);
        },
        onValueChanged: function (e) {
            if ($("#out3").text().indexOf(e.value) === -1) {
                $("#out3").text("volný text: " + e.value);
            }
        }
    }, "#autocomplete3");
    $("#out3").text("volný text: " + autocomplete3.value());

    // -----------------------------------------------------------------
    // 4) disabled / readOnly
    // -----------------------------------------------------------------
    var autocomplete4 = qpx.ui({
        view: "qpAutocomplete",
        width: 320,
        dataSource: countries,
        displayExpr: "name",
        value: "Francie",
        readOnly: true,
        stylingMode: "outlined"
    }, "#autocomplete4");

    // -----------------------------------------------------------------
    // Horní panel: přepínač tématu + stylingMode (aplikuje se na všechny 4 instance)
    // -----------------------------------------------------------------
    var allAutocompletes = [autocomplete1, autocomplete2, autocomplete3, autocomplete4];

    function applyTheme(themeClass) {
        allAutocompletes.forEach(function (ac) {
            ac.getContainer().removeClass("qpx-theme-generic-light qpx-theme-generic-dark").addClass(themeClass);
        });
        toolbar.option("theme", themeClass.replace("qpx-theme-", ""));
        $("body").toggleClass("qpx-page-dark", themeClass === "qpx-theme-generic-dark");
    }

    function applyStylingMode(mode) {
        allAutocompletes.forEach(function (ac) { ac.option("stylingMode", mode); });
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
