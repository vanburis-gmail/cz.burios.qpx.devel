<%@ page language="java" contentType="text/html; charset=UTF-8" %>
<!DOCTYPE html>
<html lang="cs">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">

		<title>${appTitle}</title>

		<link rel="icon" href="/devel/favicon.png">
		<link rel="stylesheet" href="/devel/libs/qpx/themes/jquery.qpx.light.css?build=${ timeNo }" rel="stylesheet" type="text/css">

		<style>
			body { padding: 20px; }
			.theme-switch { margin-bottom: 10px; }
			.theme-switch button { margin-right: 5px; }
			#grid { max-width: 600px; }
		</style>

		<script type="text/javascript" src="/devel/libs/jquery/jquery-3.7.1.js"></script>
		<script type="text/javascript" src="/devel/libs/qpx/jquery.qpx.all.js"></script>
		<script>
		</script>
	</head>
	<body class="qpx-theme-generic-light">

		<div class="theme-switch">
			<button onclick="setTheme('qpx-theme-generic-light')">Light</button>
			<button onclick="setTheme('qpx-theme-generic-dark')">Dark</button>
		</div>

		<h2>QPX - qpDataGrid – Test</h2>

		<div id="grid"></div>

		<script>
		function setTheme(cls) {
			document.body.className = cls;
		}

		$(function () {
			$("#grid").qpx("qpDataGrid", {
				dataSource: [
					{ id: 1, name: "Alice", email: "alice@example.com", city: "Prague", age: 29 },
					{ id: 2, name: "Bob", email: "bob@example.com", city: "Brno", age: 35 },
					{ id: 3, name: "Charlie", email: "charlie@example.com", city: "Ostrava", age: 41 },
					{ id: 4, name: "Diana", email: "diana@example.com", city: "Plzeň", age: 24 }
				],
				columns: [
					{ dataField: "name",  caption: "Name",  minWidth: 120 },
					{ dataField: "email", caption: "Email", minWidth: 160 },
					{ dataField: "city",  caption: "City",  minWidth: 100 },
					{ dataField: "age",   caption: "Age",   minWidth: 60 }
				],
				keyExpr: "id",
				selectionMode: "single",
				sorting: { mode: "single" },
				responsive: true,
				onRowClick: function (e) {
					console.log("Row clicked:", e.key, e.data);
				},
				onCellClick: function (e) {
					console.log("Cell clicked:", e.field, "=", e.data[e.field]);
				},
				onSelectionChanged: function (e) {
					console.log("Selected row keys:", e.selectedRowKeys);
				}
			});
		});
		</script>
	</body>
</html>

