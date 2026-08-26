<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" language="java" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<!DOCTYPE html>
<html lang="cs">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">

		<title>${appTitle}</title>

		<link rel="icon" href="/devel/favicon.png">
		<link rel="stylesheet" href="/devel/libs/fonts/fontawesome/4.7/css/font-awesome.min.css" type="text/css" media="all" />
		<link rel="stylesheet" href="/devel/libs/qpx/themes/jquery.qpx.light.css?build=${ timeNo }" rel="stylesheet" type="text/css">
		<link rel="stylesheet" href="/devel/css/qpx-test.css?build=${timeNo}">

		<script type="text/javascript" src="/devel/libs/jquery/jquery-3.7.1.js"></script>
		<script type="text/javascript" src="/devel/libs/qpx/jquery.qpx.all.js"></script>
	</head>
	<body class="qpx-view">
		<div class="qpx-test-topbar">
			<a href="/devel/" class="qpx-back-home" title="Zpět na hlavní stránku">
				<span class="fa fa-home"></span>
			</a>
		</div>
		<div class="qpx-test-content">
			<header class="page-head">
				<h1><span class="fa fa-calendar"></span> qpDatePicker</h1>
				<p class="subtitle">
					Segmentované datumové/časové pole s popup kalendářem — klik na segment, šipky, psaní číslic,
					popup pro datum i čas..
				</p>
			</header>
			<div class="toolbar-wrap">
				<div id="pageToolbar"></div>
			</div>
			<main>
				<div class="demo-block">
					<h2>1) Základní datum — formatString: "dd.MM.yyyy"</h2>
					<p class="desc">Klikněte na den/měsíc/rok, ovládejte šipkami nebo přímo pište číslice. Kalendářová ikona otevře popup.</p>
					<div id="datepicker1"></div>
					<div class="value-out" id="out1"></div>
				</div>

				<div class="demo-block">
					<h2>2) Datum + čas — formatString: "dd.MM.yyyy HH:mm"</h2>
					<p class="desc">Popup obsahuje kalendář i editor času; v režimu "instantly" se okno po výběru dne nezavírá, dokud nedoladíte čas.</p>
					<div id="datepicker2"></div>
					<div class="value-out" id="out2"></div>
				</div>

				<div class="demo-block">
					<h2>3) showSpinButtons — spin šipky vedle pole</h2>
					<p class="desc">jqx: spinButtons — šipky ▲/▼ mění aktivní segment o spinButtonsStep bez nutnosti otevřít kalendář.</p>
					<div id="datepicker3"></div>
				</div>

				<div class="demo-block">
					<h2>4) min / max + applyValueMode: "useButtons"</h2>
					<p class="desc">Výběr mimo rozsah je v kalendáři neaktivní; potvrzení tlačítkem „Použít“, „Zrušit“ zahodí rozpracovanou volbu.</p>
					<div id="datepicker4"></div>
				</div>

				<div class="demo-block">
					<h2>5) Jen čas — formatString: "HH:mm:ss"</h2>
					<p class="desc">Bez kalendáře v poli má smysl vypnout showCalendarButton; popup obsahuje jen editor času.</p>
					<div id="datepicker5"></div>
				</div>

				<div class="demo-block">
					<h2>6) disabled / readOnly</h2>
					<div id="datepicker6"></div>
				</div>
			</main>
		</div>

		<script>
		$(function () {
		    var today = new Date();

		    // -----------------------------------------------------------------
		    // 1) základní datum
		    // -----------------------------------------------------------------
		    var datepicker1 = qpx.ui({
		        view: "qpDatePicker",
		        width: 220,
		        formatString: "dd.MM.yyyy",
		        value: today,
		        showClearButton: true,
		        stylingMode: "outlined",
		        onValueChanged: function (e) {
		            $("#out1").text("value: " + (e.value ? e.value.toString() : "null"));
		        }
		    }, "#datepicker1");
		    $("#out1").text("value: " + datepicker1.value());

		    // -----------------------------------------------------------------
		    // 2) datum + čas
		    // -----------------------------------------------------------------
		    var datepicker2 = qpx.ui({
		        view: "qpDatePicker",
		        width: 260,
		        formatString: "dd.MM.yyyy HH:mm",
		        value: today,
		        stylingMode: "filled",
		        onValueChanged: function (e) {
		            $("#out2").text("value: " + (e.value ? e.value.toString() : "null"));
		        }
		    }, "#datepicker2");
		    $("#out2").text("value: " + datepicker2.value());

		    // -----------------------------------------------------------------
		    // 3) spin tlačítka
		    // -----------------------------------------------------------------
		    var datepicker3 = qpx.ui({
		        view: "qpDatePicker",
		        width: 220,
		        formatString: "dd.MM.yyyy",
		        value: today,
		        showSpinButtons: true,
		        spinButtonsStep: 1,
		        stylingMode: "underlined"
		    }, "#datepicker3");

		    // -----------------------------------------------------------------
		    // 4) min/max + useButtons
		    // -----------------------------------------------------------------
		    var minDate = new Date(today.getFullYear(), today.getMonth(), 1);
		    var maxDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
		    var datepicker4 = qpx.ui({
		        view: "qpDatePicker",
		        width: 220,
		        formatString: "dd.MM.yyyy",
		        min: minDate,
		        max: maxDate,
		        applyValueMode: "useButtons",
		        stylingMode: "outlined"
		    }, "#datepicker4");

		    // -----------------------------------------------------------------
		    // 5) jen čas
		    // -----------------------------------------------------------------
		    var datepicker5 = qpx.ui({
		        view: "qpDatePicker",
		        width: 160,
		        formatString: "HH:mm:ss",
		        value: today,
		        showCalendarButton: true,
		        stylingMode: "outlined"
		    }, "#datepicker5");

		    // -----------------------------------------------------------------
		    // 6) disabled / readOnly
		    // -----------------------------------------------------------------
		    var datepicker6 = qpx.ui({
		        view: "qpDatePicker",
		        width: 220,
		        formatString: "dd.MM.yyyy",
		        value: today,
		        readOnly: true,
		        stylingMode: "outlined"
		    }, "#datepicker6");

		    // -----------------------------------------------------------------
		    // Horní panel: přepínač tématu + stylingMode (aplikuje se na všechny instance)
		    // -----------------------------------------------------------------
		    var allDatePickers = [datepicker1, datepicker2, datepicker3, datepicker4, datepicker5, datepicker6];

		    function applyTheme(themeClass) {
		        allDatePickers.forEach(function (dp) {
		            dp.getContainer().removeClass("qpx-theme-generic-light qpx-theme-generic-dark").addClass(themeClass);
		        });
		        toolbar.option("theme", themeClass.replace("qpx-theme-", ""));
		        $("body").toggleClass("qpx-page-dark", themeClass === "qpx-theme-generic-dark");
		    }

		    function applyStylingMode(mode) {
		        allDatePickers.forEach(function (dp) { dp.option("stylingMode", mode); });
		    }

		    var toolbar = qpx.ui({
		        view: "qpToolBar",
		        theme: "generic-light",
		        items: [
		            {
		                location: "before", widget: "template",
		                template: "<b style='padding:0 4px;'>Styl:</b>"
		            },
		            {
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
		            },
		            {
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
		            }
		        ]
		    }, "#pageToolbar");

		    applyTheme("qpx-theme-generic-light");
		});
		</script>
	</body>
</html>
datepicker.jsp