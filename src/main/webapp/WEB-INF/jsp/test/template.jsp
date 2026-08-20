<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix = "c" uri = "http://java.sun.com/jsp/jstl/core" %>
<%
System.out.println("/devel/template.jsp");
%>
<!DOCTYPE html>
<html lang="cs">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">

		<title>qpx — template</title>

		<link rel="icon" href="/devel/favicon.png">
		<link rel="stylesheet" href="/devel/libs/qpx/themes/jquery.qpx.default.css?build=${ timeNo }" rel="stylesheet" type="text/css">

		<style type="text/css">
			html, body { font-family: "Segoe UI", Arial, sans-serif; font-size: 12px; margin: 0; background:#f4f6f8; color:#222; }
			h1 { font-size: 20px; padding: 16px 20px 4px; }
			h2 { font-size: 15px; margin: 24px 20px 8px; color:#555; }
			section { margin: 0 20px 20px; background:#fff; border:1px solid #e2e6ea; border-radius:6px; padding:16px; }
			.box { border:1px solid #dfe3e8; padding:10px; }
			.row { display:flex; gap:10px; margin-bottom:10px; }
		</style>

		<script type="text/javascript" src="/devel/libs/jquery/jquery-3.7.1.js"></script>
		<script type="text/javascript" src="/devel/libs/qpx/jquery.qpx.all.js"></script>
	</head>
	<body data-theme="light">

		<h1>qpx.Template — testovací stránka</h1>

		<!-- ============================================================ -->
		<h2>1) String šablona s proměnnými #var# a {var}</h2>
		<section>
			<div id="basic" class="box"></div>
			<div class="row" style="margin-top:10px;">
				<button id="btnSetValues" type="button">setValues(nová data)</button>
			</div>
		</section>

		<!-- ============================================================ -->
		<h2>2) Šablona jako funkce (výpis pole)</h2>
		<section>
			<div id="listTpl" class="box"></div>
		</section>

		<!-- ============================================================ -->
		<h2>3) setHTML() a event afterrender/change</h2>
		<section>
			<div id="htmlTpl" class="box"></div>
			<div id="log3" style="margin-top:10px; font-family:monospace; font-size:12px; color:#666;"></div>
		</section>

		<!-- ============================================================ -->
		<h2>4) Deklarativně přes data-qpx-* atributy</h2>
		<section>
			<div data-qpx-view="template"
				data-qpx-template="&lt;b&gt;#title#&lt;/b&gt;: #text#"
				data-qpx-data='{"title":"Deklarativně","text":"Vzniklo z HTML atributů."}'
				class="box">
			</div>
		</section>

		<script>
		$(function () {
			var basic = qpx.ui({
				view: "template",
				template: "Uživatel: <b>#user#</b>, vnořená cesta: <i>{profile.city}</i>",
				data: { user: "Petr", profile: { city: "Praha" } }
			}, "#basic");

			$("#btnSetValues").on("click", function () {
				basic.setValues({ user: "Jana", profile: { city: "Brno" } });
			});

			qpx.ui({
				view: "template",
				template: function (data) {
					return "<ul>" + data.items.map(function (i) {
						return "<li>" + i + "</li>";
					}).join("") + "</ul>";
				},
				data: { items: ["Položka A", "Položka B", "Položka C"] }
			}, "#listTpl");

			var htmlTpl = qpx.ui({
				view: "template",
				template: "počáteční obsah"
			}, "#htmlTpl");

			htmlTpl.on("afterrender", function () { $("#log3").text("afterrender: " + new Date().toLocaleTimeString()); });
			htmlTpl.on("change", function (data) { console.log("change:", data); });

			setTimeout(function () {
				htmlTpl.setHTML("<b>Vloženo přes setHTML() po 1s</b>");
			}, 1000);
		});
		</script>
	</body>
</html>
