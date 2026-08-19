<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix = "c" uri = "http://java.sun.com/jsp/jstl/core" %>
<%
System.out.println("/devel/index.jsp");
%>
<!DOCTYPE html>
<html lang="cs">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
	
		<title>Buriosca.cz - Devel QPX</title>

		<link rel="icon" href="/devel/favicon.png">

		<link rel="stylesheet" href="/devel/libs/qpx/themes/jquery.qpx.light.css?build=${ timeNo }" rel="stylesheet" type="text/css">
		<link rel="stylesheet" href="/devel/libs/qpx/themes/jquery.qpx.dark.css?build=${ timeNo }" rel="stylesheet" type="text/css">

		<style type="text/css">
		html, body {
			font-family: "Segoe UI", Arial, sans-serif; 
			font-size: 12px;
			margin: 0; 
			background:#f4f6f8; 
			color:#222; 
		}
		h1 { font-size: 20px; padding: 16px 20px 4px; }
		h2 { font-size: 15px; margin: 24px 20px 8px; color:#555; }
		section { margin: 0 20px 20px; background:#fff; border:1px solid #e2e6ea; border-radius:6px; overflow:hidden;}
		.demo-json { height: 220px; }
		.box { border:1px solid #dfe3e8; }
		code.inline { background:#eef1f4; padding:1px 5px; border-radius:3px; }
		pre { background:#1e1e1e; color:#d4d4d4; padding:10px 14px; margin:0; font-size:12px; overflow:auto; }
		.qpx-template.card { padding:14px; }
		.qpx-template.card h3 { margin:0 0 6px; font-size:14px; }
		.qpx-template.card p { margin:0; font-size:12px; color:#666; }
		.toolbar { background:#2f3b52; color:#fff; }
		.sidebar { background:#f0f2f5; }
		</style>

		<script type="text/javascript" src="/devel/libs/jquery/jquery-3.7.1.js"></script>
		<script type="text/javascript" src="/devel/libs/qpx/qpx.js"></script>

		<script></script>
	</head>
	<body style="height: 100vh;overflow: auto;" data-theme="light">

		<h1>QPX framework — ukázka tří způsobů definice komponent</h1>
	
		<!-- ============================================================ -->
		<h2>0) qpToolBar — panel nástrojů (definice v JSON), s přetečením do menu</h2>
		<section style="padding:0;">
		    <div style="padding:10px 16px 0;">
		        <label><input type="checkbox" id="themeToggle"> tmavé téma (generic-dark)</label>
		        &nbsp;·&nbsp;
		        <label>šířka panelu: <input type="range" id="toolbarWidth" min="260" max="900" value="900" style="vertical-align:middle;"></label>
		        <span style="color:#888; font-size:12px;">(zužte panel a sledujte, jak se pravé položky sbalují do menu „⋮“ — stejně jako v Chrome DevTools)</span>
		    </div>
		    <div id="toolbarWrap" style="width:900px; max-width:100%; margin:10px 16px 16px; border:1px solid #dfe3e8;">
		        <div id="app0"></div>
		    </div>
		    <div id="toolbarLog" style="margin:0 16px 16px; padding:8px 12px; background:#1e1e1e; color:#9cdcfe; font-family:monospace; font-size:12px; min-height:20px; border-radius:4px;">
		        Klikni na položky toolbaru — události se vypíší sem...
		    </div>
		</section>
	
		<!-- ============================================================ -->
		<h2>1) Skládání komponent z JSON stromu (rows/cols, jako ve webixu)</h2>
		<section>
		    <div id="app1" class="demo-json"></div>
		</section>
	
		<!-- ============================================================ -->
		<h2>2) Komponenta napojená přímo na konkrétní HTML element (jako kendoUI / easyUI)</h2>
		<section style="padding:16px;">
		    <div id="attachedBox" class="box" style="height:90px;"></div>
		</section>
	
		<!-- ============================================================ -->
		<h2>3) Deklarativní zápis přes data-qpx-* atributy (jako Metro UI CSS)</h2>
		<section style="padding:16px;">
		    <div data-qpx-view="template"
		         data-qpx-template="&lt;b&gt;#title#&lt;/b&gt;: #text#"
		         data-qpx-data='{"title":"Deklarativně","text":"Tahle komponenta vznikla čistě z HTML atributů."}'
		         class="box"
		         style="height:60px;">
		    </div>
		</section>
	
		<h2>Java-like dědičnost přes Class / QPX.Class</h2>
		<section style="padding:16px;">
		    <div id="classDemoOut" style="font-family:monospace; font-size:13px; white-space:pre-line;"></div>
		</section>
	
		<script>
		$(function () {
			// ------------------------------------------------------------
			// 0) qpToolBar — definice v JSONu, vč. ukázky "onClick" u položek
			//    Button / ButtonGroup / DropDownButton a "template" položky.
			// ------------------------------------------------------------
			function log(msg) {
				$("#toolbarLog").text(msg);
			}
			var toolbar = QPX.ui({
				view: "qpToolBar",
				theme: "generic-light",
				items: [
					// -- before (levá strana) --
					{
						location: "before", widget: "button",
						options: {
							icon: "☰", stylingMode: "text", hint: "Menu",
							onClick: function (e) {
								console.log("Button 'Menu' — click (itemIndex přes toolbar.onItemClick).");
								log("Button 'Menu' — click (itemIndex přes toolbar.onItemClick)."); 
							}
						}
					}, {
						location: "before", widget: "template",
						template: "<b style='padding:0 4px;'>QPX Demo</b>"
					}, {
						location: "before", widget: "button",
						options: {
							text: "Nový", icon: "➕", type: "default",
							onClick: function (e) {
								console.log("Button 'Nový' — vytvářím záznam...");
								log("Button 'Nový' — vytvářím záznam..."); 
							}
						}
					}, {
						location: "before", widget: "buttonGroup",
						options: {
							items: [
								{ text: "Den", key: "day" },
								{ text: "Týden", key: "week" },
								{ text: "Měsíc", key: "month" }
							],
							selectedItemKeys: ["week"],
							onItemClick: function(e) {
								console.log("ButtonGroup — kliknuta položka: ", e.itemData.text);
								log("ButtonGroup — kliknuta položka: " + e.itemData.text); 
							}
						}
					}, {
						location: "before", widget: "dropDownButton",
						options: {
							text: "Export", icon: "⭳", 
							splitButton: true,
							items: [
								{ text: "Export do PDF", key: "pdf" },
								{ text: "Export do Excelu", key: "xlsx" },
								{ text: "Export do CSV", key: "csv" }
							],
							onButtonClick: function(e) {
								console.log("DropDownButton 'Export' — hlavní tlačítko kliknuto.");
								log("DropDownButton 'Export' — hlavní tlačítko kliknuto.");
							},
							onItemClick: function(e) {
								console.log("DropDownButton 'Export' — vybráno: ", e.itemData.text);
								log("DropDownButton 'Export' — vybráno: " + e.itemData.text);
							}
						}
					}, {
						location: "before", widget: "button",
						options: { 
							text: "Uložit", 
							type: "success",
							onClick: function(e) {
								console.log("Button 'Uložit' — ukládám...");
								log("Button 'Uložit' — ukládám...");
							}
						}
		            }, {
		            	location: "before", 
		            	widget: "button",
		            	options: { 
		            		text: "Smazat",
		            		type: "danger",
		                    onClick: function(e) {
		                    	console.log("Button 'Smazat' — mažu záznam...");
		                    	log("Button 'Smazat' — mažu záznam...");
							}
						}
					}, {
						location: "before",
						widget: "button",
						options: {
							text: "Filtr",
							stylingMode: "outlined",
							onClick: function(e) {
								console.log("Button 'Filtr' — otevírám filtr...");
								log("Button 'Filtr' — otevírám filtr...");
							}
						}
				}, {
					location: "before",
					widget: "button",
					options: {
						text: "Tisk",
						stylingMode: "outlined",
						onClick: function(e) {
							log("Button 'Tisk' — tisknu...");
						}
					}
				},
				// -- center --
				{ location: "center", widget: "template", template: "<span style='color:#888;'>#count# položek</span>", data: { count: 128 } },
				// -- after (pravá strana) --
				{
					location: "after",
					widget: "button",
					options: {
						icon: "🔔",
						stylingMode: "text",
						hint: "Notifikace",
						onClick: function(e) {
							log("Button 'Notifikace' — click.");
						}
						}
				}, {
					location: "after",
					widget: "dropDownButton",
					locateInMenu: "never",
					options: {
						text: "Petr Novák",
						icon: "👤",
						items: [
							{ text: "Profil", key: "profile" },
							{ text: "Nastavení", key: "settings" },
							{ text: "Odhlásit se", key: "logout" }
						],
						onItemClick: function(e) {
							log("Uživatelské menu — vybráno: " + e.itemData.text);
						}
					}
				}],
				onItemClick: function(e) {
					// obecný odposlech kliknutí přes toolbar, bez ohledu na typ položky
					console.log("QPX.qpToolBar onItemClick:", e.itemData, "index:", e.itemIndex);
				}
			}, "#app0");
		
			$("#themeToggle").on("change", function () {
				toolbar.option("theme", this.checked ? "generic-dark" : "generic-light");
			});
					
			$("#toolbarWidth").on("input", function () {
				$("#toolbarWrap").css("width", this.value + "px");
			});
			
			// ------------------------------------------------------------
			// 1) JSON kompozice: layout s řádky a sloupci, responzivní cols
			// ------------------------------------------------------------
			QPX.ui({
				rows: [{
					view: "template", height: 44, css: "toolbar",
					template: "<div style='padding:10px 14px;'>QPX — horní panel (toolbar)</div>" 
				}, {
					cols: [{
						view: "template", width: 180, css: "sidebar",
						template: "<div style='padding:12px;'>Postranní panel<br>(pevná šířka 180px)</div>"
					}, {
						view: "template", gravity: 1, css: "card",
						template: "<h3>#title#</h3><p>#text#</p>",
						data: { title: "Hlavní obsah", text: "Tato buňka roste (gravity:1) a vyplní zbylý prostor." }
					}],
					responsive: true
				}]
			}, "#app1");
		
			// ------------------------------------------------------------
			// 2) Napojení na konkrétní element pomocí jQuery pluginu $.fn.qpx
			// ------------------------------------------------------------
			var tpl = $("#attachedBox").qpx("template", {
				template: "<b>#user#</b> právě napsal: <i>#msg#</i>",
				data: { user: "Petr", msg: "Ahoj, tohle je komponenta napojená na #attachedBox." }
			}).data("qpx-widget");
		
			// po 2s ukázka, že jde komponentu za běhu přeplnit novými daty
			setTimeout(function () {
				tpl.setValues({ user: "Petr", msg: "...a teď se obsah změnil voláním setValues()." });
			}, 2000);
		
			// ------------------------------------------------------------
			// 3) data-qpx-* atributy se zpracují automaticky po načtení DOM
			//    (QPX.parse() proběhne samo, viz src/qpParser.js)
			// ------------------------------------------------------------
		
			// ------------------------------------------------------------
			// Class systém — Java-like dědičnost (globální Class == QPX.Class)
			// ------------------------------------------------------------
			var Animal = Class.extend({
				init: function (name) { this.name = name; },
				speak: function () { return this.name + " vydává zvuk."; }
			});
		
			var Dog = Animal.extend({
				speak: function () { return this._super() + " Přesněji: štěká."; }
			});
		
			var out = [];
			out.push(new Animal("Zvíře").speak());
			out.push(new Dog("Rex").speak());
			out.push("Dog je instancí Animal: " + (new Dog("Rex") instanceof Animal));
			out.push("Class === QPX.Class: " + (Class === QPX.Class));
			$("#classDemoOut").text(out.join("\n"));
		});
		</script>
	</body>
</html>