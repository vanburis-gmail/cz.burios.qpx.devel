<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix = "c" uri = "http://java.sun.com/jsp/jstl/core" %>

<html lang="cs">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
	
		<title>Buriosca.cz - Darwin QPX</title>

		<link rel="icon" href="/darwin/favicon.png">
		<link rel="stylesheet" href="/darwin/libs/qpx/qpx-default.css?build=${ timeNo }" rel="stylesheet" type="text/css">

		<style type="text/css">
		html, body {
			font-family: Segoe UI;
			font-size: 12px;
		}
		</style>

		<script type="text/javascript" src="/darwin/libs/jquery/jquery-3.7.1.js"></script>
		<%-- 
		<script type="text/javascript" src="/darwin/libs/qpx/jquery.qpx.js"></script>
		--%>
		<script type="text/javascript" src="/darwin/libs/qpx/qpToolBar.js?build=${ timeNo }"></script>
		
		<script></script>
	</head>
	<body style="height: 100vh;overflow: hidden;">

		<%-- 
		<div id="toolbar" data-role="qpToolBar"></div>
		<script>
		$("#toolbar").qpToolbar({
			responsive: true,
			items: [
				{ html: "<button>Nový</button>" },
				{ html: "<span style='width:200px;'>Buriosca.cz - Darwin QPX</span>" },
				{ html: "<button>Uložit</button>" },
				{ html: "<button>Smazat</button>" },
				{ html: "<button>Detail xxxxxxxxxxxxx</button>" }
			]
		});
		/*
		*/
		</script>		
		--%>
		<%--
		<div id="row1" data-role="qpDataGridRow"></div>		
		<script>
		$("#row1").qpDataGridRow({
		    responsive: true,
		    columns: [
		        { field: "id", width: "50px", label: "ID" },
		        { field: "name", width: "200px", label: "Jméno" },
		        { field: "age", width: "100px", label: "Věk" },
		        { field: "email", width: "30%", label: "Email" },
		        { field: "phone", width: "150px", label: "Telefon" }
		    ],
		    data: {
		        id: 1,
		        name: "Jan Novák s velmi dlouhým jménem",
		        age: 30,
		        email: "jan.novak@example.com",
		        phone: "+420 777 123 456"
		    }
		});
		</script>
		<h4>Buriosca.cz - Darwin QPX</h4>
		 --%>
		<div id="grid"></div>
		<script>
		$("#grid").qpDataGrid({
			height: "33%",
			responsive: true,
			columns: [
				{ field: "id", label: "ID", width: "50px" },
				{ field: "name", label: "Jméno", width: "200px" },
				{ field: "age", label: "Věk", width: "100px" },
				{ field: "email", label: "Email", width: "30%" },
				{ field: "phone", label: "Telefon", width: "150px" }
			],
			dataSource: {
				data: [
					{ id: 1, name: "Jan Novák", age: 30, email: "jan.novak@example.com", phone: "+420 777 123 456" },
					{ id: 2, name: "Petr Svoboda", age: 25, email: "petr.svoboda@example.com", phone: "+420 603 854 221" },
					{ id: 3, name: "Pavel Dvořák", age: 25, email: "pavel.dvorak@example.com", phone: "+420 606 654 731" },
					{ id: 4, name: "Jiří Chalupa", age: 25, email: "jiri.chalupa@example.com", phone: "+420 732 654 121" },
					{ id: 6, name: "Miroslav Jeřábek", age: 25, email: "miroslav.jerabek@example.com", phone: "+420 721 654 561" },
					{ id: 7, name: "Milena Svobodová", age: 25, email: "milena.svobodovaá@example.com", phone: "+420 604 644 831" },
					{ id: 5, name: "Eva Malá", age: 28, email: "eva.mala@example.com", phone: "+420 777 111 222" }
				]
			}
			/*
			dataSource: {
				fetch: function(page, pageSize){
					return $.ajax({
						url: "/api/data",
						method: "GET",
						data: { page: page, size: pageSize }
					});
				}
			}			
			 */
		});
		</script>
		<%-- 
		--%>
		<%-- 
		<div id="tabs"></div>
		<script>
		$('#tabs').qpTabs({
			height: "100%",
			items: [
		        { 
					label: "Grid záložka", 
					closable: false,
					content: {
						type: "widget",
						id: "grid1",
						role: "qpDataGrid",
						options: {
							height: "33%",
							responsive: true,
						    columns: [
						        { field: "id", label: "ID", width: "50px" },
						        { field: "name", label: "Jméno", width: "200px" },
						        { field: "age", label: "Věk", width: "100px" },
						        { field: "email", label: "Email", width: "30%" },
						        { field: "phone", label: "Telefon", width: "150px" }
						    ],
						    data: [
						        { id: 1, name: "Jan Novák", age: 30, email: "jan.novak@example.com", phone: "+420 777 123 456" },
						        { id: 2, name: "Petr Svoboda", age: 25, email: "petr.svoboda@example.com", phone: "+420 603 854 221" },
						        { id: 3, name: "Pavel Dvořák", age: 25, email: "pavel.dvorak@example.com", phone: "+420 606 654 731" },
						        { id: 4, name: "Jiří Chalupa", age: 25, email: "jiri.chalupa@example.com", phone: "+420 732 654 121" },
						        { id: 6, name: "Miroslav Jeřábek", age: 25, email: "miroslav.jerabek@example.com", phone: "+420 721 654 561" },
						        { id: 7, name: "Milena Svobodová", age: 25, email: "milena.svobodovaá@example.com", phone: "+420 604 644 831" },
						        { id: 5, name: "Eva Malá", age: 28, email: "eva.mala@example.com", phone: "+420 777 111 222" }
						    ]
						}
					}
				},
				{ 
					label: "Info", 
					closable: true,
					content: {
						type: "html",
						id: "info1",
						role: null,
						html: "<p>Statický HTML obsah</p>"
					}
				}
			]
		});
		</script>
		--%>

	</body>
</html>