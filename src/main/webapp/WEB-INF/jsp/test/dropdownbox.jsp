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
		
			/* Ukázkový obsah popupu — vlastní "checklist" místo standardní nabídky */
			.demo-checklist { padding: 6px; min-width: 220px; }
			.demo-checklist label { display: flex; align-items: center; gap: 6px; padding: 5px 6px; cursor: pointer; border-radius: 4px; }
			.demo-checklist label:hover { background: var(--qpx-hover, #eceff1); }
			.demo-checklist-footer { padding: 8px 6px 4px; text-align: right; }

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
				<h1>qpDropDownBox – test</h1>
				<p class="subtitle">Pole otvírající POPUP s libovolným vlastním obsahem (contentTemplate) — analogie DevExtreme dxDropDownBox. Nespravuje si vlastní seznam, jen rám pole + popup.</p>
			</header>
			<div class="toolbar-wrap">
				<div id="pageToolbar"></div>
			</div>
			<main>
				<div class="demo-block">
					<h2>1) contentTemplate — vlastní checklist s tlačítkem Hotovo</h2>
					<p class="desc">Obsah popupu je čistý jQuery HTML; component.option("value", ...) a component.close() volá samotný obsah.</p>
					<div id="dropdownbox1"></div>
					<div class="value-out" id="out1"></div>
				</div>
				<div class="demo-block">
					<h2>2) deferRendering: false</h2>
					<p class="desc">Obsah popupu se (na rozdíl od dema 1) vykreslí hned při inicializaci, ne až při prvním otevření.</p>
					<div id="dropdownbox2"></div>
				</div>
				<div class="demo-block">
					<h2>3) dataSource + displayExpr — zobrazení textu bez vlastního seznamu v poli</h2>
					<p class="desc">Popup obsahuje jiný widget (qpSelectBox), pole jen zobrazuje výsledný displayExpr.</p>
					<div id="dropdownbox3"></div>
				</div>
				<div class="demo-block">
					<h2>4) disabled / readOnly</h2>
					<div id="dropdownbox4"></div>
				</div>
			</main>
		</div>

		<script>
			$(function () {
				var fruits = [
					{ id: 1, name: "Jablko" },
					{ id: 2, name: "Hruška" },
					{ id: 3, name: "Banán" },
					{ id: 4, name: "Pomeranč" },
					{ id: 5, name: "Meruňka" }
				];
			
			// -----------------------------------------------------------------
			// 1) vlastní checklist obsah v popupu
			// -----------------------------------------------------------------
			var dropdownbox1 = qpx.ui({
				view: "qpDropDownBox",
				width: 320,
				placeholder: "Vyberte ovoce...",
				showClearButton: true,
				stylingMode: "outlined",
				contentTemplate: function (e, el) {
					var $wrap = $("<div class='demo-checklist'></div>");
					var current = (e.value || "").split(",").filter(Boolean);
					fruits.forEach(function (f) {
						var checked = current.indexOf(f.name) !== -1;
						var $label = $("<label></label>");
						var $cb = $("<input type='checkbox'>").prop("checked", checked).val(f.name);
						$label.append($cb, $("<span></span>").text(f.name));
						$wrap.append($label);
					});
					var $footer = $("<div class='demo-checklist-footer'></div>");
					var $done = qpx.ui({ view: "button", text: "Hotovo", stylingMode: "outlined" });
					$done.on("click", function () {
						var picked = [];
						$wrap.find("input:checked").each(function () { picked.push(this.value); });
						e.component.option("value", picked.join(", "));
						e.component.close();
					});
					$footer.append($done.getContainer());
					$wrap.append($footer);
					
					$(el).append($wrap);
			    },
			    onValueChanged: function (e) {
					$("#out1").text("value: " + JSON.stringify(e.value));
			    }
			}, "#dropdownbox1");
			$("#out1").text("value: " + JSON.stringify(dropdownbox1.value()));
			
			// -----------------------------------------------------------------
			// 2) deferRendering: false
			// -----------------------------------------------------------------
			var renderCount = 0;
			var dropdownbox2 = qpx.ui({
				view: "qpDropDownBox",
				width: 320,
				placeholder: "deferRendering: false",
				deferRendering: false,
				stylingMode: "filled",
				contentTemplate: function (e, el) {
					renderCount++;
					$(el).append($("<div style='padding:14px;'></div>").text("Obsah vykreslen (počet vykreslení: " + renderCount + ")."));
				}
			}, "#dropdownbox2");
			
			// -----------------------------------------------------------------
			// 3) dataSource/displayExpr + vnořený qpSelectBox v popupu
			// -----------------------------------------------------------------
			var dropdownbox3 = qpx.ui({
				view: "qpDropDownBox",
				width: 320,
				dataSource: fruits,
				valueExpr: "id",
				displayExpr: "name",
				placeholder: "Vyberte ovoce (přes SelectBox)...",
				stylingMode: "underlined",
				contentTemplate: function (e, el) {
					 var $wrap = $("<div style='padding:8px;'></div>");
					 $(el).append($wrap);
					 qpx.ui({
						view: "qpSelectBox",
						width: 260,
						dataSource: fruits,
						valueExpr: "id",
						displayExpr: "name",
						value: e.value,
						onValueChanged: function (ev) {
							e.component.option("value", ev.value);
							e.component.close();
						}
				    }, $wrap);
				}
			}, "#dropdownbox3");
			
			// -----------------------------------------------------------------
			// 4) disabled / readOnly
			// -----------------------------------------------------------------
			var dropdownbox4 = qpx.ui({
				view: "qpDropDownBox",
				width: 320,
				dataSource: fruits,
				valueExpr: "id",
				displayExpr: "name",
				value: 3,
				readOnly: true,
				stylingMode: "outlined",
				contentTemplate: function (e, el) { $(el).text("—"); }
			}, "#dropdownbox4");
			
			// -----------------------------------------------------------------
			// Horní panel: přepínač tématu + stylingMode (aplikuje se na všechny 4 instance)
			// -----------------------------------------------------------------
			var allDropDownBoxes = [dropdownbox1, dropdownbox2, dropdownbox3, dropdownbox4];
			
			function applyTheme(themeClass) {
				allDropDownBoxes.forEach(function (db) {
					db.getContainer().removeClass("qpx-theme-generic-light qpx-theme-generic-dark").addClass(themeClass);
				});
				toolbar.option("theme", themeClass.replace("qpx-theme-", ""));
				$("body").toggleClass("qpx-page-dark", themeClass === "qpx-theme-generic-dark");
			}
			
			function applyStylingMode(mode) {
				allDropDownBoxes.forEach(function (db) { db.option("stylingMode", mode); });
			}
			
			var toolbar = qpx.ui({
				view: "qpToolBar",
				theme: "generic-light",
				items: [{
					location: "before", widget: "template",
					template: "<b style='padding:0 4px;'>Styl:</b>"
				}, {
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
				}, {
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
				}]
			}, "#pageToolbar");
			
			applyTheme("qpx-theme-generic-light");
		});
		</script>
	</body>
</html>
