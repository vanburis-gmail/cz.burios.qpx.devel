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
		html, body {
			margin: 0;
			font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
			background: #f4f5f7;
			color: #222;
		}
		body.qpx-page-dark { background: #1b1b1b; color: #eee; }
		.qpx-testbar {
			display: flex;
			flex-wrap: wrap;
			gap: 16px;
			align-items: center;
			padding: 12px 64px;
			background: #ffffff;
			border-bottom: 1px solid #e0e0e0;
			position: sticky;
			top: 0;
			left: 64px;
			z-index: 10;
		}
		body.qpx-page-dark .qpx-testbar { background: #262626; border-bottom-color: #3f3f3f; }
		
		.qpx-testbar label {
			display: flex;
			align-items: center;
			gap: 6px;
			font-size: 13px;
			font-weight: 600;
			white-space: nowrap;
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
		.qpx-demo-wrap {
			max-width: 1100px;
			margin: 28px auto;
			padding: 0 20px 60px;
		}
		.qpx-demo-wrap h2 { font-size: 16px; margin: 28px 0 10px; }
		.qpx-demo-note { font-size: 12px; opacity: 0.7; margin: 4px 0 12px; }
		.qpx-back-home {
			position: fixed;
			top: 8px;
			left: 8px;
			font-size: 20px;
			color: #444;
			text-decoration: none;
			z-index: 9999;
			padding: 6px 10px;
			background: rgba(255,255,255,0.85);
			border-radius: 6px;
			box-shadow: 0 0 4px rgba(0,0,0,0.2);
		}
		.qpx-back-home:hover {
			background: #fff;
			color: #000;
		}
		</style>

		<script type="text/javascript" src="/devel/libs/jquery/jquery-3.7.1.js"></script>
		<script type="text/javascript" src="/devel/libs/qpx/jquery.qpx.all.js"></script>
	</head>
	<body>
		<!-- návratová ikona vlevo nahoře -->
		<div>
			<a href="/devel/" class="qpx-back-home" title="Zpět na hlavní stránku">
				<span class="fa fa-home"></span>
			</a>
		</div>
		<div class="qpx-testbar">
			<strong>QPX qpDataGrid – test</strong>
			<label>Téma:
				<select id="ctlTheme">
					<option value="qpx-theme-generic-light">generic-light</option>
					<option value="qpx-theme-generic-dark">generic-dark</option>
				</select>
			</label>
		
			<label><input type="checkbox" id="ctlBorders" checked> borders</label>
			<label><input type="checkbox" id="ctlRowLines" checked> row lines</label>
			<label><input type="checkbox" id="ctlColumnLines" checked> column lines</label>
			<label><input type="checkbox" id="ctlAlternation"> alternation</label>
			<label><input type="checkbox" id="ctlWordWrap"> word wrap</label>
		
			<label>Selection:
				<select id="ctlSelection">
					<option value="none">none</option>
					<option value="single">single</option>
					<option value="multiple" selected>multiple</option>
				</select>
			</label>
		
			<label>Sorting:
				<select id="ctlSorting">
					<option value="none">none</option>
					<option value="single" selected>single</option>
					<option value="multiple">multiple (shift-klik)</option>
				</select>
			</label>
		
			<label><input type="checkbox" id="ctlPaging" checked> paging</label>
			<label><input type="checkbox" id="ctlSearch" checked> search panel</label>
			<label><input type="checkbox" id="ctlFilterRow"> filter row</label>
			<label><input type="checkbox" id="ctlResizing"> column resizing</label>
			<label><input type="checkbox" id="ctlResponsive" checked> responsive (adaptive)</label>
		
			<label>
				Editing:
				<select id="ctlEditing">
					<option value="off" selected>vypnuto</option>
					<option value="on">add/update/delete</option>
				</select>
			</label>
		</div>
		
		<div class="qpx-demo-wrap">
			<h2>qpDataGrid – hlavní demo</h2>
			<p class="qpx-demo-note">
				Zúžením okna prohlížeče vyzkoušíte adaptivní chování (skryté sloupce
				se přesunou do akordeonu přes tlačítko „⋯“). Klikem na hlavičku
				sloupce řadíte, se zapnutým „multiple“ řazením + Shift přidáváte
				další úroveň řazení.
			</p>
			<div id="grid1" ></div>
		
		</div>

		<script>
		$(function () {
			var employees = [
				{ id: 1, firstName: "Jan", lastName: "Novák", position: "Vývojář", department: "IT", hireDate: "2019-03-12", salary: 62000, active: true },
				{ id: 2, firstName: "Petra", lastName: "Svobodová", position: "Projektová manažerka", department: "IT", hireDate: "2017-06-01", salary: 78000, active: true },
				{ id: 3, firstName: "Tomáš", lastName: "Dvořák", position: "Tester", department: "QA", hireDate: "2021-01-15", salary: 48000, active: true },
				{ id: 4, firstName: "Lucie", lastName: "Černá", position: "HR specialistka", department: "HR", hireDate: "2020-09-01", salary: 45000, active: false },
				{ id: 5, firstName: "Martin", lastName: "Procházka", position: "DevOps inženýr", department: "IT", hireDate: "2018-11-20", salary: 71000, active: true },
				{ id: 6, firstName: "Eva", lastName: "Krejčová", position: "Účetní", department: "Finance", hireDate: "2016-04-04", salary: 52000, active: true },
				{ id: 7, firstName: "Pavel", lastName: "Horák", position: "Vývojář", department: "IT", hireDate: "2022-02-28", salary: 58000, active: true },
				{ id: 8, firstName: "Kateřina", lastName: "Marková", position: "Obchodní zástupkyně", department: "Obchod", hireDate: "2019-07-19", salary: 55000, active: false },
				{ id: 9, firstName: "Jakub", lastName: "Kučera", position: "Analytik", department: "Finance", hireDate: "2020-01-10", salary: 60000, active: true },
				{ id: 10, firstName: "Barbora", lastName: "Veselá", position: "UX designérka", department: "IT", hireDate: "2021-08-23", salary: 57000, active: true },
				{ id: 11, firstName: "Ondřej", lastName: "Beneš", position: "Vedoucí týmu", department: "IT", hireDate: "2015-05-05", salary: 92000, active: true },
				{ id: 12, firstName: "Nikola", lastName: "Fialová", position: "Recruiterka", department: "HR", hireDate: "2022-10-01", salary: 43000, active: true },
				{ id: 13, firstName: "Filip", lastName: "Král", position: "Tester", department: "QA", hireDate: "2023-03-06", salary: 46000, active: true },
				{ id: 14, firstName: "Simona", lastName: "Pokorná", position: "Účetní", department: "Finance", hireDate: "2018-12-12", salary: 50000, active: false },
				{ id: 15, firstName: "Vojtěch", lastName: "Sedláček", position: "Vývojář", department: "IT", hireDate: "2023-06-15", salary: 54000, active: true }
			];
			var grid = qpx.ui({
				view: "qpDataGrid",
				width: "100%",
				height: 250,
				keyExpr: "id",
				dataSource: employees,
				columns: [
					{ dataField: "firstName", caption: "Jméno", width: 120, minWidth: 100 },
					{ dataField: "lastName", caption: "Příjmení", width: 130, minWidth: 100 },
					{ dataField: "position", caption: "Pozice", width: 190, minWidth: 140 },
					{ dataField: "department", caption: "Oddělení", width: 110, minWidth: 90 },
					{ dataField: "hireDate", caption: "Nástup", width: 110, minWidth: 100, dataType: "date" },
					{ dataField: "salary", caption: "Mzda", width: 130, minWidth: 100, dataType: "number", alignment: "right", format: "currency" },
					{ dataField: "active", caption: "Aktivní", width: 90, minWidth: 80, dataType: "boolean", alignment: "center" }
				],
				selection: { 
					showCheckBoxesMode: "always", 
					mode: "single"
				},
				sorting: { mode: "single" },
				// paging: { enabled: true, pageSize: 5 },
				// pager: { visible: "auto", allowedPageSizes: [5, 10, 20], showPageSizeSelector: true, showInfo: true, showNavigationButtons: true },
				// searchPanel: { visible: true, placeholder: "Hledat zaměstnance..." },
				filterRow: { visible: false },
				editing: { mode: "row", allowUpdating: false, allowAdding: false, allowDeleting: false },
				responsive: true,
				allowColumnResizing: true,
				onRowClick: function (e) {
					console.log("rowClick ->", e.data.firstName, e.data.lastName);
				},
				onSelectionChanged: function (e) {
					console.log("selectionChanged -> vybráno", e.selectedRowKeys.length, "řádků");
				},
				onRowInserted: function (e) { console.log("rowInserted ->", e.data); },
				onRowUpdated: function (e) { console.log("rowUpdated ->", e.data); },
				onRowRemoved: function (e) { console.log("rowRemoved ->", e.key); },
				onContentReady: function () { console.log("qpDataGrid: contentReady"); }
			}, "#grid1");
		
			// -----------------------------------------------------------------
			// Ovládací panel nahoře -> volání .option(...) na instanci
			// -----------------------------------------------------------------
			function applyTheme(themeClass) {
				grid.getContainer()
					.removeClass("qpx-theme-generic-light qpx-theme-generic-dark")
					.addClass(themeClass);
				$("body").toggleClass("qpx-page-dark", themeClass === "qpx-theme-generic-dark");
			}
			applyTheme($("#ctlTheme").val());
			$("#ctlTheme").on("change", function () { applyTheme(this.value); });
			
			$("#ctlBorders").on("change", function () { grid.option("showBorders", this.checked); });
			$("#ctlRowLines").on("change", function () { grid.option("showRowLines", this.checked); });
			$("#ctlColumnLines").on("change", function () { grid.option("showColumnLines", this.checked); });
			$("#ctlAlternation").on("change", function () { grid.option("rowAlternationEnabled", this.checked); });
			$("#ctlWordWrap").on("change", function () { grid.option("wordWrapEnabled", this.checked); });
		
			$("#ctlSelection").on("change", function () { grid.option("selection.mode", this.value); });
			$("#ctlSorting").on("change", function () { grid.option("sorting.mode", this.value); });
			
			$("#ctlPaging").on("change", function () { grid.option("paging.enabled", this.checked); });
			$("#ctlSearch").on("change", function () { grid.option("searchPanel.visible", this.checked); });
			$("#ctlFilterRow").on("change", function () { grid.option("filterRow.visible", this.checked); });
			$("#ctlResizing").on("change", function () { grid.option("allowColumnResizing", this.checked); });
			$("#ctlResponsive").on("change", function () { grid.option("responsive", this.checked); });
			
			$("#ctlEditing").on("change", function () {
				var on = this.value === "on";
				grid.option("editing", {
					mode: "row",
					allowUpdating: on,
					allowAdding: on,
					allowDeleting: on,
					confirmDelete: true
				});
			});
		});
		</script>
	</body>
</html>