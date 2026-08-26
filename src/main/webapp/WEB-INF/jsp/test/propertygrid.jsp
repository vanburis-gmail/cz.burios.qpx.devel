<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<!DOCTYPE html>
<html lang="cs">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">

		<title>${appTitle}</title>

		<link rel="icon" href="/devel/favicon.png">
		<link rel="stylesheet" href="/devel/libs/fonts/fontawesome/4.7/css/font-awesome.min.css" type="text/css" media="all" />
		<link rel="stylesheet" href="/devel/libs/qpx/themes/jquery.qpx.default.css?build=${ timeNo }" rel="stylesheet" type="text/css">
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
				<h1>qpPropertyGrid</h1>
				<p class="subtitle"></p>
			</header>
			<main>
				<div id="styleToolbar"></div>
				<div class="demo-row">
					<div id="pg"></div>
				</div>
			</main>
		</div>

		<script>
		    $(function () {
		        qpx.ui({
		            view: "qpPropertyGrid",
		            items: [
		                { field: "firstName", label: "First name", value: "Josef", editor: "text", category: "User" },
		                { field: "age", label: "Age", value: 42, editor: "number", category: "User" },
		                { field: "active", label: "Active", value: true, editor: "switch", category: "Flags" },
		                { field: "role", label: "Role", value: "admin", editor: "dropdown", dataSource: [
		                    { key: "admin", text: "Admin" },
		                    { key: "user", text: "User" }
		                ], category: "User" }
		            ]
		        }, "#pg");
		    });
		</script>

	</body>
</html>
