<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix = "c" uri = "http://java.sun.com/jsp/jstl/core" %>

<html lang="cs">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
	
		<title>Buriosca.cz - Darwin QPX</title>

		<link rel="icon" href="/devel/favicon.png">
		<link rel="stylesheet" href="/devel/libs/qpx/qpx-default.css?build=${ timeNo }" rel="stylesheet" type="text/css">

		<style type="text/css">
		html, body {
			font-family: Segoe UI;
			font-size: 12px;
		}
		</style>

		<script type="text/javascript" src="/devel/libs/jquery/jquery-3.7.1.js"></script>
		<%-- 
		--%>
		<script type="text/javascript" src="/devel/libs/qpx/jquery.qpx.core.js"></script>
		<script type="text/javascript" src="/devel/libs/qpx/src/qpTabs.js?build=${ timeNo }"></script>
		<script type="text/javascript" src="/devel/libs/qpx/src/qpToolBar.js?build=${ timeNo }"></script>

		<script></script>
	</head>
	<body style="height: 100vh;overflow: hidden;">
		<div id="mainToolbar"></div>
		<script>
		$("#mainToolbar").qpToolBar({
			responsive: true,   // overflow → popup
			data: [
				{ id: "new", text: "Nový", icon: "fa fa-file" },
				{ id: "open", text: "Otevřít", icon: "fa fa-folder-open" },
				{ id: "save", text: "Uložit", icon: "fa fa-save" },
				
				{ type: "separator" },
				
				{ id: "bold", text: "Tučné", icon: "fa fa-bold", toggle: true },
				{ id: "italic", text: "Kurzíva", icon: "fa fa-italic", toggle: true },
				
				{ type: "separator" },
				{
					id: "export",
					text: "Export",
					icon: "fa fa-download",
					menu: [
						{ id: "export_pdf", text: "PDF" },
						{ id: "export_xls", text: "Excel" },
						{ id: "export_png", text: "PNG" }
					]
				}
			],
			onClick: function(id, $btn) {
				console.log("Klik:", id);
			},
			onToggle: function(id, state) {
				console.log("Toggle:", id, "→", state);
			}
		});
		</script>
		<div id="myTabs"></div>
		<script>
		$("#myTabs").qpTabs({
			closable: true,
			responsive: false,
			data: [
				{ title: "Dashboard", content: "<p>Obsah dashboardu</p>" },
				{ title: "Položka 2", content: "<p>Obsah tiem 2</p>" },
				{ title: "Položka 3", content: "<p>Obsah tiem 3</p>" },
				{ title: "Položka 4", content: "<p>Obsah tiem 4</p>" },
				{ title: "Položka 5", content: "<p>Obsah tiem 5</p>" },
				{ title: "Položka 6", content: "<p>Obsah tiem 6</p>" },
				{ title: "Položka 7", content: "<p>Obsah tiem 7</p>" },
				{ title: "Nastavení", content: "<p>Konfigurace systému</p>" }
			]
		});

		/*
		data: [
			{ title: "Home", icon: "fa fa-home", content: "<p>Domů</p>" },
			{ title: "Uživatelé", icon: "fa fa-users", content: "<p>Seznam uživatelů</p>" }
		]

		data: [
			{ title: "Report", ajaxUrl: "/report.html" },
			{ title: "Statistiky", ajaxUrl: "/stats.html" }
		]

		data: [{
			title: "Graf",
			lazyLoader: function(index, done) {
				setTimeout(function() {
					done("<canvas id='chart'></canvas>");
				}, 500);
			}}
		]
		
		
		$("#myTabs").qpTabs({
		    active: 0,
		    closable: true,
		    onAdd: function(index, $tab, $content) {
		        console.log("Tab přidán:", index);
		    },
		    onRemove: function(index) {
		        console.log("Tab odebrán:", index);
		    },
		    onActivate: function(index) {
		        console.log("Aktivní tab:", index);
		    }
		});
		var tabs = $("#myTabs").data("qpTabs"); 
		tabs.add("Nový tab", "<p>Obsah nového tabu</p>");
		*/
		</script>
		<%-- 
		--%>
		
	</body>
</html>