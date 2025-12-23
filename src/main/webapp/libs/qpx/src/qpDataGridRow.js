/** 
 * qpDataGridRow
 */
var qpDataGridRow = qpWidget.extend({

	defaults: {
		index: 0,
		data: null,
		columns: [],
		responsive: true,
		selectable: true,
		editable: false,
		template: null,
		onClick: null,
		onDblClick: null,
		onSelect: null,
		selectionMode: "single"
	},

	_create: function() {
		this.el.addClass("qp-dg-row");

		this._renderBaseCells();
		this._createMoreButton();
		this._createPopup();
		this._bind();
		this._bindResizeObserver();

		this._reflow();
	},

	_bind: function() {
		var self = this;

		this.el.on("click", function() {
			self.select();
			if (self.options.onClick) self.options.onClick(self.options.data, self);
		});

		this.el.on("dblclick", function() {
			if (self.options.onDblClick) self.options.onDblClick(self.options.data, self);
		});
	},

	_renderBaseCells: function() {
		var self = this;

		var html = this.options.columns
			.filter(c => !c.fill)
			.map(function(col) {
				var style = col.width ? 'style="flex:0 0 ' + col.width + 'px"' : "";
				var val = col.field && self.options.data[col.field] != null
					? self.options.data[col.field]
					: "";
				return '<div class="qp-dg-cell" ' + style + '>' + val + '</div>';
			})
			.join("");

		this.el.find(".qp-dg-cell").remove();
		this.el.prepend(html);
	},

	_createMoreButton: function() {
		this.moreBtn = $('<div class="qp-dg-more">⋮</div>');
		this.el.append(this.moreBtn);

		this.moreBtn.on("click", (e) => {
			e.stopPropagation();
			this.popup.toggle();
		});
	},

	_createPopup: function() {
		this.popup = $('<div class="qp-dg-row-popup"></div>');
		this.popup.insertAfter(this.el);
		this.popup.hide();
	},

	_reflow: function() {
		this._restoreAllToRow();

		var rowWidth = this.el.width();
		var moreWidth = this.moreBtn.outerWidth(true) || 32;

		var cells = this.el.children(".qp-dg-cell");
		var used = 0;
		var overflow = false;

		cells.each((i, el) => {
			var $el = $(el);
			var w = $el.outerWidth(true);

			if (!overflow && used + w <= rowWidth - moreWidth) {
				used += w;
			} else {
				overflow = true;
				this._moveCellToPopup($el);
			}
		});

		if (this.popup.children().length > 0) {
			this.moreBtn.show();
		} else {
			this.moreBtn.hide();
			this.popup.hide();
		}
	},

	_moveCellToPopup: function($cell) {
		var colIndex = $cell.index();
		var col = this.options.columns.filter(c => !c.fill)[colIndex];

		var title = col ? (col.title || col.field || "") : "";
		var val = $cell.text();

		var item = $(
			'<div class="qp-dg-row-popup-item">' +
			'<span class="qp-dg-row-popup-title">' + title + ':</span>' +
			'<span class="qp-dg-row-popup-value">' + val + '</span>' +
			'</div>'
		);

		this.popup.append(item);
		$cell.detach();
	},

	_restoreAllToRow: function() {
		this._renderBaseCells();
		this.popup.empty().hide();
	},

	setColumnWidth: function(colIndex, width) {
		var cell = this.el.children(".qp-dg-cell").eq(colIndex);
		if (cell.length) {
			cell.css("flex", "0 0 " + width + "px");
		}
	},

	_bindResizeObserver: function() {
		if (typeof ResizeObserver === "undefined") return;

		this._ro = new ResizeObserver(() => {
			this._reflow();
		});

		this._ro.observe(this.el[0]);
	},

	select: function() {
		if (!this.options.selectable) return;

		var grid = this.el.closest(".qp-dg").data("qpDataGrid");

		if (this.options.selectionMode === "single" && grid) {
			grid._deselectAllExcept(this);
		}

		this.el.addClass("selected");

		if (this.options.onSelect) {
			this.options.onSelect(this.options.data, this);
		}
	},

	deselect: function() {
		this.el.removeClass("selected");
	},

	destroy: function() {
		if (this._ro) this._ro.disconnect();
		this.moreBtn.remove();
		this.popup.remove();
		this.el.removeData(this._widgetName);
	}
});

$.qpDefine("qpDataGridRow", qpDataGridRow);
