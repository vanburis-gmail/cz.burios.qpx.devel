/**
 * qpDataGrid
 */
var qpDataGrid = qpWidget.extend({

	_widgetName: "qpDataGrid",
	
	version: "1.0.0",
	defaults: {
		dataSource: {
			type: "local",   // "local" | "remote"
			data: [],        // pokud type = "local"
			transport: {     // pokud type = "remote"
				read: {
					url: null,
					method: "GET",
					params: {} // nebo function(state) { return {...}; }
				}
			},
			onLoaded: null
		},
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

		// interní cache dat
		this._data = [];

		// interní stav gridu (sorting, filtering, paging)
		this._state = {
			// sort: { field: null, dir: null },
			sort: [],
			filters: [],
			page: 1,
			pageSize: 50
		};

		// zajistíme fill sloupec
		if (!this.options.columns.some(c => c.fill)) {
			this.options.columns.push({ fill: true });
		}

		// HEADER
		this.header = new qpDataGridHeader(
			$('<div class="qp-dg-header"></div>').appendTo(this.el),
			{
				columns: this.options.columns,
				grid: this,
				reorderable: this.options.reorderable
			}
		);

		// BODY
		this.body = $('<div class="qp-dg-body"></div>').appendTo(this.el);

		// NAČTENÍ DAT
		this._loadDataSource();

		// klávesová navigace
		this._bindKeyboardNavigation();
	},

	// ---------------------------------------------------------
	// DATASOURCE LOADING (LOCAL / REMOTE + DYNAMIC PARAMS)
	// ---------------------------------------------------------
	_loadDataSource: function() {
		var ds = this.options.dataSource || {};
		var self = this;

		// fallback: pokud někdo předal přímo pole
		if (Array.isArray(ds)) {
			this._data = ds;
			this._renderRows();
			return;
		}

		var type = ds.type || "local";

		// LOCAL DATASOURCE
		if (type === "local") {
			this._data = ds.data || [];
			this._renderRows();
			if (typeof ds.onLoaded === "function") ds.onLoaded(this._data);
			return;
		}

		// REMOTE DATASOURCE
		if (type === "remote") {
			var read = ds.transport.read;

			if (!read.url) {
				console.error("qpDataGrid: dataSource.transport.read.url is required for remote dataSource.");
				this._data = [];
				this._renderRows();
				return;
			}

			// dynamic params
			var params = {};
			if (typeof read.params === "function") {
				params = read.params(this._state);
			} else if (typeof read.params === "object") {
				params = read.params;
			}

			// 🔥 automatické doplnění sort parametrů
			var sort = this._state.sort;
				/*
			if (sort && sort.field) {
				params.sortField = sort.field;
				params.sortDir = sort.dir;
				if (Array.isArray(this._state.sort) && this._state.sort.length) {
				    params.sort = this._state.sort.map(s => ({
				        field: s.field,
				        dir: s.dir
				    }));
				}
			}
				*/
			params.sort = this._state.sort.map(s => ({ 
				field: s.field, 
				dir: s.dir 
			}));
			console.log("_loadDataSource.param: ", params);
			$.ajax({
				url: read.url,
				method: read.method || "GET",
				data: params,
				contentType : 'application/json; charset=utf-8',
				success: function(response) {
					self._data = response || [];
					self._renderRows();
					if (typeof ds.onLoaded === "function") ds.onLoaded(self._data);
				},
				error: function(xhr) {
					console.error("qpDataGrid: remote dataSource load failed.", xhr);
					self._data = [];
					self._renderRows();
				}
			});

			return;
		}

		// fallback
		this._data = ds.data || [];
		this._renderRows();
		if (typeof ds.onLoaded === "function") ds.onLoaded(this._data);
	},

	// ---------------------------------------------------------
	// RENDER ROWS
	// ---------------------------------------------------------
	_renderRows: function() {
		var self = this;

		this.body.empty();
		this.rows = [];

		(this._data || []).forEach(function(rowData, index) {
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

				onClick: function(data, rowInstance) {
					if (self.options.onRowClick) self.options.onRowClick(data, rowInstance);
				},
				onDblClick: function(data, rowInstance) {
					if (self.options.onRowDblClick) self.options.onRowDblClick(data, rowInstance);
				},
				onSelect: function(data, rowInstance) {
					if (self.options.onRowSelect) self.options.onRowSelect(data, rowInstance);
				}
			});

			self.rows.push(row);
		});
	},

	// ---------------------------------------------------------
	// SORTING API (voláno z headerCell)
	// ---------------------------------------------------------
	/*
	_setSort: function(field) {
		var sort = this._state.sort;

		if (sort.field !== field) {
			this._state.sort = { field: field, dir: "asc" };
		} else {
			this._state.sort.dir = sort.dir === "asc" ? "desc" : "asc";
		}

		// aktualizace ikon v headeru
		this.header.items.forEach(function(item) {
			item.widget.updateSortIcon();
		});

		// načtení dat
		this._loadDataSource();
	},
	*/
	_setSort: function(field, shiftKey, ctrlKey) {
		console.log("SET SORT:", field, "shift:", shiftKey, "ctrl:", ctrlKey);

	    var sorts = this._state.sort;

	    // CTRL = RESET SORTS
	    if (ctrlKey) {
	        this._state.sort = [{ field: field, dir: "asc" }];
	    }
	    else if (!shiftKey) {
	        // SINGLE SORT MODE
	        var existing = sorts.find(s => s.field === field);

	        if (!existing) {
	            this._state.sort = [{ field: field, dir: "asc" }];
	        } else {
	            existing.dir = existing.dir === "asc" ? "desc" : "asc";
	            this._state.sort = [existing];
	        }
	    }
	    else {
	        // MULTI SORT MODE (Shift+Click)
	        var existing = sorts.find(s => s.field === field);

	        if (!existing) {
	            sorts.push({ field: field, dir: "asc" });
	        } else {
	            existing.dir = existing.dir === "asc" ? "desc" : "asc";
	        }
	    }
		console.log("STATE SORT:", this._state.sort);
		
	    // UPDATE HEADER ICONS
	    this.header.items.forEach(function(item) {
	        item.widget.updateSortIcon();
	    });

	    // LOAD DATA
	    this._loadDataSource();
	},

	// ---------------------------------------------------------
	// HEADER DRAG-RESIZE
	// ---------------------------------------------------------
	_onHeaderResizeStart: function(e, index) {
		var self = this;
		this._isResizing = true;

		var startX = e.pageX;
		var col = this.options.columns[index];
		var startWidth = col.width || self.header.items[index].wrapper.outerWidth() || 100;

		function onMove(e2) {
			var delta = e2.pageX - startX;
			var newWidth = Math.max(40, startWidth + delta);

			self.header.items[index].widget.setWidth(newWidth);
			self.rows.forEach(r => r.setColumnWidth(index, newWidth));

			self.options.columns[index].width = newWidth;
		}

		function onUp() {
			self._isResizing = false;

			var realWidth = self.header.items[index].wrapper.outerWidth();
			self.options.columns[index].width = realWidth;

			self.header.items[index].widget.setWidth(realWidth);
			self.rows.forEach(r => r.setColumnWidth(index, realWidth));
			self.rows.forEach(r => r._reflow && r._reflow());

			$(document).off("mousemove", onMove);
			$(document).off("mouseup", onUp);
		}

		$(document).on("mousemove", onMove);
		$(document).on("mouseup", onUp);
	},

	// ---------------------------------------------------------
	// HEADER DRAG-REORDER
	// ---------------------------------------------------------
	_onHeaderDragStart: function(index) {
		if (!this.options.reorderable) return;
		if (this._isResizing) return;
		this._dragSrcIndex = index;
		this._dragTargetIndex = null;
	},

	_onHeaderDragEnter: function(index) {
		if (!this.options.reorderable) return;
		if (this._isResizing) return;
		this._dragTargetIndex = index;
	},

	_onHeaderDrop: function() {
		if (!this.options.reorderable) return;
		if (this._isResizing) return;

		var src = this._dragSrcIndex;
		var dst = this._dragTargetIndex;

		if (src == null || dst == null || src === dst) return;

		var cols = this.options.columns;
		var moved = cols[src];
		cols.splice(src, 1);
		cols.splice(dst, 0, moved);

		this.header.refresh();
		this._renderRows();
		this.rows.forEach(r => r._reflow && r._reflow());

		this._dragSrcIndex = null;
		this._dragTargetIndex = null;
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
		if (!this.rows) return -1;
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
		if (row.el && row.el[0] && row.el[0].scrollIntoView) {
			row.el[0].scrollIntoView({ block: "nearest", behavior: "smooth" });
		}
	},

	_deselectAllExcept: function(row) {
		this.rows.forEach(r => {
			if (r !== row) r.deselect();
		});
	},

	// ---------------------------------------------------------
	// PUBLIC API
	// ---------------------------------------------------------
	refresh: function() {
		this.header.refresh();
		this._renderRows();
	},

	setDataSource: function(ds) {
		this.options.dataSource = ds;
		this._loadDataSource();
	},

	// zpětná kompatibilita
	setData: function(data) {
		this.options.dataSource = {
			type: "local",
			data: data
		};
		this._loadDataSource();
	},

	destroy: function() {
		if (this.rows) {
			this.rows.forEach(r => r.destroy && r.destroy());
		}
		if (this.header && this.header.destroy) {
			this.header.destroy();
		}
		this.el.empty();
		this.el.removeData(this._widgetName);
	}
});

$.qpDefine("qpDataGrid", qpDataGrid);
