/**
 * qpDataGrid
 */
var qpDataGrid = qpWidget.extend({

    defaults: {
        data: [],
        columns: [],
        responsive: true,
        rowHeight: 32,
        selectable: true,
        editable: false,
        template: null,
        onRowClick: null,
        onRowDblClick: null,
        onRowSelect: null,
        selectionMode: "single"
    },

    _create: function () {
        this.el.addClass("qp-dg");
        this.el.data("qpDataGrid", this);

        if (!this.options.columns.some(c => c.fill)) {
            this.options.columns.push({ fill: true });
        }

        this.header = $('<div class="qp-dg-header"></div>').appendTo(this.el);
        this.body = $('<div class="qp-dg-body"></div>').appendTo(this.el);

        this._renderHeader();
        this._renderRows();
        this._bindKeyboardNavigation();
    },

    _renderHeader: function () {
        var self = this;

        var html = this.options.columns.map(function (col, i) {

            if (col.fill) {
                return '<div class="qp-dg-header-cell qp-dg-fill"></div>';
            }

            var style = col.width ? 'style="flex:0 0 ' + col.width + 'px"' : "";

            return `
                <div class="qp-dg-header-cell" 
                     data-col="${i}" 
                     draggable="true"
                     ${style}>
                    ${col.title || ""}
                    <div class="qp-dg-resize" data-col="${i}"></div>
                </div>
            `;
        }).join("");

        this.header.html(html);

        this._bindResizeHandles();
        this._bindColumnReorder();
    },

    _renderRows: function () {
        var self = this;
        this.body.empty();
        this.rows = [];

        this.options.data.forEach(function (rowData, index) {
            var $row = $('<div class="qp-dg-row"></div>').appendTo(self.body);

            var row = new qpDataGridRow($row, {
                index: index,
                data: rowData,
                columns: self.options.columns,
                responsive: self.options.responsive,
                selectable: self.options.selectable,
                editable: self.options.editable,
                template: self.options.template,
                selectionMode: self.options.selectionMode,

                onClick: function (data, row) {
                    if (self.options.onRowClick) self.options.onRowClick(data, row);
                },
                onDblClick: function (data, row) {
                    if (self.options.onRowDblClick) self.options.onRowDblClick(data, row);
                },
                onSelect: function (data, row) {
                    if (self.options.onRowSelect) self.options.onRowSelect(data, row);
                }
            });

            self.rows.push(row);
        });
    },

    // ---------------------------------------------------------
    // DRAG-RESIZE
    // ---------------------------------------------------------
    _bindResizeHandles: function () {
        var self = this;

        this.header.find(".qp-dg-resize").each(function () {
            var handle = $(this);
            var colIndex = parseInt(handle.data("col"), 10);

            handle.on("mousedown", function (e) {
                e.preventDefault();
                e.stopPropagation();

                var startX = e.pageX;
                var startWidth = self.options.columns[colIndex].width || 100;

                function onMove(e2) {
                    var delta = e2.pageX - startX;
                    var newWidth = Math.max(40, startWidth + delta);

                    self.options.columns[colIndex].width = newWidth;

                    self._renderHeader();

                    self.rows.forEach(r => r.setColumnWidth(colIndex, newWidth));
                    self.rows.forEach(r => r._reflow());
                }

                function onUp() {
                    $(document).off("mousemove", onMove);
                    $(document).off("mouseup", onUp);
                }

                $(document).on("mousemove", onMove);
                $(document).on("mouseup", onUp);
            });
        });
    },

    // ---------------------------------------------------------
    // DRAG-REORDER
    // ---------------------------------------------------------
    _bindColumnReorder: function () {
        var self = this;
        var headerCells = this.header.find(".qp-dg-header-cell");

        var dragSrcIndex = null;

        headerCells.on("dragstart", function (e) {
            dragSrcIndex = parseInt($(this).data("col"), 10);
            $(this).addClass("drag-source");
            e.originalEvent.dataTransfer.effectAllowed = "move";
        });

        headerCells.on("dragenter", function (e) {
            e.preventDefault();
            $(this).addClass("drag-over");
        });

        headerCells.on("dragover", function (e) {
            e.preventDefault();
            e.originalEvent.dataTransfer.dropEffect = "move";
        });

        headerCells.on("dragleave", function () {
            $(this).removeClass("drag-over");
        });

        headerCells.on("drop", function (e) {
            e.preventDefault();
            headerCells.removeClass("drag-over drag-source");

            var targetIndex = parseInt($(this).data("col"), 10);

            if (dragSrcIndex === targetIndex) return;

            var cols = self.options.columns;
            var tmp = cols[dragSrcIndex];
            cols.splice(dragSrcIndex, 1);
            cols.splice(targetIndex, 0, tmp);

            self._renderHeader();
            self._renderRows();
            self.rows.forEach(r => r._reflow());
        });

        headerCells.on("dragend", function () {
            headerCells.removeClass("drag-over drag-source");
        });
    },

    // ---------------------------------------------------------
    // KEYBOARD NAVIGATION (↑ / ↓)
    // ---------------------------------------------------------
    _bindKeyboardNavigation: function () {
        var self = this;

        this.el.attr("tabindex", 0);

        this.el.on("keydown", function (e) {
            if (!self.options.selectable) return;

            var key = e.key;

            if (key !== "ArrowDown" && key !== "ArrowUp") return;

            e.preventDefault();

            var selectedIndex = self._getSelectedRowIndex();

            if (selectedIndex === -1) {
                if (self.rows.length > 0) {
                    self._selectRowByIndex(0);
                }
                return;
            }

            if (key === "ArrowDown" && selectedIndex < self.rows.length - 1) {
                self._selectRowByIndex(selectedIndex + 1);
            }

            if (key === "ArrowUp" && selectedIndex > 0) {
                self._selectRowByIndex(selectedIndex - 1);
            }
        });
    },

    _getSelectedRowIndex: function () {
        for (var i = 0; i < this.rows.length; i++) {
            if (this.rows[i].el.hasClass("selected")) {
                return i;
            }
        }
        return -1;
    },

    _selectRowByIndex: function (index) {
        var row = this.rows[index];
        if (!row) return;

        if (this.options.selectionMode === "single") {
            this._deselectAllExcept(row);
        }

        row.select();

        row.el[0].scrollIntoView({ block: "nearest", behavior: "smooth" });
    },

    _deselectAllExcept: function (row) {
        this.rows.forEach(r => {
            if (r !== row) r.deselect();
        });
    },

    refresh: function () {
        this._renderRows();
    },

    setData: function (data) {
        this.options.data = data;
        this.refresh();
    },

    getRow: function (index) {
        return this.rows[index];
    },

    destroy: function () {
        if (this.rows) {
            this.rows.forEach(r => r.destroy());
        }
        this.el.empty();
        this.el.removeData(this._widgetName);
    }
});

$.qpDefine("qpDataGrid", qpDataGrid);
