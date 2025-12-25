/**
 * qpDataGridHeaderCell
 */
var qpDataGridHeaderCell = qpWidget.extend({

	defaults: {
		index: 0,
		column: null,
		grid: null,
		reorderable: false
	},

	_create: function() {
		this.el.addClass("qp-dg-header-cell");

		if (this.options.column.fill) {
			this.el.addClass("qp-dg-fill");
		}

		this._render();
		this._bind();
	},

	_render: function() {
		var col = this.options.column;

		this.el.empty();

		this.titleEl = $('<div class="qp-dg-header-title"></div>')
			.text(col.title || "")
			.appendTo(this.el);

		this.sortIcon = $('<div class="qp-dg-sort-icon none"></div>')
			.appendTo(this.el);

		if (!col.fill) {
			this.resizeEl = $('<div class="qp-dg-resize"></div>')
				.appendTo(this.el);
		}

		if (col.width) {
			this.el.css("flex", "0 0 " + col.width + "px");
		}
	},

	_bind: function() {
		var self = this;
		var col = this.options.column;

		// CLICK = SORT (NEJDŘÍV OFF, PAK ON)
		this.el
			.off("click.qpDgHeaderCell")
			.on("click.qpDgHeaderCell", function(e) {
				// nepokračuj, pokud resize
				if ($(e.target).hasClass("qp-dg-resize")) return;
				if (!col.sortable || !col.field) return;

				e.stopPropagation();      // zabrání bublání do parentů
				e.preventDefault();       // jistota proti double‑fire v některých browserech

				self.options.grid._setSort(col.field);
			});

		// DRAG-REORDER – jen na wrapperu, ne na buňce
		if (this.options.reorderable) {
			var $wrapper = this.el.parent();

			$wrapper.attr("draggable", true);
			this.el.attr("draggable", false);

			$wrapper
				.off("dragstart.qpDgHeaderCell")
				.on("dragstart.qpDgHeaderCell", function(e) {
					if (self.options.grid._isResizing) return;
					e.originalEvent.dataTransfer.setData("text/plain", "drag");
					self.options.grid._onHeaderDragStart(self.options.index);
				});

			$wrapper
				.off("dragenter.qpDgHeaderCell")
				.on("dragenter.qpDgHeaderCell", function() {
					if (self.options.grid._isResizing) return;
					self.options.grid._onHeaderDragEnter(self.options.index);
				});

			$wrapper
				.off("drop.qpDgHeaderCell")
				.on("drop.qpDgHeaderCell", function() {
					if (self.options.grid._isResizing) return;
					self.options.grid._onHeaderDrop(self.options.index);
				});
		}

		// DRAG-RESIZE
		if (this.resizeEl) {
			this.resizeEl
				.off("mousedown.qpDgHeaderCell")
				.on("mousedown.qpDgHeaderCell", function(e) {
					e.stopPropagation();
					self.options.grid._onHeaderResizeStart(e, self.options.index);
				});
		}
	},

	updateSortIcon: function() {
		var sort = this.options.grid._state.sort;
		var col = this.options.column;

		if (!col.sortable || !col.field) {
			this.sortIcon.removeClass("asc desc").addClass("none");
			return;
		}

		if (sort.field !== col.field || !sort.dir) {
			this.sortIcon.removeClass("asc desc").addClass("none");
			return;
		}

		if (sort.dir === "asc") {
			this.sortIcon.removeClass("desc none").addClass("asc");
		} else {
			this.sortIcon.removeClass("asc none").addClass("desc");
		}
	},

	setWidth: function(w) {
		this.el.css("flex", "0 0 " + w + "px");
	}
});

$.qpDefine("qpDataGridHeaderCell", qpDataGridHeaderCell);
