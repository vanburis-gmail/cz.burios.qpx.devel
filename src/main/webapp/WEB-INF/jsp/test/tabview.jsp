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
			
			.qpx-testbar {
				display: flex;
				flex-wrap: wrap;
				gap: 18px;
				align-items: center;
				padding: 12px 20px;
				background: #ffffff;
				border-bottom: 1px solid #e0e0e0;
				position: sticky;
				top: 0;
				z-index: 10;
			}
			body.qpx-page-dark .qpx-testbar {
				background: #262626;
				border-bottom-color: #3f3f3f;
			}
			.qpx-testbar label {
				display: flex;
				align-items: center;
				gap: 6px;
				font-size: 13px;
				font-weight: 600;
			}
			.qpx-testbar select, .qpx-testbar button {
				font-size: 13px;
				padding: 5px 8px;
			}
			.qpx-testbar button {
				cursor: pointer;
				border: 1px solid #c8c8c8;
				border-radius: 4px;
				background: #fafafa;
			}
			.qpx-testbar button.active { background: #1976d2; color: #fff; border-color: #1976d2; }
			
			.qpx-demo-wrap {
				max-width: 900px;
				margin: 28px auto;
				padding: 0 20px 60px;
			}
			.qpx-demo-wrap h2 { font-size: 16px; margin: 28px 0 10px; }
			.qpx-demo-panel-content h3 { margin-top: 0; }
			.qpx-demo-panel-content p { line-height: 1.5; color: inherit; opacity: 0.85; }
			
			#tabviewLeftRight { height: 320px; }
		
			/* jednoduché ikony bez externí knihovny – jen kolečka/tvary přes mask */
			.qpx-icon-home { -webkit-mask: radial-gradient(circle, #000 60%, transparent 61%); mask: radial-gradient(circle, #000 60%, transparent 61%); }
			.qpx-icon-user { border-radius: 50%; }
			.qpx-icon-settings { border-radius: 3px; transform: rotate(20deg); }
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
			<strong>QPX qpTabView – test</strong>
			<div class="qpx-testbar">
				<label>Téma:
					<select id="ctlTheme">
						<option value="qpx-theme-generic-light">generic-light</option>
						<option value="qpx-theme-generic-dark">generic-dark</option>
					</select>
				</label>
			
				<label>Styling:
					<select id="ctlStyling">
						<option value="primary">primary (podtržení)</option>
						<option value="secondary">secondary (pilulky)</option>
					</select>
				</label>
			
				<label>Pozice záložek:
					<select id="ctlPosition">
						<option value="top">top</option>
						<option value="bottom">bottom</option>
						<option value="left">left</option>
						<option value="right">right</option>
					</select>
				</label>
			
				<label><input type="checkbox" id="ctlRtl"> RTL</label>
				<label><input type="checkbox" id="ctlDisabled"> disabled</label>
				<label><input type="checkbox" id="ctlNavButtons" checked> nav tlačítka</label>
				
				<button id="ctlAddTab" type="button">+ přidat záložku</button>
			</div>
	
			<div class="qpx-demo-wrap">
	
				<h2>1) Hlavní demo (ovládané přepínačem nahoře)</h2>
				<div id="tabviewMain"></div>
				
				<h2>2) Deklarativně přes data-qpx-* atributy</h2>
				<div data-qpx-view="qpTabView"
					data-qpx-tabs-position="top"
					data-qpx-styling-mode="secondary"
					data-qpx-items='[
						{"title":"Přehled","text":"Deklarativně inicializovaná záložka č. 1."},
						{"title":"Detail","text":"Deklarativně inicializovaná záložka č. 2."},
						{"title":"Historie","text":"Deklarativně inicializovaná záložka č. 3.","disabled":true}
					]'>
				</div>
		
				<h2>3) Vnořené qpx widgety v panelu (rows/cols layout)</h2>
				<div id="tabviewNested"></div>
			</div>	
		</div>

		<script>
		$(function () {
			// -----------------------------------------------------------------
			// 1) Hlavní demo — items s různým obsahem (template, html, text)
			// -----------------------------------------------------------------
			var mainTabs = qpx.ui({
				view: "qpTabView",
				width: "100%",
				tabsPosition: "top",
				stylingMode: "primary",
				showNavButtons: true,
				deferRendering: true,
				animationEnabled: true,
				items: [
		            {
		                title: "Dashboard",
		                icon: "home",
		                template: function (itemData, itemIndex, element) {
		                    return "<div class='qpx-demo-panel-content'>" +
		                        "<h3>Dashboard</h3>" +
		                        "<p>Obsah vykreslený přes <code>template</code> jako funkci vracející HTML.</p>" +
		                        "</div>";
		                }
		            },
		            {
		                title: "Uživatelé",
		                icon: "user",
		                badge: 5,
		                html: "<div class='qpx-demo-panel-content'><h3>Uživatelé</h3><p>Obsah zadaný přímo přes <code>html</code>.</p></div>"
		            },
		            {
		                title: "Nastavení",
		                icon: "settings",
		                text: "Obsah zadaný jako čistý text přes 'text' (společně s 'title')."
		            },
		            {
		                title: "Zakázaná záložka",
		                disabled: true,
		                text: "Tento obsah by neměl jít nikdy zobrazit."
		            },
		            {
		                title: "Dlouhý název záložky pro test přetečení A",
		                text: "Testovací obsah A."
		            },
		            {
		                title: "Dlouhý název záložky pro test přetečení B",
		                text: "Testovací obsah B."
		            },
		            {
		                title: "Dlouhý název záložky pro test přetečení C",
		                text: "Testovací obsah C."
		            }
		        ],
		        onSelectionChanged: function (e) {
		            console.log("selectionChanged ->", e.addedItems[0] && e.addedItems[0].title);
		        },
		        onTitleClick: function (e) {
		            console.log("titleClick ->", e.itemData.title);
		        },
		        onContentReady: function () {
		            console.log("qpTabView: contentReady");
		        }
		    }, "#tabviewMain");
		
		    // -----------------------------------------------------------------
		    // 2) Ovládací panel nahoře -> volání .option(...) na instanci
		    // -----------------------------------------------------------------
		    function applyTheme(themeClass) {
		        mainTabs.getContainer()
		            .removeClass("qpx-theme-generic-light qpx-theme-generic-dark")
		            .addClass(themeClass);
		        $("body").toggleClass("qpx-page-dark", themeClass === "qpx-theme-generic-dark");
		    }
		
		    applyTheme($("#ctlTheme").val());
		
		    $("#ctlTheme").on("change", function () { applyTheme(this.value); });
		
		    $("#ctlStyling").on("change", function () {
		        mainTabs.option("stylingMode", this.value);
		    });
		
		    $("#ctlPosition").on("change", function () {
		        mainTabs.option("tabsPosition", this.value);
		    });
		
		    $("#ctlRtl").on("change", function () {
		        mainTabs.option("rtlEnabled", this.checked);
		    });
		
		    $("#ctlDisabled").on("change", function () {
		        mainTabs.option("disabled", this.checked);
		    });
		
		    $("#ctlNavButtons").on("change", function () {
		        mainTabs.option("showNavButtons", this.checked);
		    });
		
		    $("#ctlAddTab").on("click", function () {
		        var items = mainTabs.option("items").slice();
		        var n = items.length + 1;
		        items.push({ title: "Nová " + n, text: "Dynamicky přidaná záložka č. " + n + "." });
		        mainTabs.option("items", items);
		        mainTabs.option("selectedIndex", items.length - 1);
		    });
		
		    // -----------------------------------------------------------------
		    // 3) Vnořené qpx widgety (layout rows/cols) uvnitř panelu
		    // -----------------------------------------------------------------
		    qpx.ui({
		        view: "qpTabView",
		        tabsPosition: "left",
		        stylingMode: "primary",
		        deferRendering: false,
		        items: [
		            {
		                title: "Formulář",
		                rows: [
		                    { view: "template", template: "<div class='qpx-demo-panel-content'><h3>Vnořený layout</h3><p>Tento panel je celý sestaven přes <code>qpx.ui</code> (rows/cols), stejně jako u qpToolBar položek.</p></div>", height: 90 },
		                    {
		                        cols: [
		                            { view: "template", template: "<div class='qpx-demo-panel-content'>Sloupec A</div>" },
		                            { view: "template", template: "<div class='qpx-demo-panel-content'>Sloupec B</div>" }
		                        ]
		                    }
		                ]
		            },
		            {
		                title: "Toolbar demo",
		                rows: [
		                    {
		                        view: "qpToolBar",
		                        height: 44,
		                        items: [
		                            { location: "before", widget: "template", template: "<b style='padding:0 12px;'>Panel s toolbarem uvnitř qpTabView</b>" },
		                            { location: "after", widget: "button", options: { text: "Akce" } }
		                        ]
		                    }
		                ]
		            }
		        ]
		    }, "#tabviewNested");
		
		});
		</script>
	</body>
</html>
