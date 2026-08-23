<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix = "c" uri = "http://java.sun.com/jsp/jstl/core" %>
<%
System.out.println("/devel/button.jsp");
%>
<!DOCTYPE html>
<html lang="cs">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">

		<title>${appTitle}</title>
		
		<link rel="icon" href="/devel/favicon.png">
		<link rel="stylesheet" href="/devel/libs/qpx/themes/jquery.qpx.default.css?build=${ timeNo }" rel="stylesheet" type="text/css">

		<style type="text/css">
			html, body { font-family: "Segoe UI", Arial, sans-serif; font-size: 12px; margin: 0; background:#f4f6f8; color:#222; }
			h1 { font-size: 20px; padding: 16px 20px 4px; }
			h2 { font-size: 15px; margin: 24px 20px 8px; color:#555; }
			section { margin: 0 20px 20px; background:#fff; border:1px solid #e2e6ea; border-radius:6px; padding:16px; }
			.row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:10px; }
			.log { margin-top:10px; padding:8px 12px; background:#1e1e1e; color:#9cdcfe; font-family:monospace; font-size:12px; min-height:20px; border-radius:4px; }
			code.inline { background:#eef1f4; padding:1px 5px; border-radius:3px; }
		</style>

		<script type="text/javascript" src="/devel/libs/jquery/jquery-3.7.1.js"></script>
		<script type="text/javascript" src="/devel/libs/qpx/jquery.qpx.all.js"></script>
	</head>
	<body data-theme="light">

		<h1>qpx.Button — testovací stránka</h1>

		<!-- ============================================================ -->
		<h2>1) Základní varianty (type / stylingMode)</h2>
		<section>
			<div id="basicRow" class="row"></div>
			<div id="log1" class="log">Klikni na tlačítko...</div>
		</section>

		<!-- ============================================================ -->
		<h2>2) Ikona, hint, disabled/enabled přepínání</h2>
		<section>
			<div id="iconRow" class="row"></div>
			<div class="row">
				<button id="toggleDisabled" type="button">option("disabled", !disabled)</button>
				<button id="toggleText" type="button">option("text", ...)</button>
			</div>
		</section>

		<!-- ============================================================ -->
		<h2>3) Vlastní <code class="inline">template</code></h2>
		<section>
			<div id="templateRow" class="row"></div>
		</section>

		<!-- ============================================================ -->
		<h2>4) Deklarativně přes data-qpx-* atributy</h2>
		<section>
			<div data-qpx-view="button" data-qpx-text="Deklarativní tlačítko" data-qpx-type="default"></div>
		</section>

		<script>
		$(function () {
			function log(sel, msg) { $(sel).text(msg); }

			// -- 1) základní varianty --
			["normal", "default", "success", "danger", "warning"].forEach(function (type) {
				qpx.ui({
					view: "button",
					text: type,
					type: type,
					onClick: function (e) { log("#log1", "click: type=" + e.component.option("type")); }
				}, $("<div></div>").appendTo("#basicRow"));
			});
			["contained", "outlined", "text"].forEach(function (mode) {
				qpx.ui({
					view: "button",
					text: "mode: " + mode,
					stylingMode: mode,
					onClick: function (e) { log("#log1", "click: stylingMode=" + e.component.option("stylingMode")); }
				}, $("<div></div>").appendTo("#basicRow"));
			});

			// -- 2) ikona / hint / disabled --
			var iconBtn = qpx.ui({
				view: "button",
				text: "Uložit",
				icon: "💾",
				hint: "Uloží aktuální záznam",
				type: "success",
				onOptionChanged: function (e) { console.log("optionChanged:", e.name, "->", e.value); }
			}, $("<div></div>").appendTo("#iconRow"));

			$("#toggleDisabled").on("click", function () {
				iconBtn.option("disabled") ? iconBtn.enable() : iconBtn.disable();
			});
			$("#toggleText").on("click", function () {
				iconBtn.option("text", "Text: " + new Date().toLocaleTimeString());
			});

			// -- 3) vlastní template --
			qpx.ui({
				view: "button",
				stylingMode: "outlined",
				template: function (cfg, $el) {
					$el.html("<b style='color:#c0392b;'>★</b> Vlastní obsah tlačítka");
				},
				onClick: function () { console.log("klik na tlačítko s vlastním template"); }
			}, $("<div></div>").appendTo("#templateRow"));
		});
		</script>
	</body>
</html>
