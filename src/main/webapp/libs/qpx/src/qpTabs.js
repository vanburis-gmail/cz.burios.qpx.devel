/* --------------------------------------------------------
 * widget: qpTabs (orchestrátor)
 * používá: qpTabNav + qpStackLayout
 * --------------------------------------------------------
 */
var qpTabs = qpWidget.extend({

	_widgetName: "qpTabs",

	version: "2.0.0",

	defaults: {
		active: 0,

		// společné chování
		responsive: true,
		closable: true,
		draggable: true,
		contextMenu: true,

		// obsah
		lazy: false,
		lazyLoader: null, // může být funkce nebo string (lookup)
		ajax: false,
		ajaxUrl: null,
		ajaxMap: {},

		autoInitNested: true,

		// deklarativní JSON konfigurace
		// [{ title, content, icon, ajaxUrl, lazyLoader }]
		data: []
	},

	/* ---------------------------------------
	 * CREATE
	 * ---------------------------------------
	 */
	_create: function() {

		this.el.addClass("qp-tabs-root");

		// NAV WRAPPER + UL
		var navWrapper = this.el.find(".qp-tabs-nav-wrapper");
		var navList;

		if (navWrapper.length) {
			navList = navWrapper.find(".qp-tabs-nav").first();
		}
		if (!navWrapper.length) {
			navWrapper = $("<div class='qp-tabs-nav-wrapper'></div>").prependTo(this.el);
		}
		if (!navList || !navList.length) {
			navList = $("<ul class='qp-tabs-nav'></ul>").appendTo(navWrapper);
		}

		// CONTENT
		var contentEl = this.el.find(".qp-tabs-content");
		if (!contentEl.length) {
			contentEl = $("<div class='qp-tabs-content'></div>").appendTo(this.el);
		}

		// pokud máme JSON data, připravíme tabs/panels
		var navTabs = [];
		var panels = [];

		if (Array.isArray(this.options.data) && this.options.data.length) {
			for (var i = 0;i < this.options.data.length;i++) {
				var item = this.options.data[i];
				navTabs.push({
					title: item.title || "Tab",
					icon: item.icon || null
				});
				panels.push({
					content: item.content || ""
				});

				if (item.ajaxUrl) {
					this.options.ajax = true;
					this.options.ajaxMap[i] = item.ajaxUrl;
				}

				if (item.lazyLoader) {
					this.options.lazy = true;
					this.options.lazyLoader = item.lazyLoader;
				}
			}
		}

		// INIT CHILD WIDGETS
		this.nav = new qpTabNav(navWrapper, {
			tabs: navTabs,
			closable: this.options.closable,
			draggable: this.options.draggable,
			responsive: this.options.responsive,
			contextMenu: this.options.contextMenu
		});

		this.content = new qpStackLayout(contentEl, {
			panels: panels,
			lazy: this.options.lazy,
			lazyLoader: this.options.lazyLoader,
			ajax: this.options.ajax,
			ajaxUrl: this.options.ajaxUrl,
			ajaxMap: this.options.ajaxMap
		});

		// propojení eventů
		this._bindNavEvents();

		// HTML initial (pokud nebyla data) – necháme existovat:
		// - qpTabNav si dekoruje <li>
		// - qpStackLayout používá .qp-tab-panel

		// aktivace počátečního tabu
		this.activate(this.options.active);
	},

	/* ---------------------------------------
	 * ADD TAB
	 * ---------------------------------------
	 */
	add: function(title, content, icon) {
		var index = this.nav.addTab(title, icon);
		this.content.addPanel(content);

		this.activate(index);

		if (typeof this.nav.checkOverflow === "function") {
			this.nav.checkOverflow();
		}

		return index;
	},

	/* ---------------------------------------
	 * REMOVE TAB
	 * ---------------------------------------
	 */
	remove: function(index) {
		this.nav.removeTab(index);
		this.content.removePanel(index);

		var tabs = this.nav.getTabs();
		var newIndex = Math.min(index, tabs.length - 1);
		if (newIndex >= 0) this.activate(newIndex);

		if (typeof this.nav.checkOverflow === "function") {
			this.nav.checkOverflow();
		}
	},

	/* ---------------------------------------
	 * ACTIVATE TAB
	 * ---------------------------------------
	 */
	activate: function(index) {
		var tabs = this.nav.getTabs();
		var panels = this.content.getPanels();

		if (!tabs.length) return;

		index = Math.max(0, Math.min(index, tabs.length - 1));
		this.options.active = index;

		this.nav.activate(index);
		this.content.activate(index);

		var $panel = panels.eq(index);

		// lazy loader
		if (this.options.lazy && !$panel.data("loaded") && typeof this.options.lazyLoader === "function") {
			$panel.html("<div class='qp-tabs-loading'>Loading...</div>");
			this.options.lazyLoader.call(this, index, (html) => {
				$panel.html(html);
				$panel.data("loaded", true);
			});
		}

		// ajax loader
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

		// nested tabs refresh
		if (this.options.autoInitNested) {
			$panel.find("[data-qp='qpTabs']").each(function() {
				var inst = $(this).data("qpTabs");
				if (inst && typeof inst.refresh === "function") inst.refresh();
			});
		}
	},

	/* ---------------------------------------
	 * NAV EVENTS BINDING
	 * ---------------------------------------
	 */
	_bindNavEvents: function() {
		var self = this;

		this.nav.onTabClick(function(index) {
			self.activate(index);
		});

		this.nav.onTabClose(function(index) {
			self.remove(index);
		});
	}
});

$.qpDefine("qpTabs", qpTabs);
