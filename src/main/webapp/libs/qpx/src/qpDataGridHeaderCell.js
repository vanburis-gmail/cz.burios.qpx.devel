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

		// DRAG-REORDER
		if (this.options.reorderable) {

			this.el.attr("draggable", true);

			this.el.on("dragstart", function(e) {
				if (self.options.grid._isResizing) return;

				e.originalEvent.dataTransfer.setData("text/plain", "drag");
				e.originalEvent.dataTransfer.effectAllowed = "move";

				self.options.grid._onHeaderDragStart(self.options.index);
			});

			this.el.on("dragenter", function() {
				if (self.options.grid._isResizing) return;
				self.options.grid._onHeaderDragEnter(self.options.index);
			});

			this.el.on("drop", function() {
				if (self.options.grid._isResizing) return;
				self.options.grid._onHeaderDrop(self.options.index);
			});
		} else {
			// zakázat drag
			this.el.attr("draggable", false);
		}

		// DRAG-RESIZE (vždy povoleno)
		if (this.resizeEl) {
			this.resizeEl.on("mousedown", function(e) {
				e.stopPropagation();
				self.options.grid._onHeaderResizeStart(e, self.options.index);
			});
		}
	},

	setWidth: function(w) {
		this.el.css("flex", "0 0 " + w + "px");
	}
});

$.qpDefine("qpDataGridHeaderCell", qpDataGridHeaderCell);
