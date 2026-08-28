<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<!DOCTYPE html>
<html lang="cs">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">

		<title>${appTitle}</title>

		<link rel="icon" href="/devel/favicon.png">
		<link rel="stylesheet" href="/devel/libs/fonts/fontawesome/4.7/css/font-awesome.min.css" type="text/css" media="all" />
		<link rel="stylesheet" href="/devel/libs/qpx/themes/jquery.qpx.default.css?build=${ timeNo }" rel="stylesheet" type="text/css">
		<link rel="stylesheet" href="/devel/css/qpx-test.css?build=${timeNo}">
	
		<script type="text/javascript" src="/devel/libs/jquery/jquery-3.7.1.js"></script>
		<script type="text/javascript" src="/devel/libs/qpx/jquery.qpx.all.js"></script>
	</head>
	<body class="qpx-view">
		<div class="qpx-test-topbar">
			<a href="/devel/" class="qpx-back-home" title="Zpět na hlavní stránku">
				<span class="fa fa-home"></span>
			</a>
		</div>
		
		<div class="qpx-test-content">
			<header class="page-head">
				<h1>qpPropertyGrid</h1>
				<p class="subtitle">Funkčnost co nejblíže jQuery EasyUI PropertyGrid — sbalitelné skupiny (group-row), loadData()/getData(), editory jako řetězec i EasyUI-styl { type, options }. Vzhled: Kendo UI Classic (Silver / dark).</p>
			</header>
			<main>
				<div id="styleToolbar"></div>

				<div class="demo-row">
					<h2>1) Sbalitelné skupiny — klik na hlavičku skupiny (collapsible: true)</h2>
					<p class="desc">Skupina "Stav" je zpočátku sbalená (collapsedGroups). Editory: text, number, combobox (EasyUI-styl {type, options}), datebox, switch, checkbox, color.</p>
					<div id="pg"></div>
					<div class="value-out" id="out1"></div>
					<div class="demo-actions">
						<button type="button" id="btnCollapseAll">Sbalit vše</button>
						<button type="button" id="btnExpandAll">Rozbalit vše</button>
						<button type="button" id="btnGetData">getData() → konzole</button>
						<button type="button" id="btnLoadData">loadData(...) — nahradit data</button>
					</div>
				</div>

				<div class="demo-row">
					<h2>2) columns — vlastní hlavička a šířka sloupce Name</h2>
					<p class="desc">columns: [{field:'name', title:'Parametr', width:160}, {field:'value', title:'Nastavení'}]</p>
					<div id="pgColumns"></div>
				</div>

				<div class="demo-row">
					<h2>3) showGroup/groupField (EasyUI aliasy) + collapsible: false</h2>
					<p class="desc">Stejný efekt jako showCategories/categoryField, jen pod EasyUI názvy; skupiny nejsou sbalitelné.</p>
					<div id="pgAlias"></div>
				</div>

				<div class="demo-row">
					<h2>4) readOnly: true — celá mřížka jen ke čtení (formatter u data)</h2>
					<div id="pgReadOnly"></div>
				</div>

				<div class="demo-row">
					<h2>5) showCategories: false, showHeader: false — plochý seznam</h2>
					<div id="pgFlat"></div>
				</div>

				<div class="demo-row">
					<h2>6) disabled: true</h2>
					<div id="pgDisabled"></div>
				</div>
			</main>
		</div>

		<script>
		$(function () {

		    var roles = [
		        { value: "admin", text: "Administrátor" },
		        { value: "user", text: "Uživatel" },
		        { value: "guest", text: "Host" }
		    ];

		    // -----------------------------------------------------------------
		    // 1) hlavní demo — sbalitelné skupiny, kombinace editorů, data jako {rows:[...]}
		    // -----------------------------------------------------------------
		    var pg1 = qpx.ui({
		        view: "qpPropertyGrid",
		        width: 480,
		        collapsedGroups: ["Stav"],
		        data: {
		            rows: [
		                { field: "firstName", label: "Jméno", value: "Josef", editor: "text", category: "Uživatel" },
		                { field: "lastName", label: "Příjmení", value: "Novák", editor: "text", category: "Uživatel" },
		                { field: "age", label: "Věk", value: 42, editor: "numberbox", category: "Uživatel" },
		                { field: "role", label: "Role", value: "admin", category: "Uživatel",
		                    editor: { type: "combobox", options: { data: roles, valueField: "value", textField: "text" } } },
		                { field: "birthDate", label: "Datum narození", value: new Date(1984, 3, 12), editor: "datebox", category: "Uživatel" },

		                { field: "active", label: "Aktivní", value: true, editor: "switch", category: "Stav" },
		                { field: "verified", label: "Ověřen", value: false, editor: "checkbox", category: "Stav" },
		                { field: "tagColor", label: "Barva štítku", value: "#3c78d8", editor: "color", category: "Stav" },
		                { field: "note", label: "Poznámka", value: "VIP zákazník", editor: "text", category: "Stav", readOnly: true }
		            ]
		        },
		        onValueChanged: function (e) {
		            $("#out1").text(e.field + " = " + JSON.stringify(e.value));
		        },
		        onGroupToggle: function (e) {
		            console.log("group toggle:", e.group, "collapsed:", e.collapsed);
		        },
		        onRowClick: function (e) {
		            console.log("row click:", e.item.field);
		        }
		    }, "#pg");

		    $("#btnCollapseAll").on("click", function () { pg1.collapseAll(); });
		    $("#btnExpandAll").on("click", function () { pg1.expandAll(); });
		    $("#btnGetData").on("click", function () { console.log("getData():", pg1.getData()); });
		    $("#btnLoadData").on("click", function () {
		        pg1.loadData([
		            { field: "server", label: "Server", value: "app-01.internal", editor: "text", category: "Nová data" },
		            { field: "port", label: "Port", value: 8443, editor: "numberbox", category: "Nová data" }
		        ]);
		    });

		    // -----------------------------------------------------------------
		    // 2) columns konfigurace
		    // -----------------------------------------------------------------
		    var pg2 = qpx.ui({
		        view: "qpPropertyGrid",
		        width: 480,
		        columns: [
		            { field: "name", title: "Parametr", width: 160 },
		            { field: "value", title: "Nastavení" }
		        ],
		        items: [
		            { field: "width", label: "Šířka", value: 800, editor: "numberbox", category: "Rozměry" },
		            { field: "height", label: "Výška", value: 600, editor: "numberbox", category: "Rozměry" }
		        ]
		    }, "#pgColumns");

		    // -----------------------------------------------------------------
		    // 3) EasyUI aliasy showGroup/groupField, collapsible: false
		    // -----------------------------------------------------------------
		    var pg3 = qpx.ui({
		        view: "qpPropertyGrid",
		        width: 480,
		        showGroup: true,
		        groupField: "grp",
		        collapsible: false,
		        items: [
		            { field: "theme", label: "Téma", value: "Silver", editor: "text", grp: "Vzhled" },
		            { field: "compact", label: "Kompaktní režim", value: false, editor: "switch", grp: "Vzhled" }
		        ]
		    }, "#pgAlias");

		    // -----------------------------------------------------------------
		    // 4) readOnly grid + formatter
		    // -----------------------------------------------------------------
		    var pg4 = qpx.ui({
		        view: "qpPropertyGrid",
		        width: 480,
		        readOnly: true,
		        items: [
		            { field: "id", label: "ID", value: "8f21a-77c", editor: "text", category: "Systém" },
		            { field: "created", label: "Vytvořeno", value: new Date(2026, 7, 27), editor: "datebox", category: "Systém" },
		            { field: "sizeBytes", label: "Velikost", value: 15831040, editor: "numberbox", category: "Systém",
		                formatter: function (value) { return (value / 1024 / 1024).toFixed(1) + " MB"; } },
		            { field: "locked", label: "Uzamčeno", value: true, editor: "switch", category: "Systém" }
		        ]
		    }, "#pgReadOnly");

		    // -----------------------------------------------------------------
		    // 5) plochý seznam bez kategorií a bez hlavičky
		    // -----------------------------------------------------------------
		    var pg5 = qpx.ui({
		        view: "qpPropertyGrid",
		        width: 480,
		        showCategories: false,
		        showHeader: false,
		        items: [
		            { field: "title", label: "Titulek", value: "Nový dokument", editor: "text" },
		            { field: "author", label: "Autor", value: "J. Novák", editor: "text" }
		        ]
		    }, "#pgFlat");

		    // -----------------------------------------------------------------
		    // 6) disabled
		    // -----------------------------------------------------------------
		    var pg6 = qpx.ui({
		        view: "qpPropertyGrid",
		        width: 480,
		        disabled: true,
		        items: [
		            { field: "plan", label: "Tarif", value: "Pro", editor: "text", category: "Účet" },
		            { field: "autoRenew", label: "Automatické prodloužení", value: true, editor: "switch", category: "Účet" }
		        ]
		    }, "#pgDisabled");

		    // -----------------------------------------------------------------
		    // Horní panel: přepínač tématu (světlé/tmavé)
		    // -----------------------------------------------------------------
		    var allGrids = [pg1, pg2, pg3, pg4, pg5, pg6];

		    function applyTheme(themeClass) {
		        allGrids.forEach(function (g) {
		            g.getContainer().removeClass("qpx-theme-generic-light qpx-theme-generic-dark").addClass(themeClass);
		        });
		        toolbar.option("theme", themeClass.replace("qpx-theme-", ""));
		        $("body").toggleClass("qpx-page-dark", themeClass === "qpx-theme-generic-dark");
		    }

		    var toolbar = qpx.ui({
		        view: "qpToolBar",
		        theme: "generic-light",
		        items: [
		            {
		                location: "before", widget: "template",
		                template: "<b style='padding:0 4px;'>Téma:</b>"
		            },
		            {
		                location: "before", widget: "buttonGroup",
		                options: {
		                    items: [
		                        { text: "Světlé (Silver)", key: "generic-light" },
		                        { text: "Tmavé", key: "generic-dark" }
		                    ],
		                    selectedItemKeys: ["generic-light"],
		                    onSelectionChanged: function (e) {
		                        var key = e.component.getSelectedItemKeys()[0] || "generic-light";
		                        applyTheme("qpx-theme-" + key);
		                    }
		                }
		            }
		        ]
		    }, "#styleToolbar");

		    applyTheme("qpx-theme-generic-light");
		});
		</script>
		
		<%-- 
		<div class="qpx-test-content">
			<header class="page-head">
				<h1>qpPropertyGrid</h1>
				<p class="subtitle">Vlastnosti seskupené do kategorií s inline editací (text/number/checkbox/switch/dropdown) — funkčnost inspirována Kendo UI PropertyGrid, vzhled tématem Kendo UI Classic (Silver / dark).</p>
			</header>
			<main>
				<div id="styleToolbar"></div>

				<div class="demo-row">
					<h2>1) Základní použití — kategorie, hlavička, všechny typy editorů</h2>
					<div id="pg"></div>
					<div class="value-out" id="out1"></div>
				</div>

				<div class="demo-row">
					<h2>2) readOnly: true — celá mřížka jen ke čtení</h2>
					<div id="pgReadOnly"></div>
				</div>

				<div class="demo-row">
					<h2>3) showCategories: false, showHeader: false — plochý seznam bez hlavičky</h2>
					<div id="pgFlat"></div>
				</div>

				<div class="demo-row">
					<h2>4) disabled: true</h2>
					<div id="pgDisabled"></div>
				</div>
			</main>
		</div>

		<script>
		$(function () {

		    // -----------------------------------------------------------------
		    // 1) základní demo — kategorie + hlavička + všechny editor typy
		    // -----------------------------------------------------------------
		    var pg1 = qpx.ui({
		        view: "qpPropertyGrid",
		        width: 460,
		        items: [
		            { field: "firstName", label: "Jméno", value: "Josef", editor: "text", category: "Uživatel" },
		            { field: "lastName", label: "Příjmení", value: "Novák", editor: "text", category: "Uživatel" },
		            { field: "age", label: "Věk", value: 42, editor: "number", category: "Uživatel" },
		            { field: "role", label: "Role", value: "admin", editor: "dropdown", category: "Uživatel", dataSource: [
		                { key: "admin", text: "Administrátor" },
		                { key: "user", text: "Uživatel" },
		                { key: "guest", text: "Host" }
		            ] },

		            { field: "active", label: "Aktivní", value: true, editor: "switch", category: "Stav" },
		            { field: "verified", label: "Ověřen", value: false, editor: "checkbox", category: "Stav" },
		            { field: "note", label: "Poznámka", value: "VIP zákazník", editor: "text", category: "Stav", readOnly: true }
		        ],
		        onValueChanged: function (e) {
		            $("#out1").text(e.field + " = " + JSON.stringify(e.value));
		        }
		    }, "#pg");

		    // -----------------------------------------------------------------
		    // 2) readOnly grid
		    // -----------------------------------------------------------------
		    var pg2 = qpx.ui({
		        view: "qpPropertyGrid",
		        width: 460,
		        readOnly: true,
		        items: [
		            { field: "id", label: "ID", value: "8f21a-77c", editor: "text", category: "Systém" },
		            { field: "created", label: "Vytvořeno", value: "27.08.2026", editor: "text", category: "Systém" },
		            { field: "locked", label: "Uzamčeno", value: true, editor: "switch", category: "Systém" }
		        ]
		    }, "#pgReadOnly");

		    // -----------------------------------------------------------------
		    // 3) plochý seznam bez kategorií a bez hlavičky
		    // -----------------------------------------------------------------
		    var pg3 = qpx.ui({
		        view: "qpPropertyGrid",
		        width: 460,
		        showCategories: false,
		        showHeader: false,
		        items: [
		            { field: "width", label: "Šířka", value: 800, editor: "number" },
		            { field: "height", label: "Výška", value: 600, editor: "number" },
		            { field: "title", label: "Titulek", value: "Nový dokument", editor: "text" }
		        ]
		    }, "#pgFlat");

		    // -----------------------------------------------------------------
		    // 4) disabled
		    // -----------------------------------------------------------------
		    var pg4 = qpx.ui({
		        view: "qpPropertyGrid",
		        width: 460,
		        disabled: true,
		        items: [
		            { field: "plan", label: "Tarif", value: "Pro", editor: "text", category: "Účet" },
		            { field: "autoRenew", label: "Automatické prodloužení", value: true, editor: "switch", category: "Účet" }
		        ]
		    }, "#pgDisabled");

		    // -----------------------------------------------------------------
		    // Horní panel: přepínač tématu (světlé/tmavé) — aplikuje se na
		    // všechny instance na této stránce
		    // -----------------------------------------------------------------
		    var allGrids = [pg1, pg2, pg3, pg4];

		    function applyTheme(themeClass) {
		        allGrids.forEach(function (g) {
		            g.getContainer().removeClass("qpx-theme-generic-light qpx-theme-generic-dark").addClass(themeClass);
		        });
		        toolbar.option("theme", themeClass.replace("qpx-theme-", ""));
		        $("body").toggleClass("qpx-page-dark", themeClass === "qpx-theme-generic-dark");
		    }

		    var toolbar = qpx.ui({
		        view: "qpToolBar",
		        theme: "generic-light",
		        items: [
		            {
		                location: "before", widget: "template",
		                template: "<b style='padding:0 4px;'>Téma:</b>"
		            },
		            {
		                location: "before", widget: "buttonGroup",
		                options: {
		                    items: [
		                        { text: "Světlé (Silver)", key: "generic-light" },
		                        { text: "Tmavé", key: "generic-dark" }
		                    ],
		                    selectedItemKeys: ["generic-light"],
		                    onSelectionChanged: function (e) {
		                        var key = e.component.getSelectedItemKeys()[0] || "generic-light";
		                        applyTheme("qpx-theme-" + key);
		                    }
		                }
		            }
		        ]
		    }, "#styleToolbar");

		    applyTheme("qpx-theme-generic-light");
		});
		</script>
		--%>
	</body>
</html>
