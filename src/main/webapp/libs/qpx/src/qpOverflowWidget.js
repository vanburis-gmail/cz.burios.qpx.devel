/* --------------------------------------------------------
 * plugin: qpOverflowWidget (sjednocené overflow API)
 * --------------------------------------------------------
 */
var qpOverflowWidget = qpWidget.extend({

	defaults: {
		responsive: true,
		popupMaxHeight: 300,
		moreIcon: "⋯"
	},

	_create: function() {

		// wrapper může existovat (qpTabs, qpToolBar)
		this._overflowContainer = this.wrapper || this.el;

		this._createMoreButton();
		this._createPopup();
		this._bindResizeObserver();
	},

	/* ---------------------------------------
	 * MORE BUTTON
	 * ---------------------------------------
	 */
	_createMoreButton: function() {
		this.moreBtn = $("<div class='qp-overflow-more'></div>")
			.html(this.options.moreIcon)
			.appendTo(this._overflowContainer)
			.hide();

		this.moreBtn.on("click." + this._widgetName, (e) => {
			e.stopPropagation();
			this.togglePopup();
		});
	},

	/* ---------------------------------------
	 * POPUP
	 * ---------------------------------------
	 */
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

	/* ---------------------------------------
	 * RESIZE OBSERVER
	 * ---------------------------------------
	 */
	_bindResizeObserver: function() {
		this._resizeObserver = new ResizeObserver(() => {
			this.checkOverflow();
			if (this.popup.is(":visible")) {
				this.positionPopup();
			}
		});

		var target = this.wrapper ? this.wrapper[0] : this.el[0];
		this._resizeObserver.observe(target);
	},

	/* ---------------------------------------
	 * SJEDNOCENÉ OVERFLOW API
	 * ---------------------------------------
	 */

	checkOverflow: function() {
		if (!this.options.responsive) {
			this.moreBtn.hide();
			this.popup.hide();
			return;
		}

		var containerWidth = this.getOverflowTargetWidth();
		var items = this.getOverflowItems();

		if (items.length > 0) {
			this.moreBtn.show();
			this.fillPopup(items);
			this.onOverflowChange(true);
		} else {
			this.moreBtn.hide();
			this.popup.hide();
			this.onOverflowChange(false);
		}
	},

	/* ---------------------------------------
	 * ABSTRAKTNÍ METODY – implementují potomci
	 * ---------------------------------------
	 */

	// vrací šířku prostoru, do kterého se obsah musí vejít
	getOverflowTargetWidth: function() {
		throw "qpOverflowWidget: getOverflowTargetWidth() must be implemented";
	},

	// vrací seznam položek, které se nevejdou
	getOverflowItems: function() {
		throw "qpOverflowWidget: getOverflowItems() must be implemented";
	},

	// volá se při změně overflow stavu
	onOverflowChange: function(isOverflowing) {
		// volitelné
	},

	destroy: function() {
		if (this._resizeObserver) this._resizeObserver.disconnect();
		this.popup.remove();
		this.moreBtn.remove();
		this.el.removeData(this._widgetName);
	}
});
