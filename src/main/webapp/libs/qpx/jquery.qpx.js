/* ============================================================================
 * PLUGIN: qpWidget
 * ============================================================================
 * 
 * Příklady použití:
 * 
 * // Inicializace
 * $('#myDiv').qpWidget({ wrapper: '#container' });
 * 
 * // Přístup k instanci
 * var widget = $('#myDiv').data('qpWidget');
 * 
 * // Bind události
 * widget.bind('click', function() { console.log('Klik!'); });
 * 
 * // Trigger události
 * widget.trigger('customEvent', { foo: 'bar' });
 * 
 * // Resize
 * widget.resize();
 * 
 * // Set options
 * widget.setOptions({ wrapper: '#newWrapper' });
 * 
 * // Destroy
 * widget.destroy();
 * 
 * --------------------------
 * // Autodetekce
 * $(function() {
 * 		$("[data-role='qpWidget']").qpWidget();
 * });
 */
(function($) {
	$.fn.qpWidget = function(options) {
		var settings = $.extend({
			wrapper: null
		}, options);

		return this.each(function() {
			var $element = $(this);
			var $wrapper = settings.wrapper ? $(settings.wrapper) : $element;

			var widget = {
				element: $element,
				wrapper: $wrapper,
				options: settings,

				bind: function(event, handler) {
					this.element.on(event, handler);
				},
				unbind: function(event) {
					this.element.off(event);
				},
				trigger: function(event, data) {
					this.element.trigger(event, data);
				},
				resize: function() {
					var h = this.element.outerHeight();
					this.wrapper.css("height", h + "px");
				},
				destroy: function() {
					this.unbind();
					this.element.removeData("qpWidget");
					this.element.empty();
				},
				setOptions: function(newOptions) {
					this.options = $.extend(this.options, newOptions);
				}
			};
			$element.data("qpWidget", widget);
		});
	};
})(jQuery);

/* ============================================================================
 * PLUGIN: qpToolbar
 * ============================================================================
 */
(function($) {
	$.fn.qpToolbar = function(optionsOrMethod) {
		return this.each(function() {
			var $el = $(this);

			var defaults = {
				items: [],       // [{ html:"<button>OK</button>" }, { widget: {...} }]
				responsive: false
			};

			var settings = $.extend(true, {}, defaults, optionsOrMethod);
			$el.data("qpToolbar", settings);

			function init() {
				$el.addClass("qp-toolbar").css({
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					position: "relative",
					width: "100%"
				});

				var $items = [];
				settings.items.forEach(function(item) {
					var $cell = $("<div>").addClass("qp-toolbar-item");

					if (item.html) {
						$cell.html(item.html);
					}
					if (item.widget) {
						// inicializace widgetu
						$cell.qpWidget(item.widget);
					}

					$el.append($cell);
					$items.push($cell);
				});

				// popup button + popup
				var $popupBtn = $("<button>").addClass("qp-toolbar-popup-btn").html("&#8942;").hide();
				var $popup = $("<div>").addClass("qp-toolbar-popup");
				$("body").append($popup); // plovoucí div mimo toolbar
				$el.append($popupBtn);

				$popupBtn.on("click", function(e) {
					e.stopPropagation();
					var offset = $el.offset();
					$popup.css({
						top: offset.top + $el.outerHeight(),
						left: offset.left,
						minWidth: $el.outerWidth()
					}).toggle();
				});

				$(document).on("click", function() {
					$popup.hide();
				});

				if (settings.responsive) {
					var ro = new ResizeObserver(function() {
						var availableWidth = $el.width() - $popupBtn.outerWidth();
						var usedWidth = 0;

						$popup.empty();
						$items.forEach(function($c) { $c.show(); });

						settings.items.forEach(function(item, idx) {
							var $c = $items[idx];
							var w = $c.outerWidth(true);
							if (usedWidth + w <= availableWidth) {
								usedWidth += w;
							} else {
								$c.hide();
								var $clone = $c.clone(true, true);
								$clone.css({
									display: "flex",
									width: "100%",
									justifyContent: "flex-start"
								});
								$popup.append($clone);
							}
						});

						if ($popup.children().length > 0) {
							$popupBtn.show();
						} else {
							$popupBtn.hide();
							$popup.hide();
						}
					});
					ro.observe($el[0]);
				}
			}

			init();
		});
	};
})(jQuery);


// ============================================================================
// PLUGIN: qpDataGridRow
// ============================================================================

(function($) {
	$.fn.qpDataGridRow = function(optionsOrMethod) {
		return this.each(function() {
			var $el = $(this);

			var defaults = {
				columns: [],
				data: {},
				responsive: false
			};

			var settings = $.extend(true, {}, defaults, optionsOrMethod);
			$el.data("qpDataGridRow", settings);

			function init() {
				$el.addClass("qp-datagrid-row");

				var $cells = [];
				settings.columns.forEach(function(col) {
					var $cell = $("<div>").addClass("qp-datagrid-cell");

					if (col.width) {
						if (col.width.indexOf("px") > -1) {
							$cell.css({ width: col.width, flex: "0 0 " + col.width });
						} else if (col.width.indexOf("%") > -1) {
							$cell.css({ width: col.width, flex: "0 0 " + col.width });
						} else {
							$cell.css({ flex: "0 0 auto" });
						}
					} else {
						$cell.css({ flex: "0 0 auto" });
					}

					var val = settings.data[col.field] || "";
					$cell.text(val);

					$el.append($cell);
					$cells.push($cell);
				});

				var $filler = $("<div>").addClass("qp-datagrid-cell-filler");
				$el.append($filler);

				var $popupBtn = $("<button>").addClass("qp-datagrid-popup-btn").html("&#8942;").hide();
				var $popup = $("<div>").addClass("qp-datagrid-popup");
				$el.after($popupBtn).append($popup);

				$popupBtn.on("click", function() {
					$popup.toggle();
				});

				if (settings.responsive) {
					var ro = new ResizeObserver(function() {
						var availableWidth = $el.width() - $popupBtn.outerWidth();
						var usedWidth = 0;

						$popup.empty();
						$cells.forEach(function($c) { $c.show(); });

						// znovu spočítáme
						settings.columns.forEach(function(col, idx) {
							var $c = $cells[idx];
							var w = $c.outerWidth(true);
							if (usedWidth + w <= availableWidth) {
								usedWidth += w;
							} else {
								$c.hide();
							}
						});

						// naplníme popup podle pořadí columns
						settings.columns.forEach(function(col, idx) {
							var $c = $cells[idx];
							if ($c.is(":hidden")) {
								var val = settings.data[col.field] || "";
								var $popupItem = $("<div>").addClass("qp-datagrid-popup-item");

								if (col.label) {
									var $label = $("<div>").addClass("qp-datagrid-popup-label").text(col.label);
									$popupItem.append($label);
								}

								var $value = $("<div>").addClass("qp-datagrid-popup-value").text(val);
								$popupItem.append($value);

								$popup.append($popupItem);
							}
						});

						if ($popup.children().length > 0) {
							$popupBtn.show();
						} else {
							$popupBtn.hide();
							$popup.hide();
						}

						// aktualizace min-height popupu podle výšky řádku
						var rowHeight = $el.outerHeight();
						$popup.css("--row-height", rowHeight + "px");
					});
					ro.observe($el[0]);
				}
			}

			init();
		});
	};
	$(function() {
		// $("[data-role='qpToolBar']").qpToolBar();
		$("[data-role='qpWidget']").qpWidget();
	});
})(jQuery);

// ============================================================================
// PLUGIN: qpDataGrid
// ============================================================================

(function($) {
	$.fn.qpDataGrid = function(optionsOrMethod) {
		return this.each(function() {
			var $el = $(this);

			var defaults = {
				columns: [],
				rows: [],
				height: null,
				responsive: false
			};

			var settings = $.extend(true, {}, defaults, optionsOrMethod);
			$el.data("qpDataGrid", settings);

			function init() {
				/* 
				$el.addClass("qp-datagrid").css({
					height: settings.height
				});
				*/
				if (settings.height !== null) {
					if (typeof settings.height === "number") {
						// číslo → px
						$el.css("height", settings.height + "px");
 					} else if (typeof settings.height === "string") {
						// string → přímo CSS hodnota
						$el.css("height", settings.height);
					}
				}
				// header
				var $header = $("<div>").addClass("qp-datagrid-header");
				settings.columns.forEach(function(col) {
					var $hcell = $("<div>").addClass("qp-datagrid-header-cell");
					$hcell.text(col.label || col.field);
					if (col.width) {
						if (col.width.indexOf("px") > -1) {
							$hcell.css({ width: col.width, flex: "0 0 " + col.width });
						} else if (col.width.indexOf("%") > -1) {
							$hcell.css({ width: col.width, flex: "0 0 " + col.width });
						} else {
							$hcell.css({ flex: "0 0 auto" });
						}
					} else {
						$hcell.css({ flex: "0 0 auto" });
					}
					$header.append($hcell);
				});
				$el.append($header);

				// body
				var $body = $("<div>").addClass("qp-datagrid-body");
				$el.append($body);

				settings.rows.forEach(function(rowData) {
					var $row = $("<div>").attr("data-role", "qpDataGridRow");
					$body.append($row);
					$row.qpDataGridRow({
						columns: settings.columns,
						data: rowData,
						responsive: settings.responsive
					});
				});

				// pokud není responsive → horizontální scroll
				if (!settings.responsive) {
					$body.addClass("scroll-x");
				}
			}

			init();
		});
	};
})(jQuery);

// ============================================================================
// PLUGIN: qpTabs
// ============================================================================

(function($) {
    $.fn.qpTabs = function(options) {
        var settings = $.extend({
            height: null,
            items: [],
            onSelect: null,
            onClose: null,
            onInitWidget: null
        }, options);

        return this.each(function() {
            var $container = $(this).addClass("qp-tabs");

            // Nastavení výšky
            if (settings.height !== null) {
                if (typeof settings.height === "number") {
                    $container.css("height", settings.height + "px");
                } else if (typeof settings.height === "string") {
                    $container.css("height", settings.height);
                } else if (!isNaN(settings.height)) {
                    $container.css("height", parseInt(settings.height, 10) + "px");
                }
            }

            var $tabHeader = $("<ul>").addClass("qp-tabs-header");
            var $tabContent = $("<div>").addClass("qp-tabs-content");

            $.each(settings.items, function(index, item) {
                var $tab = $("<li>")
                    .addClass("qp-tab")
                    .text(item.label);

                // closable záložka
                if (item.closable) {
                    var $close = $("<span>")
                        .addClass("qp-tab-close")
                        .html("&times;")
                        .on("click", function(e) {
                            e.stopPropagation();
                            $tab.remove();
                            $tabContent.children().eq(index).remove();

                            if (typeof settings.onClose === "function") {
                                settings.onClose(index, item);
                            }
                        });
                    $tab.append($close);
                }

                $tab.on("click", function() {
                    $tabHeader.find(".active").removeClass("active");
                    $(this).addClass("active");
                    $tabContent.children().hide().eq(index).show();

                    if (typeof settings.onSelect === "function") {
                        settings.onSelect(index, item);
                    }
                });

                $tabHeader.append($tab);

                // Obsah záložky
                var $content = $("<div>")
                    .addClass("qp-tab-body")
                    .attr("id", item.content.id || ("tab-content-" + index))
                    .hide();

                if (item.content.type === "html") {
                    $content.html(item.content.html || "");
                } else if (item.content.type === "widget") {
                    $content.attr("data-role", item.content.role);

                    var $widgetDiv = $("<div>")
                        .attr("id", item.content.id)
                        .attr("data-role", item.content.role);

                    $content.append($widgetDiv);

                    // Okamžitá inicializace widgetu
                    if (item.content.role === "qpDataGrid" && typeof $widgetDiv.qpDataGrid === "function") {
                        $widgetDiv.qpDataGrid(item.content.options || {});
                    } else if (typeof $widgetDiv[item.content.role] === "function") {
                        $widgetDiv[item.content.role](item.content.options || {});
                    }

                    if (typeof settings.onInitWidget === "function") {
                        settings.onInitWidget(index, item, $widgetDiv);
                    }
                }

                $tabContent.append($content);
            });

            // Aktivovat první záložku
            $tabHeader.find("li").first().addClass("active");
            $tabContent.children().first().show();

            $container.append($tabHeader).append($tabContent);
        });
    };
})(jQuery);

