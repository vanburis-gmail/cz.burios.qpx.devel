<%@ page language="java" contentType="text/html; charset=UTF-8" %>
<!DOCTYPE html>
<html lang="cs">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">

		<title>Buriosca.cz - Devel QPX</title>

		<link rel="icon" href="/devel/favicon.png">
		<link rel="stylesheet" href="/devel/libs/qpx/themes/jquery.qpx.default.css?build=${ timeNo }" rel="stylesheet" type="text/css">
		<%-- 
		<link rel="stylesheet" href="css/qpx.core.css" />
		<link rel="stylesheet" href="css/qpx.treeview.css" />

		<script src="js/jquery.js"></script>
		<script src="js/qpx.core.js"></script>
		<script src="js/qpx.widget.js"></script>
		<script src="js/qpx.treeview.js"></script>
		--%>

		<style>
			body { padding: 20px; }
		</style>

		<script type="text/javascript" src="/devel/libs/jquery/jquery-3.7.1.js"></script>
		<script type="text/javascript" src="/devel/libs/qpx/jquery.qpx.all.js"></script>
		<script>
		</script>
	</head>
	<body class="qpx-theme-generic-light">

		<h2>QPX - qpTreeView – Test</h2>
		<div style="padding:10px 16px 0;">
			<label><input type="checkbox" id="themeToggle"> tmavé téma (generic-dark)</label>
		</div>
		
		<div id="tree"></div>

		<script>
		$(function () {
			/*
			$("#tree").qpx("qpTreeView", {
				items: [
					{ id: 1, parentId: null, text: "Root A", expanded: true },
					{ id: 2, parentId: 1, text: "Child A1" },
					{ id: 3, parentId: 1, text: "Child A2", expanded: true },
					{ id: 4, parentId: 3, text: "Child A2.1" },
					
					{ id: 10, parentId: null, text: "Root B" },
					{ id: 11, parentId: 10, text: "Child B1" },
					{ id: 12, parentId: 10, text: "Child B2" }
				],
				selectionMode: "single",
				showCheckBoxesMode: "normal",
				dragEnabled: true,
				// cascadeCheck: true,
				useIndeterminate: true,				
				onItemClick: function (e) {
					console.log("Item clicked:", e.key, e.itemData && e.itemData.text);
				},
				onSelectionChanged: function (e) {
					console.log("Selected keys:", e.selectedItemKeys);
				},
				onMove: function (e) {
					console.log("Moved:", e.sourceKey, "to parent", e.newParent, "(from", e.oldParent, ")");
				},
				onReorder: function (e) {
					console.log("Reordered:", e.sourceKey, e.dropType, "relative to", e.targetKey);
				},
				onDrop: function (e) {
					console.log("Drop:", e.sourceKey, "->", e.targetKey, "type:", e.dropType);
				}
			});
			*/
			var treeview = qpx.ui({
				view: "qpTreeView",
				theme: "generic-light",
				items: [
					{ id: 1, parentId: null, text: "Root A", expanded: true },
					{ id: 2, parentId: 1, text: "Child A1" },
					{ id: 3, parentId: 1, text: "Child A2", expanded: true },
					{ id: 4, parentId: 3, text: "Child A2.1" },
					
					{ id: 10, parentId: null, text: "Root B" },
					{ id: 11, parentId: 10, text: "Child B1" },
					{ id: 12, parentId: 10, text: "Child B2" }
				],
				selectionMode: "single",
				showCheckBoxesMode: "normal",
				dragEnabled: true,
				// cascadeCheck: true,
				useIndeterminate: true,				
				onItemClick: function (e) {
					console.log("Item clicked:", e.key, e.itemData && e.itemData.text);
				},
				onSelectionChanged: function (e) {
					console.log("Selected keys:", e.selectedItemKeys);
				},
				onMove: function (e) {
					console.log("Moved:", e.sourceKey, "to parent", e.newParent, "(from", e.oldParent, ")");
				},
				onReorder: function (e) {
					console.log("Reordered:", e.sourceKey, e.dropType, "relative to", e.targetKey);
				},
				onDrop: function (e) {
					console.log("Drop:", e.sourceKey, "->", e.targetKey, "type:", e.dropType);
				}
			}, "#tree");

			$("#themeToggle").on("change", function () {
				treeview.option("theme", this.checked ? "generic-dark" : "generic-light");
			});
		});
		</script>
	</body>
</html>
