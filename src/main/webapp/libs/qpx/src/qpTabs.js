/* --------------------------------------------------------
 * plugin: qpTabs
 * --------------------------------------------------------
 */
var qpTabs = qpOverflowWidget.extend({

	_widgetName: "qpTabs",

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

	/* ---------------------------------------
	 * CREATE
	 * ---------------------------------------
	 */
	_create: function() {

		// root layout class
		this.el.addClass("qp-tabs-root");

		// NAV + CONTENT
		this.nav = this.el.find(".qp-tabs-nav");
		this.content = this.el.find(".qp-tabs-content");

		if (!this.nav.length) {
			this.nav = $("<ul class='qp-tabs-nav'></ul>").appendTo(this.el);
		}
		if (!this.content.length) {
			this.content = $("<div class='qp-tabs-content'></div>").appendTo(this.el);
		}

		// wrapper for nav
		this.nav.wrap("<div class='qp-tabs-nav-wrapper'></div>");
		this.wrapper = this.nav.parent();

		// overflow logic (more button, popup, resize observer)
		qpOverflowWidget.prototype._create.call(this);

		// render initial HTML tabs
		this._renderInitialTabs();

		// render data-driven tabs
		this._renderDataTabs();

		// bind events
		this._bind();

		// activate initial tab
		this.activate(this.options.active);

		// overflow check
		this.checkOverflow();
	},

	/* ---------------------------------------
	 * TEMPLATE SUPPORT
	 * ---------------------------------------
	 */
	_renderTemplate: function(tpl, data) {

		// function template
		if (typeof tpl === "function") {
			return tpl(data);
		}

		// template ID
		if (typeof tpl === "string" && tpl.startsWith("#")) {
			var html = $(tpl).html();
			if (!html) {
				console.warn("qpTabs: template not found:", tpl);
				return "";
			}
			tpl = html;
		}

		// string template
		if (typeof tpl === "string") {
			return tpl.replace(/\{\{(\w+)\}\}/g, function(_, key) {
				return data && data[key] != null ? data[key] : "";
			});
		}

		console.warn("qpTabs: unsupported template:", tpl);
		return "";
	},

	/* ---------------------------------------
	 * UNIVERSAL CONTENT RENDERER
	 * ---------------------------------------
	 */
	_renderContent: function(content, $container) {

		// 1) TEMPLATE
		if ($.isPlainObject(content) && (content.template || content.templateId)) {
			var tpl = content.template || content.templateId;
			var html = this._renderTemplate(tpl, content.data || {});
			$container.html(html);
			return;
		}

		// 2) lazy function
		if (typeof content === "function") {
			content = content.call(this);
		}

		// 3) array
		if (Array.isArray(content)) {
			for (var i = 0; i < content.length; i++) {
				this._renderContent(content[i], $container);
			}
			return;
		}

		// 4) JSON widget
		if (this._isWidgetJson(content)) {
			qpWidgetFactory.create(content, $container);
			return;
		}

		// 5) instance of widget
		if (content instanceof qpWidget) {
			$container.append(content.el);
			return;
		}

		// 6) jQuery element
		if (content instanceof jQuery) {
			$container.append(content);
			return;
		}

		// 7) HTML / text
		if (typeof content === "string" || typeof content === "number") {
			$container.html(content);
			return;
		}

		if (content != null) {
			console.warn("qpTabs: Unsupported content:", content);
		}
	},

	_isWidgetJson: function(obj) {
		return $.isPlainObject(obj) && typeof obj.type === "string";
	},

	/* ---------------------------------------
	 * INITIAL HTML TABS
	 * ---------------------------------------
	 */
	_renderInitialTabs: function() {
		var self = this;
		this.nav.children().each(function() {
			self._decorateTab($(this));
		});
	},

	/* ---------------------------------------
	 * DATA → TABS
	 * ---------------------------------------
	 */
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

	/* ---------------------------------------
	 * DECORATE TAB
	 * ---------------------------------------
	 */
	_decorateTab: function($tab) {
		if (this.options.closable && !$tab.find(".qp-tab-close").length) {
			$("<span class='qp-tab-close'>×</span>").appendTo($tab);
		}
	},

	/* ---------------------------------------
	 * ADD TAB
	 * ---------------------------------------
	 */
	add: function(title, content, icon) {
		var index = this.nav.children().length;

		var $tab = $("<li>" + title + "</li>");
		this._decorateTab($tab);
		this.nav.append($tab);

		var $panel = $("<div class='qp-tab-panel'></div>");
		this._renderContent(content, $panel);
		this.content.append($panel);

		if (this.options.draggable) $tab.attr("draggable", true);

		this.activate(index);
		this.checkOverflow();

		return index;
	},

	/* ---------------------------------------
	 * REMOVE TAB
	 * ---------------------------------------
	 */
	remove: function(index) {
		this.nav.children().eq(index).remove();
		this.content.children().eq(index).remove();

		var newIndex = Math.min(index, this.nav.children().length - 1);
		if (newIndex >= 0) this.activate(newIndex);

		this.checkOverflow();
	},

	/* ---------------------------------------
	 * ACTIVATE TAB
	 * ---------------------------------------
	 */
	activate: function(index) {
		var tabs = this.nav.children();
		var contents = this.content.children();

		if (!tabs.length) return;

		index = Math.max(0, Math.min(index, tabs.length - 1));
		this.options.active = index;

		tabs.removeClass("active").eq(index).addClass("active");
		contents.removeClass("active").eq(index).addClass("active");

		var $panel = contents.eq(index);

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
	 * BIND EVENTS
	 * ---------------------------------------
	 */
	_bind: function() {
		var self = this;
		var ns = "." + this._widgetName;

		// click on tab
		this.nav.on("click" + ns, "li", function() {
			self.activate($(this).index());
		});

		// close button
		this.nav.on("click" + ns, ".qp-tab-close", function(e) {
			e.stopPropagation();
			var index = $(this).closest("li").index();
			self.remove(index);
		});
	},

	/* ---------------------------------------
	 * OVERFLOW API (UNIFIED)
	 * ---------------------------------------
	 */
	getOverflowTargetWidth: function() {
		return this.wrapper.width();
	},

	getOverflowItems: function() {
		var items = [];
		var wrapperRight = this.wrapper.offset().left + this.wrapper.width();
		var moreWidth = this.moreBtn.outerWidth();

		this.nav.children().each((i, el) => {
			var $el = $(el);
			var right = $el.offset().left + $el.outerWidth();

			if (right > wrapperRight - moreWidth) {
				items.push({
					text: $el.text().trim(),
					action: () => this.activate(i)
				});
			}
		});

		return items;
	},

	onOverflowChange: function(isOverflowing) {
		// nothing special for tabs
	}
});

$.qpDefine("qpTabs", qpTabs);
