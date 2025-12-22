/* --------------------------------------------------------
 * plugin: qpOverflowWidget
 * --------------------------------------------------------
 */
var qpOverflowWidget = qpWidget.extend({

	defaults: {
		responsive: true,
		popupMaxHeight: 300,
		moreIcon: "⋯"
	},

	_create: function() {
		this._createMoreButton();
		this._createPopup();
		this._bindResizeObserver();
	},

	// ---------------------------------------
	// MORE BUTTON
	// ---------------------------------------
	_createMoreButton: function() {
		this.moreBtn = $("<div class='qp-overflow-more'></div>")
			.html(this.options.moreIcon)
			.appendTo(this.wrapper)
			.hide();

		this.moreBtn.on("click." + this._widgetName, (e) => {
			e.stopPropagation();
			this.togglePopup();
		});
	},

	// ---------------------------------------
	// POPUP
	// ---------------------------------------
	_createPopup: function() {
		this.popup = $("<ul class='qp-overflow-popup'></ul>")
			.appendTo("body")
			.hide();

		$(document).on("click." + this._widgetName, () => {
			this.popup.hide();
		});
	},

	togglePopup: function() {
		if (this.popup.is(":visible")) {
			this.popup.hide();
		} else {
			this.positionPopup();
			this.popup.show();
		}
	},

	positionPopup: function() {
		var o = this.moreBtn.offset();
		var h = this.moreBtn.outerHeight();
		var w = this.moreBtn.outerWidth();
		var pw = this.popup.outerWidth();

		this.popup.css({
			top: o.top + h,
			left: o.left + w - pw,
			maxHeight: this.options.popupMaxHeight
		});
	},

	fillPopup: function(items) {
		this.popup.empty();
		items.forEach(item => {
			$("<li>" + item.text + "</li>")
				.appendTo(this.popup)
				.on("click", () => {
					item.action();
					this.popup.hide();
				});
		});
	},

	// ---------------------------------------
	// RESIZE OBSERVER
	// ---------------------------------------
	_bindResizeObserver: function() {
		this._resizeObserver = new ResizeObserver(() => {
			this.checkOverflow();
			if (this.popup.is(":visible")) {
				this.positionPopup();
			}
		});
		this._resizeObserver.observe(this.wrapper[0]);
	},

	// ---------------------------------------
	// ABSTRACT
	// ---------------------------------------
	checkOverflow: function() {
		// implementují potomci
	},

	destroy: function() {
		if (this._resizeObserver) this._resizeObserver.disconnect();
		this.popup.remove();
		this.moreBtn.remove();
		this.el.removeData(this._widgetName);
	}
});
