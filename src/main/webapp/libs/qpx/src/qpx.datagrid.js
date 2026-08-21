/*!
 * qpx - qpDataGrid
 * Tabulková komponenta inspirovaná DevExtreme dxDataGrid.
 *  - dataSource: array of objects
 *  - columns: [{ dataField, caption, width, minWidth, visible, dataType, format, adaptiveHidden }]
 *  - keyExpr: "id"
 *  - selectionMode: "none" | "single" | "multiple"
 *  - sorting: mode: "none" | "single" | "multiple"
 *  - responsive: adaptive columns do akordeon detailu pod řádkem
 *  - události: onRowClick, onCellClick, onSelectionChanged, onOptionChanged
 */

(function (qpx, $) {
    "use strict";

    var DataGrid = qpx.Widget.extend({

        defaults: {
            dataSource: [],
            columns: [],
            keyExpr: "id",
            selectionMode: "none", // none | single | multiple
            sorting: {
                mode: "single" // none | single | multiple
            },
            visible: true,
            disabled: false,
            responsive: true,

            onRowClick: null,
            onCellClick: null,
            onSelectionChanged: null,
            onOptionChanged: null
        },

        render: function () {
            var cfg = this.config;

            this.$container
                .addClass("qpx-datagrid")
                .toggleClass("qpx-hidden", !cfg.visible)
                .toggleClass("qpx-state-disabled", !!cfg.disabled);

            if (cfg.onRowClick) this.on("rowClick", cfg.onRowClick);
            if (cfg.onCellClick) this.on("cellClick", cfg.onCellClick);
            if (cfg.onSelectionChanged) this.on("selectionChanged", cfg.onSelectionChanged);
            if (cfg.onOptionChanged) this.on("optionChanged", cfg.onOptionChanged);

            this._selectedKeys = [];
            this._sortState = []; // [{ dataField, desc }]
            this._adaptiveOpenRowKey = null;

            this._buildStructure();
            this._bindResize();
            this._bindKeyboard();
            this._renderHeader();
            this._renderBody();
            this._doAdaptiveLayout();
        },

        _buildStructure: function () {
            this.$table = $("<table class='qpx-datagrid-table'></table>");
            this.$thead = $("<thead></thead>");
            this.$tbody = $("<tbody></tbody>");
            this.$table.append(this.$thead, this.$tbody);
            this.$container.empty().append(this.$table);
        },

        _bindResize: function () {
            var self = this;
            this._onWinResize = function () { self._scheduleAdaptiveLayout(); };

            if (window.ResizeObserver) {
                this._resizeObserver = new ResizeObserver(function () { self._scheduleAdaptiveLayout(); });
                this._resizeObserver.observe(this.getNode());
            } else {
                $(window).on("resize.qpxDataGrid" + this.id, this._onWinResize);
            }
        },

        _scheduleAdaptiveLayout: function () {
            var self = this;
            if (this._adaptiveRaf) return;
            this._adaptiveRaf = (window.requestAnimationFrame || window.setTimeout)(function () {
                self._adaptiveRaf = null;
                self._doAdaptiveLayout();
            });
        },

        _bindKeyboard: function () {
            var self = this;

            this.$container.attr("tabindex", "0");

            this.$container.on("keydown.qpxDataGrid", function (e) {
                var rows = self.$tbody.find(".qpx-datagrid-row");
                if (!rows.length) return;

                var selectedKey = self._selectedKeys[0];
                var index = selectedKey ? rows.index(self.$tbody.find("[data-key='" + selectedKey + "']")) : -1;

                function selectRowByIndex(i) {
                    if (i < 0) i = 0;
                    if (i >= rows.length) i = rows.length - 1;
                    var $row = $(rows[i]);
                    var key = $row.data("key");
                    self._selectedKeys = [key];
                    rows.removeClass("qpx-state-selected");
                    $row.addClass("qpx-state-selected");
                    self.trigger("selectionChanged", {
                        selectedRowKeys: self._selectedKeys.slice(),
                        previousRowKeys: [],
                        component: self
                    });
                    $row[0].scrollIntoView({ block: "nearest" });
                }

                switch (e.key) {
                    case "ArrowDown":
                        e.preventDefault();
                        selectRowByIndex(index + 1);
                        break;

                    case "ArrowUp":
                        e.preventDefault();
                        selectRowByIndex(index - 1);
                        break;

                    case "Home":
                        e.preventDefault();
                        selectRowByIndex(0);
                        break;

                    case "End":
                        e.preventDefault();
                        selectRowByIndex(rows.length - 1);
                        break;

                    case "PageDown":
                        e.preventDefault();
                        selectRowByIndex(index + 10);
                        break;

                    case "PageUp":
                        e.preventDefault();
                        selectRowByIndex(index - 10);
                        break;

                    case "Enter":
                        e.preventDefault();
                        if (index >= 0) {
                            var $row = $(rows[index]);
                            var key = $row.data("key");
                            var rowData = self.config.dataSource.filter(function (r) { return r[self.config.keyExpr] === key; })[0];
                            self.trigger("rowClick", { key: key, data: rowData, component: self });
                        }
                        break;
					case "Escape":
					    e.preventDefault();
					    self._closeAdaptiveAccordion();
					    break;

                }
            });
        },

        _renderHeader: function () {
            var self = this;
            var cfg = this.config;
            this.$thead.empty();

            var $tr = $("<tr class='qpx-datagrid-header-row'></tr>");

            cfg.columns.forEach(function (col) {
                if (col.visible === false) return;

                var $th = $("<th class='qpx-datagrid-header-cell'></th>")
                    .attr("data-field", col.dataField)
                    .text(col.caption || col.dataField);

                if (col.width) {
                    $th.css("width", qpx.toPx(col.width));
                }

                if (cfg.sorting && cfg.sorting.mode !== "none") {
                    $th.addClass("qpx-datagrid-sortable");
                    $th.on("click.qpxDataGrid", function () {
                        self._toggleSort(col.dataField);
                    });
                }

                $tr.append($th);
            });

            this.$thead.append($tr);
        },

        _renderBody: function () {
            var self = this;
            var cfg = this.config;
            this.$tbody.empty();
            this._closeAdaptiveAccordion();

            var data = this._getSortedData();

            data.forEach(function (row) {
                var key = row[cfg.keyExpr];
                var selected = self._selectedKeys.indexOf(key) !== -1;

                var $tr = $("<tr class='qpx-datagrid-row'></tr>")
                    .attr("data-key", key)
                    .toggleClass("qpx-state-selected", selected);

                cfg.columns.forEach(function (col) {
                    if (col.visible === false) return;

                    var value = row[col.dataField];
                    var text = self._formatCellValue(value, col);

                    var $td = $("<td class='qpx-datagrid-cell'></td>")
                        .attr("data-field", col.dataField)
                        .text(text);

                    $td.on("click.qpxDataGrid", function () {
                        self._handleCellClick(row, col, $td);
                    });

                    $tr.append($td);
                });
				// Adaptive button cell (always visible when responsive)
				if (self.config.responsive) {
				    var $adaptiveCell = $("<td class='qpx-datagrid-cell qpx-datagrid-cell-adaptive'></td>");
				    var $btn = $("<span class='qpx-datagrid-adaptive-btn' tabindex='0' role='button'>⋯</span>");

				    $btn.on("click.qpxDataGrid", function (e) {
				        e.stopPropagation();
				        self._toggleAdaptiveAccordion(key, row, $tr);
				    });

				    $adaptiveCell.append($btn);
				    $tr.append($adaptiveCell);
				}

                $tr.on("click.qpxDataGrid", function () {
                    self._handleRowClick(row, $tr);
                });

                self.$tbody.append($tr);
            });
        },

        _getSortedData: function () {
            var data = (this.config.dataSource || []).slice();
            var sortState = this._sortState.slice();

            if (!sortState.length) return data;

            data.sort(function (a, b) {
                for (var i = 0; i < sortState.length; i++) {
                    var s = sortState[i];
                    var av = a[s.dataField];
                    var bv = b[s.dataField];

                    if (av == null && bv != null) return s.desc ? 1 : -1;
                    if (av != null && bv == null) return s.desc ? -1 : 1;
                    if (av < bv) return s.desc ? 1 : -1;
                    if (av > bv) return s.desc ? -1 : 1;
                }
                return 0;
            });

            return data;
        },

        _toggleSort: function (dataField) {
            var mode = this.config.sorting && this.config.sorting.mode;
            if (!mode || mode === "none") return;

            var existing = this._sortState.filter(function (s) { return s.dataField === dataField; })[0];

            if (!existing) {
                if (mode === "single") this._sortState = [];
                this._sortState.push({ dataField: dataField, desc: false });
            } else if (!existing.desc) {
                existing.desc = true;
            } else {
                this._sortState = this._sortState.filter(function (s) { return s.dataField !== dataField; });
            }

            this._renderHeader();
            this._renderBody();
            this._doAdaptiveLayout();
        },
		_toggleAdaptiveAccordion: function (key, row, $row) {
		    if (this._adaptiveOpenRowKey === key) {
		        this._closeAdaptiveAccordion();
		        return;
		    }
		    this._openAdaptiveAccordion(key, row, $row);
		},

        _formatCellValue: function (value, col) {
            if (value == null) return "";
            if (col.format && qpx.isFunction(col.format)) {
                return col.format(value);
            }
            return String(value);
        },

        _handleRowClick: function (row, $tr) {
            var cfg = this.config;
            var key = row[cfg.keyExpr];
            var prev = this._selectedKeys.slice();

            if (cfg.selectionMode === "single") {
                this._selectedKeys = [key];
            } else if (cfg.selectionMode === "multiple") {
                var idx = this._selectedKeys.indexOf(key);
                if (idx === -1) this._selectedKeys.push(key);
                else this._selectedKeys.splice(idx, 1);
            }

            this.$tbody.find(".qpx-datagrid-row").removeClass("qpx-state-selected");
            this._selectedKeys.forEach(function (k) {
                this.$tbody.find("[data-key='" + k + "']").addClass("qpx-state-selected");
            }.bind(this));

            this.trigger("rowClick", {
                data: row,
                key: key,
                component: this,
                rowElement: $tr[0]
            });

            if (cfg.selectionMode !== "none") {
                this.trigger("selectionChanged", {
                    selectedRowKeys: this._selectedKeys.slice(),
                    previousRowKeys: prev,
                    component: this
                });
            }
        },

        _handleCellClick: function (row, col, $td) {
            var key = row[this.config.keyExpr];
            this.trigger("cellClick", {
                data: row,
                key: key,
                column: col,
                field: col.dataField,
                cellElement: $td[0],
                component: this
            });
        },

        _doAdaptiveLayout: function () {
            if (!this.config.responsive) return;
            if (!this.$table || !this.$table.length) return;

            var availableWidth = this.$table.parent().width();
            if (!availableWidth) return;

            var cols = this.config.columns;
            var totalMinWidth = 0;

            cols.forEach(function (col) {
                if (col.visible === false) return;
                var mw = col.minWidth || col.width || 80;
                totalMinWidth += mw;
            });

            var needAdaptive = totalMinWidth > availableWidth;

            this.$container.toggleClass("qpx-datagrid-adaptive", needAdaptive);

            cols.forEach(function (col) {
                col.adaptiveHidden = false;
            });

            if (!needAdaptive) {
                this.$thead.find("th").show();
                this.$tbody.find("td").show();
                this._closeAdaptiveAccordion();
                return;
            }

            var remaining = totalMinWidth;
            cols.slice().reverse().forEach(function (col) {
                if (remaining <= availableWidth) return;
                if (col.visible === false) return;

                col.adaptiveHidden = true;
                remaining -= (col.minWidth || col.width || 80);
            });

            this.$thead.find(".qpx-datagrid-header-cell").each(function () {
                var field = $(this).attr("data-field");
                if (!field) return;
                var col = cols.filter(function (c) { return c.dataField === field; })[0];
                if (!col) return;
                $(this).toggle(!col.adaptiveHidden);
            });

            this.$tbody.find(".qpx-datagrid-row").each(function () {
                var $row = $(this);
                $row.find(".qpx-datagrid-cell").each(function () {
                    var field = $(this).attr("data-field");
                    if (!field) return;
                    var col = cols.filter(function (c) { return c.dataField === field; })[0];
                    if (!col) return;
                    $(this).toggle(!col.adaptiveHidden);
                });
            });
        },

        _openAdaptiveAccordion: function (key, row, $row) {
            this._closeAdaptiveAccordion();

            var cols = this.config.columns.filter(function (c) {
                return c.visible !== false && c.adaptiveHidden;
            });

            if (!cols.length) return;

            var colspan = this.config.columns.filter(function (c) { return c.visible !== false; }).length;

            var $detail = $("<tr class='qpx-datagrid-detail-row'></tr>");
            var $td = $("<td class='qpx-datagrid-detail-cell' colspan='" + colspan + "'></td>");

            var $acc = $("<div class='qpx-datagrid-accordion'></div>");

            cols.forEach(function (col) {
                var value = row[col.dataField];
                var text = (value == null ? "" : value);

                var $item = $("<div class='qpx-datagrid-accordion-item'></div>");
                var $header = $("<div class='qpx-datagrid-accordion-header'></div>").text(col.caption || col.dataField);
                var $content = $("<div class='qpx-datagrid-accordion-content'></div>").text(text);

                $header.on("click", function () {
                    $content.slideToggle(120);
                });

                $item.append($header, $content);
                $acc.append($item);
            });

            $td.append($acc);
            $detail.append($td);

            $row.after($detail);
            this._adaptiveOpenRowKey = key;
        },

        _closeAdaptiveAccordion: function () {
            this.$tbody.find(".qpx-datagrid-detail-row").remove();
            this._adaptiveOpenRowKey = null;
        },

        option: function (name, value) {
            if (arguments.length === 0) return this.config;
            if (qpx.isObject(name)) {
                var self = this;
                $.each(name, function (k, v) { self.option(k, v); });
                return this;
            }
            if (arguments.length === 1) return this.config[name];

            var prev = this.config[name];
            if (prev === value) return this;

            this.config[name] = value;

            if (name === "dataSource" || name === "columns") {
                this._renderHeader();
                this._renderBody();
                this._doAdaptiveLayout();
            } else if (name === "visible") {
                this.$container.toggleClass("qpx-hidden", !value);
            } else if (name === "disabled") {
                this.$container.toggleClass("qpx-state-disabled", !!value);
            }

            this.trigger("optionChanged", { name: name, value: value, previousValue: prev });
            return this;
        },

        destroy: function () {
            if (this._resizeObserver) this._resizeObserver.disconnect();
            $(window).off(".qpxDataGrid" + this.id);
            this.$container.off(".qpxDataGrid");
            this._super();
        }
    });

    qpx.registerWidget("qpDataGrid", DataGrid);
    qpx.qpDataGrid = DataGrid;

})(window.qpx, jQuery);
