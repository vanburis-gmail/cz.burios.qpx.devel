<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix = "c" uri = "http://java.sun.com/jsp/jstl/core" %>
<%
System.out.println("/devel/dropdownbutton.jsp");
%>
<!DOCTYPE html>
<html lang="cs">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">

		<title>qpx — dropDownButton</title>

		<link rel="icon" href="/devel/favicon.png">
		<link rel="stylesheet" href="/devel/libs/qpx/themes/jquery.qpx.default.css?build=${ timeNo }" rel="stylesheet" type="text/css">

		<style type="text/css">
			html, body { font-family: "Segoe UI", Arial, sans-serif; font-size: 12px; margin: 0; background:#f4f6f8; color:#222; }
			h1 { font-size: 20px; padding: 16px 20px 4px; }
			h2 { font-size: 15px; margin: 24px 20px 8px; color:#555; }
			section { margin: 0 20px 20px; background:#fff; border:1px solid #e2e6ea; border-radius:6px; padding:16px; }
			.row { display:flex; gap:16px; align-items:center; flex-wrap:wrap; margin-bottom:10px; }
			.log { margin-top:10px; padding:8px 12px; background:#1e1e1e; color:#9cdcfe; font-family:monospace; font-size:12px; min-height:20px; border-radius:4px; }
		</style>

		<script type="text/javascript" src="/devel/libs/jquery/jquery-3.7.1.js"></script>
		<script type="text/javascript" src="/devel/libs/qpx/jquery.qpx.all.js"></script>
	</head>
	<body data-theme="light">

		<h1>qpx.DropDownButton — testovací stránka</h1>

		<!-- ============================================================ -->
		<h2>1) Obyčejné tlačítko (splitButton: false)</h2>
		<section>
			<div id="normalRow" class="row"></div>
			<div id="log1" class="log">...</div>
		</section>

		<!-- ============================================================ -->
		<h2>2) Split tlačítko (splitButton: true)</h2>
		<section>
			<div id="splitRow" class="row"></div>
			<div id="log2" class="log">...</div>
		</section>

		<!-- ============================================================ -->
		<h2>3) useSelectMode — vybraná položka nahradí text tlačítka</h2>
		<section>
			<div id="selectRow" class="row"></div>
			<div id="log3" class="log">...</div>
		</section>

		<!-- ============================================================ -->
		<h2>4) opened / closed eventy, dropDownOptions.width</h2>
		<section>
			<div id="widthRow" class="row"></div>
			<div id="log4" class="log">...</div>
		</section>

		<script>
		$(function () {
			qpx.ui({
				view: "dropDownButton",
				text: "Akce",
				icon: "⋯",
				stylingMode: "outlined",
				items: [
					{ text: "Upravit", key: "edit" },
					{ text: "Duplikovat", key: "duplicate" },
					{ text: "Smazat", key: "delete", disabled: true }
				],
				onButtonClick: function () { $("#log1").text("buttonClick (menu se přepnulo)"); },
				onItemClick: function (e) { $("#log1").text("itemClick: " + e.itemData.text); }
			}, "#normalRow");

			qpx.ui({
				view: "dropDownButton",
				text: "Export",
				icon: "⭳",
				splitButton: true,
				type: "default",
				items: [
					{ text: "Export do PDF", key: "pdf" },
					{ text: "Export do Excelu", key: "xlsx" },
					{ text: "Export do CSV", key: "csv" }
				],
				onButtonClick: function () { $("#log2").text("buttonClick — hlavní část (bez otevření menu)"); },
				onItemClick: function (e) { $("#log2").text("itemClick: " + e.itemData.text); }
			}, "#splitRow");

			qpx.ui({
				view: "dropDownButton",
				useSelectMode: true,
				selectedItemKey: "cs",
				items: [
					{ text: "Čeština", key: "cs" },
					{ text: "English", key: "en" },
					{ text: "Deutsch", key: "de" }
				],
				onSelectionChanged: function (e) {
					$("#log3").text("selectionChanged: " + e.previousKey + " -> " + e.key);
				}
			}, "#selectRow");

			qpx.ui({
				view: "dropDownButton",
				text: "Široké menu (300px)",
				dropDownOptions: { width: 300 },
				items: [
					{ text: "Krátká položka", key: 1 },
					{ text: "Delší popisek položky pro ukázku šířky menu", key: 2 }
				],
				onOptionChanged: function (e) { console.log("optionChanged", e.name, e.value); }
			}, "#widthRow").on("opened", function () {
				$("#log4").text("menu otevřeno");
			}).on("closed", function () {
				$("#log4").text("menu zavřeno");
			});
		});
		</script>
	</body>
</html>
