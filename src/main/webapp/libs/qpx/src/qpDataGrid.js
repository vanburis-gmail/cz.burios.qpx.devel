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
		selectionMode: "single", 
		reorderable: false
	},

	_create: function() {
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

	_renderHeader: function() {
		var self = this;

		this.header.empty();
		this.headerCells = [];

		this.options.columns.forEach(function(col, i) {
			var $cell = $('<div></div>').appendTo(self.header);
			var cell = new qpDataGridHeaderCell($cell, {
			    index: i,
			    column: col,
			    grid: self,
			    reorderable: self.options.reorderable   // <<< NOVÉ
			});

			self.headerCells.push(cell);
		});
	},

	_renderRows: function() {
		var self = this;
		this.body.empty();
		this.rows = [];

		this.options.data.forEach(function(rowData, index) {
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

				onClick: function(data, row) {
					if (self.options.onRowClick) self.options.onRowClick(data, row);
				},
				onDblClick: function(data, row) {
					if (self.options.onRowDblClick) self.options.onRowDblClick(data, row);
				},
				onSelect: function(data, row) {
					if (self.options.onRowSelect) self.options.onRowSelect(data, row);
				}
			});

			self.rows.push(row);
		});
	},

	// ---------------------------------------------------------
	// DRAG-RESIZE
	// ---------------------------------------------------------
	_onHeaderResizeStart: function(e, index) {
		var self = this;
		this._isResizing = true;

		var startX = e.pageX;
		var startWidth = this.options.columns[index].width || 100;
		/*
		function onMove(e2) {
			var delta = e2.pageX - startX;
			var newWidth = Math.max(40, startWidth + delta);

			self.options.columns[index].width = newWidth;

			self.headerCells[index].setWidth(newWidth);
			self.rows.forEach(r => r.setColumnWidth(index, newWidth));
			self.rows.forEach(r => r._reflow());
		}
		*/
		function onMove(e2) {
			var delta = e2.pageX - startX;
			var newWidth = Math.max(40, startWidth + delta);

			// 1) nastavíme šířku headeru
			self.headerCells[index].setWidth(newWidth);

			// 2) nastavíme šířku všech řádků v reálném čase
			self.rows.forEach(r => {
				r.setColumnWidth(index, newWidth);
			});

			// 3) uložíme průběžně do definice sloupce
			self.options.columns[index].width = newWidth;
		}
		
		/*
		function onUp() {
		    self._isResizing = false;

		    // 1) ZÍSKÁME SKUTEČNOU ŠÍŘKU Z DOM
		    var realWidth = self.headerCells[index].el.outerWidth();

		    // 2) ZAPÍŠEME DO DEFINICE SLOUPCE
		    self.options.columns[index].width = realWidth;

		    // 3) NASTAVÍME ŠÍŘKU HEADERU
		    self.headerCells[index].setWidth(realWidth);

		    // 4) NASTAVÍME ŠÍŘKU VŠEM ŘÁDKŮM
		    self.rows.forEach(r => r.setColumnWidth(index, realWidth));

		    // 5) PROVEDEME REFLOW (overflow logika)
		    self.rows.forEach(r => r._reflow());

		    $(document).off("mousemove", onMove);
		    $(document).off("mouseup", onUp);
		}
		*/
		function onUp() {
			self._isResizing = false;
			$(document).off("mousemove", onMove);
			$(document).off("mouseup", onUp);
		}

		$(document).on("mousemove", onMove);
		$(document).on("mouseup", onUp);
	},

	// ---------------------------------------------------------
	// DRAG-REORDER
	// ---------------------------------------------------------

	_onHeaderDragStart: function (index) {
	    if (!this.options.reorderable) return;
	    if (this._isResizing) return;
	    this._dragSrcIndex = index;
	},

	_onHeaderDragEnter: function (index) {
	    if (!this.options.reorderable) return;
	    if (this._isResizing) return;
	    this._dragTargetIndex = index;
	},

	_onHeaderDrop: function () {
	    if (!this.options.reorderable) return;
	    if (this._isResizing) return;

	    if (this._dragSrcIndex == null || this._dragTargetIndex == null) return;

	    var cols = this.options.columns;
	    var tmp = cols[this._dragSrcIndex];
	    cols.splice(this._dragSrcIndex, 1);
	    cols.splice(this._dragTargetIndex, 0, tmp);

	    this._renderHeader();
	    this._renderRows();
	    this.rows.forEach(r => r._reflow());
	},

	// ---------------------------------------------------------
	// KEYBOARD NAVIGATION
	// ---------------------------------------------------------
	_bindKeyboardNavigation: function() {
		var self = this;

		this.el.attr("tabindex", 0);

		this.el.on("keydown", function(e) {
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

	_getSelectedRowIndex: function() {
		for (var i = 0; i < this.rows.length; i++) {
			if (this.rows[i].el.hasClass("selected")) {
				return i;
			}
		}
		return -1;
	},

	_selectRowByIndex: function(index) {
		var row = this.rows[index];
		if (!row) return;

		if (this.options.selectionMode === "single") {
			this._deselectAllExcept(row);
		}

		row.select();

		row.el[0].scrollIntoView({ block: "nearest", behavior: "smooth" });
	},

	_deselectAllExcept: function(row) {
		this.rows.forEach(r => {
			if (r !== row) r.deselect();
		});
	},

	refresh: function() {
		this._renderRows();
	},

	setData: function(data) {
		this.options.data = data;
		this.refresh();
	},

	getRow: function(index) {
		return this.rows[index];
	},

	destroy: function() {
		if (this.rows) {
			this.rows.forEach(r => r.destroy());
		}
		this.el.empty();
		this.el.removeData(this._widgetName);
	}
});

$.qpDefine("qpDataGrid", qpDataGrid);
