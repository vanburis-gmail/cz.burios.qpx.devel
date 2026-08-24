<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix = "c" uri = "http://java.sun.com/jsp/jstl/core" %>
<%
System.out.println("/devel/switch.jsp");
%>
<!DOCTYPE html>
<html lang="cs">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">

		<title>${appTitle}</title>

		<link rel="icon" href="/devel/favicon.png">
		<link rel="stylesheet" href="/devel/libs/fonts/fontawesome/4.7/css/font-awesome.min.css" type="text/css" media="all" />
		<link rel="stylesheet" href="/devel/libs/qpx/themes/jquery.qpx.default.css?build=${ timeNo }" rel="stylesheet" type="text/css">

		<style type="text/css">
			header.page-head { padding: 18px 24px 6px; }
			h1 { font-size: 18px; margin: 0 0 4px; }
			.subtitle { color: #767676; font-size: 12px; margin: 0; }
			main { padding: 8px 24px 60px; max-width: 760px; }	        
	        .demo-row {
	            margin-bottom: 16px;
	        }
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
				<h1>qpSwitch – testovací stránka</h1>
				<p class="subtitle"></p>
			</header>
			<main>
				<div id="styleToolbar"></div>
				
				<div class="demo-row">
				    <span>Výchozí přepínač:</span>
				    <div id="switchDefault"></div>
				</div>
				
				<div class="demo-row">
				    <span>Outlined styl:</span>
				    <div id="switchOutlined"></div>
				</div>
				
				<div class="demo-row">
				    <span>Flat styl (disabled):</span>
				    <div id="switchFlat"></div>
				</div>
			</main>
		</div>
		
		<script>
		    $(function () {
		        // inicializace switchů
		        var swDefault = qpx.ui({
		            view: "qpSwitch",
		            value: true,
		            onText: "Zapnuto",
		            offText: "Vypnuto",
		            stylingMode: "default",
		            onValueChanged: function (e) {
		                console.log("Default switch valueChanged:", e.value);
		            }
		        }, "#switchDefault");
		
		        var swOutlined = qpx.ui({
		            view: "qpSwitch",
		            value: false,
		            onText: "Ano",
		            offText: "Ne",
		            stylingMode: "outlined"
		        }, "#switchOutlined");
		
		        var swFlat = qpx.ui({
		            view: "qpSwitch",
		            value: true,
		            onText: "On",
		            offText: "Off",
		            stylingMode: "flat",
		            disabled: true
		        }, "#switchFlat");
		
		        // toolbar pro přepínání stylu prvního switch
		        var toolbar = qpx.ui({
		            view: "qpToolBar",
		            items: [
		                {
		                    location: "before",
		                    widget: "buttonGroup",
		                    options: {
		                        items: [
		                            { text: "Default", key: "default" },
		                            { text: "Outlined", key: "outlined" },
		                            { text: "Flat", key: "flat" }
		                        ],
		                        selectionMode: "single",
		                        selectedItemKeys: ["default"],
		                        onSelectionChanged: function (e) {
		                            var mode = e.addedItemKeys[0] || "default";
		                            swDefault.option("stylingMode", mode);
		                        }
		                    }
		                }
		            ]
		        }, "#styleToolbar");
		    });
		</script>
	</body>
</html>








</body>
</html>
