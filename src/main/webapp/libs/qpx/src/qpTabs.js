/* --------------------------------------------------------
 * plugin: qpTabs
 * --------------------------------------------------------
 */
var qpTabs = qpOverflowWidget.extend({

	version: "1.0.0",

	defaults: {
		active: 0,
		closable: true,
		draggable: true,
		lazy: false,
		lazyLoader: null,
		ajax: false,
		ajaxUrl: null,
		ajaxMap: {},
		contextMenu: true,
		autoInitNested: true,
		data: []
	},

	// ---------------------------------------
	// CREATE
	// ---------------------------------------
	_create: function() {

		// wrapper / struktura
		this.nav = this.el.find(".qp-tabs-nav");
		this.content = this.el.find(".qp-tabs-content");

		if (!this.nav.length) {
			this.nav = $("<ul class='qp-tabs-nav'></ul>").appendTo(this.el);
		}
		if (!this.content.length) {
			this.content = $("<div class='qp-tabs-content'></div>").appendTo(this.el);
		}

		this.nav.wrap("<div class='qp-tabs-nav-wrapper'></div>");
		this.wrapper = this.nav.parent();

		// zavolat předka (overflow + more + popup + resize observer)
		qpOverflowWidget.prototype._create.call(this);

		// vykreslit taby
		this._renderInitialTabs();
		this._renderDataTabs();

		// drag & drop
		if (this.options.draggable) {
			this._enableDrag();
		}

		// context menu
		if (this.options.contextMenu) {
			this._bindContextMenu();
		}

		this._bind();

		this.activate(this.options.active);
		this.checkOverflow();
	},

	// ---------------------------------------
	// BIND
	// ---------------------------------------
	_bind: function() {
		var self = this;
		var ns = "." + this._widgetName;

		this.nav.on("click" + ns, "li", function(e) {
			if ($(e.target).hasClass("qp-tab-close")) return;
			self.activate($(this).index());
		});

		this.nav.on("click" + ns, ".qp-tab-close", function(e) {
			e.stopPropagation();
			self.remove($(this).closest("li").index());
		});
	},

	// ---------------------------------------
	// EXISTUJÍCÍ HTML TABY
	// ---------------------------------------
	_renderInitialTabs: function() {
		var self = this;
		this.nav.children().each(function() {
			self._decorateTab($(this));
		});
	},

	// ---------------------------------------
	// DATA → TABY
	// ---------------------------------------
	_renderDataTabs: function() {
		var self = this;

		if (!this.options.data || !this.options.data.length) return;

		this.options.data.forEach(function(item) {
			var idx = self.add(
				item.title || "Tab",
				item.content || "",
				item.icon || null
			);

			if (item.ajaxUrl) {
				self.options.ajax = true;
				self.options.ajaxMap[idx] = item.ajaxUrl;
			}

			if (item.lazyLoader) {
				self.options.lazy = true;
				self.options.lazyLoader = item.lazyLoader;
			}
		});
	},

	// ---------------------------------------
	// DEKORACE TABU
	// ---------------------------------------
	_decorateTab: function($tab) {
		if (this.options.closable && !$tab.find(".qp-tab-close").length) {
			$("<span class='qp-tab-close'>×</span>").appendTo($tab);
		}
	},

	// ---------------------------------------
	// ADD
	// ---------------------------------------
	add: function(title, htmlContent, icon) {
		var index = this.nav.children().length;

		var $tab = $("<li>" + title + "</li>");
		this._decorateTab($tab);
		this.nav.append($tab);

		var $content = $("<div class='qp-tab-panel'></div>").html(htmlContent || "");
		this.content.append($content);

		// pokud bylo drag & drop zapnuté po vytvoření
		if (this.options.draggable) {
			$tab.attr("draggable", true);
		}

		this.activate(index);
		this.checkOverflow();

		return index;
	},

	// ---------------------------------------
	// REMOVE
	// ---------------------------------------
	remove: function(index) {
		this.nav.children().eq(index).remove();
		this.content.children().eq(index).remove();

		var newIndex = Math.min(index, this.nav.children().length - 1);
		if (newIndex >= 0) {
			this.activate(newIndex);
		}
		this.checkOverflow();
	},

	// ---------------------------------------
	// ACTIVATE
	// ---------------------------------------
	activate: function(index) {
		var tabs = this.nav.children();
		var contents = this.content.children();

		if (!tabs.length) return;

		index = Math.max(0, Math.min(index, tabs.length - 1));
		this.options.active = index;

		tabs.removeClass("active").eq(index).addClass("active");
		contents.removeClass("active").eq(index).addClass("active");

		var $panel = contents.eq(index);

		// lazy
		if (this.options.lazy && !$panel.data("loaded") && typeof this.options.lazyLoader === "function") {
			$panel.html("<div class='qp-tabs-loading'>Loading...</div>");
			this.options.lazyLoader.call(this, index, (html) => {
				$panel.html(html);
				$panel.data("loaded", true);
			});
		}

		// ajax
		if (this.options.ajax && !$panel.data("loaded")) {
			var url = this.options.ajaxMap[index] || this.options.ajaxUrl;
			if (url) {
				$panel.html("<div class='qp-tabs-loading'>Loading...</div>");
				$.get(url, (html) => {
					$panel.html(html);
					$panel.data("loaded", true);
				});
			}
		}

		// nested
		if (this.options.autoInitNested) {
			$panel.find("[data-qp='qpTabs']").each(function() {
				var inst = $(this).data("qpTabs");
				if (inst && typeof inst.refresh === "function") {
					inst.refresh();
				}
			});
		}
	},

	// ---------------------------------------
	// DRAG & DROP
	// ---------------------------------------
	_enableDrag: function() {
		var self = this;
		var ns = "." + this._widgetName;

		// označit existující taby
		this.nav.children().attr("draggable", true);

		this.nav.on("dragstart" + ns, "li", function(e) {
			e.originalEvent.dataTransfer.setData("text/plain", $(this).index());
			$(this).addClass("dragging");
		});

		this.nav.on("dragend" + ns, "li", function() {
			$(this).removeClass("dragging");
		});

		this.nav.on("dragover" + ns, "li", function(e) {
			e.preventDefault();
			$(this).addClass("drag-over");
		});

		this.nav.on("dragleave" + ns, "li", function() {
			$(this).removeClass("drag-over");
		});

		this.nav.on("drop" + ns, "li", function(e) {
			e.preventDefault();
			var oldIndex = parseInt(e.originalEvent.dataTransfer.getData("text/plain"), 10);
			var newIndex = $(this).index();
			$(this).removeClass("drag-over");
			self._reorder(oldIndex, newIndex);
		});
	},

	_reorder: function(oldIndex, newIndex) {
		if (oldIndex === newIndex) return;

		var tabs = this.nav.children();
		var contents = this.content.children();

		var $tab = tabs.eq(oldIndex);
		var $content = contents.eq(oldIndex);

		if (newIndex < oldIndex) {
			$tab.insertBefore(tabs.eq(newIndex));
			$content.insertBefore(contents.eq(newIndex));
		} else {
			$tab.insertAfter(tabs.eq(newIndex));
			$content.insertAfter(contents.eq(newIndex));
		}

		this.activate(newIndex);
		this.checkOverflow();
	},

	// ---------------------------------------
	// OVERFLOW
	// ---------------------------------------
	checkOverflow: function() {
		console.log("qpTabs.checkOverflow,,,");
		var wrapperWidth = this.wrapper.width();
		var navWidth = this.nav[0].scrollWidth;

		if (!this.options.responsive) {
			// když nechceš responsive popup, můžeš to rozšířit o šipky
			this.moreBtn.hide();
			this.popup.hide();
			return;
		}

		if (navWidth > wrapperWidth) {
			this.moreBtn.show();
			this.fillPopup(this._getHiddenTabs());
		} else {
			this.moreBtn.hide();
			this.popup.hide();
		}
	},

	_getHiddenTabs: function() {
		var items = [];
		if (!this.moreBtn.is(":visible")) return items;

		var wrapperRight = this.wrapper.offset().left + this.wrapper.width();
		var moreWidth = this.moreBtn.outerWidth();

		this.nav.children().each((i, el) => {
			var $el = $(el);
			var right = $el.offset().left + $el.outerWidth();

			if (right > wrapperRight - moreWidth) {
				var clone = $el.clone();
				clone.find(".qp-tab-close").remove();
				var text = $.trim(clone.text());

				items.push({
					text: text,
					action: () => this.activate(i)
				});
			}
		});

		return items;
	},

	// ---------------------------------------
	// KONTEXTOVÉ MENU (pokud chceš zachovat)
	// ---------------------------------------
	_bindContextMenu: function() {
		var self = this;
		var ns = "." + this._widgetName;

		this.nav.on("contextmenu" + ns, "li", function(e) {
			e.preventDefault();
			var index = $(this).index();
			self._showContextMenu(e.pageX, e.pageY, index);
		});
	},

	_showContextMenu: function(x, y, index) {
		var self = this;

		$(".qp-tabs-context").remove();

		var $menu = $("<ul class='qp-tabs-context'></ul>").appendTo("body");

		var items = [
			{ text: "Zavřít", action: () => self.remove(index) },
			{ text: "Zavřít ostatní", action: () => self._closeOthers(index) },
			{ text: "Zavřít všechny", action: () => self._closeAll() },
			{ text: "Refresh", action: () => self.activate(index) }
		];

		items.forEach(function(item) {
			$("<li>" + item.text + "</li>")
				.appendTo($menu)
				.on("click", function() {
					item.action();
					$menu.remove();
				});
		});

		$menu.css({ top: x, left: y });
	},

	_closeOthers: function(index) {
		var self = this;
		this.nav.children().each(function(i) {
			if (i !== index) self.remove(i < index ? 0 : 1);
		});
	},

	_closeAll: function() {
		while (this.nav.children().length) {
			this.remove(0);
		}
	}
});

$.qpDefine("qpTabs", qpTabs);
