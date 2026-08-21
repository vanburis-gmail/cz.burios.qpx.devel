<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix = "c" uri = "http://java.sun.com/jsp/jstl/core" %>
<%
System.out.println("/devel/toolbar.jsp");
%>
<!DOCTYPE html>
<html lang="cs">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">

		<title>qpx — qpToolBar</title>

		<link rel="icon" href="/devel/favicon.png">
		<link rel="stylesheet" href="/devel/libs/qpx/themes/jquery.qpx.default.css?build=${ timeNo }" rel="stylesheet" type="text/css">

		<style type="text/css">
			html, body { font-family: "Segoe UI", Arial, sans-serif; font-size: 12px; margin: 0; background:#f4f6f8; color:#222; }
			h1 { font-size: 20px; padding: 16px 20px 4px; }
			h2 { font-size: 15px; margin: 24px 20px 8px; color:#555; }
			section { margin: 0 20px 20px; background:#fff; border:1px solid #e2e6ea; border-radius:6px; overflow:hidden; }
			.log { margin:0 16px 16px; padding:8px 12px; background:#1e1e1e; color:#9cdcfe; font-family:monospace; font-size:12px; min-height:20px; border-radius:4px; }
		</style>

		<script type="text/javascript" src="/devel/libs/jquery/jquery-3.7.1.js"></script>
		<script type="text/javascript" src="/devel/libs/qpx/jquery.qpx.all.js"></script>
	</head>
	<body data-theme="light">

		<h1>QPX qpToolBar — testovací stránka</h1>

		<!-- ============================================================ -->
		<h2>qpToolBar s položkami všech typů, responzivní přetečení do menu</h2>
		<section style="padding:0;">
			<div style="padding:10px 16px 0;">
				<label><input type="checkbox" id="themeToggle"> tmavé téma (generic-dark)</label>
				&nbsp;·&nbsp;
				<label><input type="checkbox" id="disabledToggle"> disabled</label>
				&nbsp;·&nbsp;
				<label>šířka panelu: <input type="range" id="toolbarWidth" min="260" max="900" value="900" style="vertical-align:middle;"></label>
				<span style="color:#888; font-size:12px;">(zužte panel a sledujte přesun položek do menu „⋮“)</span>
			</div>
			<div id="toolbarWrap" style="width:900px; max-width:100%; margin:10px 16px 16px; border:1px solid #dfe3e8;">
				<div id="app0"></div>
			</div>
			<div id="toolbarLog" class="log">Klikni na položky toolbaru — události se vypíší sem...</div>
		</section>

		<!-- ============================================================ -->
		<h2>API — getItemWidget() / repaint() / layoutChanged</h2>
		<section style="padding:16px;">
			<button id="btnGetWidget" type="button">getItemWidget(2).option("text", "Změněno")</button>
			<div id="apiLog" class="log" style="margin:10px 0 0;">...</div>
		</section>

		<script>
		$(function () {
			function log(msg) { $("#toolbarLog").text(msg); }
			var toolbar = qpx.ui({
				view: "qpToolBar",
				theme: "generic-light",
				items: [
					{ location: "before", widget: "button",
					  options: { icon: "☰", stylingMode: "text", hint: "Menu",
						onClick: function () { log("Button 'Menu' — click."); } } },
					{ location: "before", widget: "template", template: "<b style='padding:0 4px;'>qpx Demo</b>" },
					{ location: "before", widget: "button",
					  options: { text: "Nový", icon: "➕", type: "default",
						onClick: function () { log("Button 'Nový' — vytvářím záznam..."); } } },
					{ location: "before", widget: "buttonGroup",
					  options: { items: [{ text: "Den", key: "day" }, { text: "Týden", key: "week" }, { text: "Měsíc", key: "month" }],
						selectedItemKeys: ["week"],
						onItemClick: function (e) { log("ButtonGroup — kliknuto: " + e.itemData.text); } } },
					{ location: "before", widget: "dropDownButton",
					  options: { text: "Export", icon: "⭳", splitButton: true,
						items: [{ text: "Export do PDF", key: "pdf" }, { text: "Export do Excelu", key: "xlsx" }, { text: "Export do CSV", key: "csv" }],
						onButtonClick: function () { log("DropDownButton 'Export' — hlavní tlačítko."); },
						onItemClick: function (e) { log("DropDownButton 'Export' — vybráno: " + e.itemData.text); } } },
					{ location: "before", widget: "button",
					  options: { text: "Uložit", type: "success", onClick: function () { log("Button 'Uložit' — ukládám..."); } } },
					{ location: "before", widget: "button",
					  options: { text: "Smazat", type: "danger", onClick: function () { log("Button 'Smazat' — mažu záznam..."); } } },
					{ location: "before", widget: "button",
					  options: { text: "Filtr", stylingMode: "outlined", onClick: function () { log("Button 'Filtr' — otevírám filtr..."); } } },
					{ location: "before", widget: "button",
					  options: { text: "Tisk", stylingMode: "outlined", onClick: function () { log("Button 'Tisk' — tisknu..."); } } },
					{ location: "center", widget: "template", template: "<span style='color:#888;'>#count# položek</span>", data: { count: 128 } },
					{ location: "after", widget: "button",
					  options: { icon: "🔔", stylingMode: "text", hint: "Notifikace", onClick: function () { log("Button 'Notifikace' — click."); } } },
					{ location: "after", widget: "dropDownButton", locateInMenu: "never",
					  options: { text: "Petr Novák", icon: "👤",
						items: [{ text: "Profil", key: "profile" }, { text: "Nastavení", key: "settings" }, { text: "Odhlásit se", key: "logout" }],
						onItemClick: function (e) { log("Uživatelské menu — vybráno: " + e.itemData.text); } } }
				],
				onItemClick: function (e) {
					console.log("qpx.qpToolBar onItemClick:", e.itemData, "index:", e.itemIndex);
				},
				onOptionChanged: function (e) {
					console.log("toolbar optionChanged:", e.name, "->", e.value);
				}
			}, "#app0");
			/*
			$("#app0").qpx("qpToolBar",{
				view: "qpToolBar",
				theme: "generic-light",
				items: [
					{ location: "before", widget: "button",
					  options: { icon: "☰", stylingMode: "text", hint: "Menu",
						onClick: function () { log("Button 'Menu' — click."); } } },
					{ location: "before", widget: "template", template: "<b style='padding:0 4px;'>qpx Demo</b>" },
					{ location: "before", widget: "button",
					  options: { text: "Nový", icon: "➕", type: "default",
						onClick: function () { log("Button 'Nový' — vytvářím záznam..."); } } },
					{ location: "before", widget: "buttonGroup",
					  options: { items: [{ text: "Den", key: "day" }, { text: "Týden", key: "week" }, { text: "Měsíc", key: "month" }],
						selectedItemKeys: ["week"],
						onItemClick: function (e) { log("ButtonGroup — kliknuto: " + e.itemData.text); } } },
					{ location: "before", widget: "dropDownButton",
					  options: { text: "Export", icon: "⭳", splitButton: true,
						items: [{ text: "Export do PDF", key: "pdf" }, { text: "Export do Excelu", key: "xlsx" }, { text: "Export do CSV", key: "csv" }],
						onButtonClick: function () { log("DropDownButton 'Export' — hlavní tlačítko."); },
						onItemClick: function (e) { log("DropDownButton 'Export' — vybráno: " + e.itemData.text); } } },
					{ location: "before", widget: "button",
					  options: { text: "Uložit", type: "success", onClick: function () { log("Button 'Uložit' — ukládám..."); } } },
					{ location: "before", widget: "button",
					  options: { text: "Smazat", type: "danger", onClick: function () { log("Button 'Smazat' — mažu záznam..."); } } },
					{ location: "before", widget: "button",
					  options: { text: "Filtr", stylingMode: "outlined", onClick: function () { log("Button 'Filtr' — otevírám filtr..."); } } },
					{ location: "before", widget: "button",
					  options: { text: "Tisk", stylingMode: "outlined", onClick: function () { log("Button 'Tisk' — tisknu..."); } } },
					{ location: "center", widget: "template", template: "<span style='color:#888;'>#count# položek</span>", data: { count: 128 } },
					{ location: "after", widget: "button",
					  options: { icon: "🔔", stylingMode: "text", hint: "Notifikace", onClick: function () { log("Button 'Notifikace' — click."); } } },
					{ location: "after", widget: "dropDownButton", locateInMenu: "never",
					  options: { text: "Petr Novák", icon: "👤",
						items: [{ text: "Profil", key: "profile" }, { text: "Nastavení", key: "settings" }, { text: "Odhlásit se", key: "logout" }],
						onItemClick: function (e) { log("Uživatelské menu — vybráno: " + e.itemData.text); } } }
				],
				onItemClick: function (e) {
					console.log("qpx.qpToolBar onItemClick:", e.itemData, "index:", e.itemIndex);
				},
				onOptionChanged: function (e) {
					console.log("toolbar optionChanged:", e.name, "->", e.value);
				}
			});			
			*/
			toolbar.on("layoutChanged", function (e) {
				console.log("layoutChanged — overflowing:", e.overflowing);
			});

			$("#themeToggle").on("change", function () {
				toolbar.option("theme", this.checked ? "generic-dark" : "generic-light");
			});
			$("#disabledToggle").on("change", function () {
				toolbar.option("disabled", this.checked);
			});
			$("#toolbarWidth").on("input", function () {
				$("#toolbarWrap").css("width", this.value + "px");
			});

			$("#btnGetWidget").on("click", function () {
				var w = toolbar.getItemWidget(2); // Button "Nový"
				w.option("text", "Změněno " + new Date().toLocaleTimeString());
				$("#apiLog").text("getItemWidget(2) -> nastaven nový text tlačítka 'Nový'");
			});
		});
		</script>
	</body>
</html>
