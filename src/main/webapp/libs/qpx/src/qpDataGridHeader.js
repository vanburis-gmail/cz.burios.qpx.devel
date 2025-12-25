/**
 * qpDataGridHeader 
 */
var qpDataGridHeader = qpOverflowWidget.extend({

	defaults: {
		columns: [],
		grid: null,
		reorderable: false
	},

	_create: function() {
		this.el.addClass("qp-dg-header");
		this.el.css("position", "relative");

		this.itemsContainer = $('<div class="qp-dg-header-items"></div>')
			.appendTo(this.el);

		this.moreButton = $('<div class="qp-dg-header-more">⋮</div>')
			.appendTo(this.el);

		this.popupContainer = $('<div class="qp-dg-header-popup"></div>')
			.appendTo(this.el);

		this.moreButton.hide();
		this.popupContainer.hide();

		this._renderItems();
		this._bind();
		this._reflow();
	},

	_renderItems: function() {
		var self = this;

		this.itemsContainer.empty();
		this.items = [];

		this.options.columns.forEach(function(col, index) {

			var $wrapper = $('<div class="qp-dg-header-cell-wrapper"></div>')
				.appendTo(self.itemsContainer);

			var cell = new qpDataGridHeaderCell($wrapper, {
				index: index,
				column: col,
				grid: self.options.grid,
				reorderable: self.options.reorderable
			});

			if (col.fill) {
				$wrapper.addClass("qp-dg-fill-wrapper");
				cell.el.addClass("qp-dg-fill");
			}

			self.items.push({
				wrapper: $wrapper,
				widget: cell
			});
		});
	},

	_bind: function() {
		var self = this;

		this.moreButton.off("click").on("click", function(e) {
			e.stopPropagation();
			self._togglePopup();
		});

		this.moreButton.off("mousedown").on("mousedown", e => e.stopPropagation());
		this.moreButton.off("mouseup").on("mouseup", e => e.stopPropagation());

		$(document).off("click.qpDataGridHeader").on("click.qpDataGridHeader", function() {
			self.popupContainer.hide();
		});

		this.popupContainer.off("click").on("click", function(e) {
			e.stopPropagation();
		});

		if (typeof ResizeObserver !== "undefined") {
			this._ro = new ResizeObserver(() => this._reflow());
			this._ro.observe(this.el[0]);
		}
	},

	_togglePopup: function() {
		if (this.popupContainer.is(":visible")) {
			this.popupContainer.hide();
			return;
		}

		var pos = this.moreButton.position();

		this.popupContainer.css({
			top: pos.top + this.moreButton.outerHeight(),
			right: 0
		});

		this.popupContainer.show();
	},

	_restoreAllToHeader: function() {
		var self = this;

		this.popupContainer.children().each(function() {
			var index = $(this).data("col-index");
			var item = self.items[index];
			if (item) {
				item.wrapper.appendTo(self.itemsContainer);
				item.wrapper.show();
			}
		});

		this.popupContainer.empty();
	},

	_moveToPopup: function(item, index) {
		var col = this.options.columns[index];

		if (col.fill) return;

		var popupItem = $('<div class="qp-dg-header-popup-item"></div>')
			.data("col-index", index);

		popupItem.append(
			'<span class="qp-dg-popup-title">' + (col.title || col.field || "") + '</span>'
		);

		var sort = this.options.grid._state.sort;
		var sortIcon = $('<span class="qp-dg-popup-sort-icon"></span>')
			.appendTo(popupItem);

		if (sort.field === col.field) {
			sortIcon.addClass(sort.dir);
		}

		this.popupContainer.append(popupItem);

		item.wrapper.hide();
	},

	_reflow: function() {
		var available = this.el.width();
		var used = 0;

		this._restoreAllToHeader();

		var moreWidth = this.moreButton.outerWidth(true) || 32;

		this.items.forEach((item, index) => {
			var col = this.options.columns[index];

			if (col.fill) {
				item.wrapper.show();
				return;
			}

			var w = item.wrapper.outerWidth(true);

			if (used + w < available - moreWidth) {
				used += w;
				item.wrapper.show();
			} else {
				this._moveToPopup(item, index);
			}
		});

		if (this.popupContainer.children().length > 0) {
			this.moreButton.show();
		} else {
			this.moreButton.hide();
			this.popupContainer.hide();
		}

		this.items.forEach(function(item) {
			item.widget.updateSortIcon();
		});
	},

	refresh: function() {
		this._renderItems();
		this._reflow();

		this.items.forEach(function(item) {
			item.widget.updateSortIcon();
		});
	},

	destroy: function() {
		if (this._ro) this._ro.disconnect();
		$(document).off("click.qpDataGridHeader");
		this.popupContainer.remove();
		this.el.removeData(this._widgetName);
	}
});

$.qpDefine("qpDataGridHeader", qpDataGridHeader);
