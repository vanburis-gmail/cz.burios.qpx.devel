/* --------------------------------------------------------
 * plugin: qpTabs
 * --------------------------------------------------------
 */
var qpToolBar = qpOverflowWidget.extend({

	_widgetName: "qpToolBar",
	
	version: "1.0.0",
	defaults: {
		data: [],
		responsive: true,
		scrollStep: 80,
		onClick: null,
		onToggle: null
	},

	// ---------------------------------------
	// CREATE
	// ---------------------------------------
	_create: function() {

		this.wrapper = $("<div class='qp-toolbar-wrapper'></div>").appendTo(this.el);
		this.bar = $("<div class='qp-toolbar'></div>").appendTo(this.wrapper);

		qpOverflowWidget.prototype._create.call(this);

		this._renderDataButtons();
		this._bind();
		this._bindScrollButtons();

		this.checkOverflow();
	},

	// ---------------------------------------
	// BIND
	// ---------------------------------------
	_bind: function() {
		var self = this;
		var ns = "." + this._widgetName;

		this.bar.on("click" + ns, ".qp-btn", function(e) {
			var $btn = $(this);
			var id = $btn.data("id");

			if ($btn.hasClass("qp-btn-toggle")) {
				$btn.toggleClass("active");
				if (self.options.onToggle) {
					self.options.onToggle(id, $btn.hasClass("active"));
				}
			}

			if (self.options.onClick) {
				self.options.onClick(id, $btn);
			}
		});
	},

	// ---------------------------------------
	// DATA → BUTTONS
	// ---------------------------------------
	_renderDataButtons: function() {
		var self = this;

		this.options.data.forEach(function(item) {

			if (item.type === "separator") {
				$("<div class='qp-separator'></div>").appendTo(self.bar);
				return;
			}

			var $btn = $("<div class='qp-btn'></div>")
				.attr("data-id", item.id || "")
				.appendTo(self.bar);

			if (item.icon) {
				var $icon = $("<span class='qp-btn-icon'></span>");
				if (item.icon.indexOf("<svg") === 0) {
					$icon.html(item.icon);
				} else if (item.icon.indexOf("/") !== -1) {
					$icon.append("<img src='" + item.icon + "'/>");
				} else {
					$icon.addClass(item.icon);
				}
				$btn.append($icon);
			}

			if (item.text) {
				$btn.append("<span class='qp-btn-text'>" + item.text + "</span>");
			}

			if (item.toggle) {
				$btn.addClass("qp-btn-toggle");
			}

			if (item.menu) {
				$btn.addClass("qp-btn-dropdown");
				$btn.append("<span class='qp-btn-arrow'>▼</span>");
				self._createDropdown($btn, item.menu);
			}
		});
	},

	// ---------------------------------------
	// DROPDOWN
	// ---------------------------------------
	_createDropdown: function($btn, menuItems) {
		var self = this;

		var $menu = $("<ul class='qp-toolbar-dropdown'></ul>").appendTo("body").hide();

		menuItems.forEach(function(mi) {
			$("<li>" + mi.text + "</li>")
				.appendTo($menu)
				.on("click", function(e) {
					e.stopPropagation();
					$menu.hide();
					if (self.options.onClick) {
						self.options.onClick(mi.id, $btn);
					}
				});
		});

		$btn.on("click", function(e) {
			e.stopPropagation();
			self._toggleDropdown($btn, $menu);
		});

		$(document).on("click." + this._widgetName, function() {
			$menu.hide();
		});
	},

	_toggleDropdown: function($btn, $menu) {
		if ($menu.is(":visible")) {
			$menu.hide();
		} else {
			var o = $btn.offset();
			$menu.css({
				top: o.top + $btn.outerHeight(),
				left: o.left
			}).show();
		}
	},

	// ---------------------------------------
	// OVERFLOW
	// ---------------------------------------
	checkOverflow: function() {
		var wrapperWidth = this.wrapper.width();
		var barWidth = this.bar[0].scrollWidth;

		if (this.options.responsive) {
			if (barWidth > wrapperWidth) {
				this.moreBtn.show();
				this.fillPopup(this._getHiddenButtons());
			} else {
				this.moreBtn.hide();
				this.popup.hide();
			}
		}
	},

	_getHiddenButtons: function() {
		var items = [];
		var wrapperRight = this.wrapper.offset().left + this.wrapper.width();

		this.bar.children(".qp-btn").each((i, el) => {
			var $el = $(el);
			var right = $el.offset().left + $el.outerWidth();

			if (right > wrapperRight - this.moreBtn.outerWidth()) {
				items.push({
					text: $el.find(".qp-btn-text").text() || $el.data("id"),
					action: () => {
						if (this.options.onClick) {
							this.options.onClick($el.data("id"), $el);
						}
					}
				});
			}
		});

		return items;
	},

	// ---------------------------------------
	// SCROLL BUTTONS
	// ---------------------------------------
	_bindScrollButtons: function() {
		var self = this;

		this.leftArrow = $("<div class='qp-toolbar-scroll-left'>◀</div>").prependTo(this.wrapper);
		this.rightArrow = $("<div class='qp-toolbar-scroll-right'>▶</div>").appendTo(this.wrapper);

		this.leftArrow.on("click", function() {
			self._scrollBar(-self.options.scrollStep);
		});

		this.rightArrow.on("click", function() {
			self._scrollBar(self.options.scrollStep);
		});
	},

	_scrollBar: function(amount) {
		this.bar.animate({
			scrollLeft: this.bar.scrollLeft() + amount
		}, 150);
	},
	
	getOverflowTargetWidth: function() {
	    return this.wrapper.width();
	},

	getOverflowItems: function() {
	    var items = [];
	    var wrapperRight = this.wrapper.offset().left + this.wrapper.width();

	    this.bar.children(".qp-btn").each((i, el) => {
	        var $el = $(el);
	        var right = $el.offset().left + $el.outerWidth();

	        if (right > wrapperRight - this.moreBtn.outerWidth()) {
	            items.push({
	                text: $el.find(".qp-btn-text").text() || $el.data("id"),
	                action: () => {
	                    if (this.options.onClick) {
	                        this.options.onClick($el.data("id"), $el);
	                    }
	                }
	            });
	        }
	    });

	    return items;
	},

	onOverflowChange: function(isOverflowing) {
	    // toolbar může zobrazit/skrýt scroll arrows
	    if (isOverflowing) {
	        this.leftArrow.show();
	        this.rightArrow.show();
	    } else {
	        this.leftArrow.hide();
	        this.rightArrow.hide();
	    }
	}
	
});

$.qpDefine("qpToolBar", qpToolBar);
