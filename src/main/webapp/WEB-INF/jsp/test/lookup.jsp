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
				text-decoration: none;
				padding: 6px 10px;
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
		<div style="height: 36px; position: absolute; top: 0; left: 0; right: 0; border-bottom: 1px solid &dedede;">
			<a href="/devel/" class="qpx-back-home" title="Zpět na hlavní stránku">
				<span class="fa fa-home"></span>
			</a>
		</div>
		<div style="min-height: 320px; position: absolute; top: 36px; left: 0; right: 0; border: 0; border: 0px solid red;">

			<header class="page-head">
				<h1>qpLookup – test</h1>
				<p class="subtitle">Výběr položky přes vystředěný popup s vyhledáváním v hlavičce — analogie DevExtreme dxLookup. Na rozdíl od qpSelectBox se neotvírá jako úzký dropdown pod polem.</p>
			</header>
			<div class="toolbar-wrap">
				<div id="pageToolbar"></div>
			</div>
			<main>
				<div class="demo-block">
					<h2>1) Základní použití — applyValueMode: "instantly"</h2>
					<p class="desc">valueExpr: "id", displayExpr: "name", klik na položku hodnotu ihned uloží a popup zavře.</p>
					<div id="lookup1"></div>
					<div class="value-out" id="out1"></div>
				</div>
				<div class="demo-block">
					<h2>2) applyValueMode: "useButtons"</h2>
					<p class="desc">Výběr se potvrzuje tlačítkem „Hotovo“ v patičce popupu, „Zrušit“ zahodí rozpracovanou volbu.</p>
					<div id="lookup2"></div>
				</div>
				<div class="demo-block">
					<h2>3) searchEnabled: false — bez vyhledávání</h2>
					<p class="desc">Hlavička popupu nemá vyhledávací pole, jen titulek a zavírací křížek.</p>
					<div id="lookup3"></div>
				</div>
				<div class="demo-block">
					<h2>4) disabled / readOnly</h2>
					<div id="lookup4"></div>
				</div>
			</main>
		</div>

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
		    // 1) základní demo — instantly
		    // -----------------------------------------------------------------
		    var lookup1 = qpx.ui({
		        view: "qpLookup",
		        width: 320,
		        dataSource: countries,
		        valueExpr: "id",
		        displayExpr: "name",
		        value: 1,
		        title: "Vyberte zemi",
		        placeholder: "Vyberte zemi...",
		        showClearButton: true,
		        stylingMode: "outlined",
		        onValueChanged: function (e) {
		            $("#out1").text("value: " + JSON.stringify(e.value));
		        }
		    }, "#lookup1");
		    $("#out1").text("value: " + JSON.stringify(lookup1.value()));
		
		    // -----------------------------------------------------------------
		    // 2) useButtons
		    // -----------------------------------------------------------------
		    var lookup2 = qpx.ui({
		        view: "qpLookup",
		        width: 320,
		        dataSource: countries,
		        valueExpr: "id",
		        displayExpr: "name",
		        title: "Vyberte zemi (s potvrzením)",
		        applyValueMode: "useButtons",
		        stylingMode: "filled"
		    }, "#lookup2");
		
		    // -----------------------------------------------------------------
		    // 3) bez vyhledávání
		    // -----------------------------------------------------------------
		    var lookup3 = qpx.ui({
		        view: "qpLookup",
		        width: 320,
		        dataSource: ["JavaScript", "TypeScript", "Java", "Python", "Go"],
		        title: "Vyberte jazyk",
		        searchEnabled: false,
		        stylingMode: "underlined"
		    }, "#lookup3");
		
		    // -----------------------------------------------------------------
		    // 4) disabled / readOnly
		    // -----------------------------------------------------------------
		    var lookup4 = qpx.ui({
		        view: "qpLookup",
		        width: 320,
		        dataSource: countries,
		        valueExpr: "id",
		        displayExpr: "name",
		        value: 7,
		        readOnly: true,
		        stylingMode: "outlined"
		    }, "#lookup4");
		
		    // -----------------------------------------------------------------
		    // Horní panel: přepínač tématu + stylingMode (aplikuje se na všechny 4 instance)
		    // -----------------------------------------------------------------
		    var allLookups = [lookup1, lookup2, lookup3, lookup4];
		
		    function applyTheme(themeClass) {
		        allLookups.forEach(function (lk) {
		            lk.getContainer().removeClass("qpx-theme-generic-light qpx-theme-generic-dark").addClass(themeClass);
		        });
		        toolbar.option("theme", themeClass.replace("qpx-theme-", ""));
		        $("body").toggleClass("qpx-page-dark", themeClass === "qpx-theme-generic-dark");
		    }
		
		    function applyStylingMode(mode) {
		        allLookups.forEach(function (lk) { lk.option("stylingMode", mode); });
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
