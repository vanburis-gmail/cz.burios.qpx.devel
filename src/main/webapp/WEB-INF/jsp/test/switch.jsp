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
		<link rel="stylesheet" href="/devel/libs/qpx/themes/jquery.qpx.default.css?build=${ timeNo }" rel="stylesheet" type="text/css">

		<style type="text/css">
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
        }
        .demo-row {
            margin-bottom: 16px;
        }
		</style>

		<script type="text/javascript" src="/devel/libs/jquery/jquery-3.7.1.js"></script>
		<script type="text/javascript" src="/devel/libs/qpx/jquery.qpx.all.js"></script>
	</head>
	<body data-theme="light">
		<h1>QPX qpSwitch – testovací stránka</h1>

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
