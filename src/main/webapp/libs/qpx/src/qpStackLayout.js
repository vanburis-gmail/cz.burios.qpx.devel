/* --------------------------------------------------------
 * widget: qpStackLayout
 * role: správa panelů (stack)
 * --------------------------------------------------------
 */
var qpStackLayout = qpWidget.extend({

	_widgetName: "qpStackLayout",

	version: "1.0.0",

	defaults: {
		// deklarativní JSON konfigurace
		// [{ content }]
		panels: [],

		// chování načítání
		lazy: false,
		lazyLoader: null,  // může být funkce nebo string (lookup)
		ajax: false,
		ajaxUrl: null,
		ajaxMap: {}
	},

	/* ---------------------------------------
	 * CREATE
	 * ---------------------------------------
	 */
	_create: function() {
		this.el.addClass("qp-tabs-content");

		// existující panely (HTML)
		var panels = this.el.children(".qp-tab-panel");

		// pokud nemáme HTML panely, vytvoříme z JSON
		if (!panels.length && Array.isArray(this.options.panels) && this.options.panels.length) {
			this._createPanelsFromOptions();
			panels = this.el.children(".qp-tab-panel");
		}

		if (panels.length && !panels.filter(".active").length) {
			panels.eq(0).addClass("active");
		}
	},

	_createPanelsFromOptions: function() {
		var self = this;

		this.options.panels.forEach(function(p) {
			self.addPanel(p.content);
		});
	},

	/* ---------------------------------------
	 * PUBLIC API
	 * ---------------------------------------
	 */
	addPanel: function(content) {
		var $panel = $("<div class='qp-tab-panel'></div>");
		this._renderContent(content, $panel);
		this.el.append($panel);
		return $panel.index();
	},

	removePanel: function(index) {
		this.el.children().eq(index).remove();
	},

	activate: function(index) {
		var panels = this.getPanels();
		if (!panels.length) return;

		index = Math.max(0, Math.min(index, panels.length - 1));

		panels.removeClass("active").eq(index).addClass("active");
	},

	getPanels: function() {
		return this.el.children(".qp-tab-panel");
	},

	/* ---------------------------------------
	 * UNIVERSAL CONTENT RENDERER
	 * ---------------------------------------
	 */
	_renderTemplate: function(tpl, data) {

		if (typeof tpl === "function") {
			return tpl(data);
		}

		if (typeof tpl === "string" && tpl.startsWith("#")) {
			var html = $(tpl).html();
			if (!html) {
				console.warn("qpStackLayout: template not found:", tpl);
				return "";
			}
			tpl = html;
		}

		if (typeof tpl === "string") {
			return tpl.replace(/\{\{(\w+)\}\}/g, function(_, key) {
				return data && data[key] != null ? data[key] : "";
			});
		}

		console.warn("qpStackLayout: unsupported template:", tpl);
		return "";
	},

	_renderContent: function(content, $container) {

		// 1) TEMPLATE OBJECT
		if ($.isPlainObject(content) && (content.template || content.templateId)) {
			var tpl = content.template || content.templateId;
			var html = this._renderTemplate(tpl, content.data || {});
			$container.html(html);
			return;
		}

		// 2) funkce
		if (typeof content === "function") {
			content = content.call(this);
		}

		// 3) pole
		if (Array.isArray(content)) {
			for (var i = 0;i < content.length;i++) {
				this._renderContent(content[i], $container);
			}
			return;
		}

		// 4) JSON widget
		if (this._isWidgetJson(content)) {
			qpWidgetFactory.create(content, $container);
			return;
		}

		// 5) instance widgetu
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
			console.warn("qpStackLayout: Unsupported content:", content);
		}
	},

	_isWidgetJson: function(obj) {
		return $.isPlainObject(obj) && typeof obj.type === "string";
	}
});

$.qpDefine("qpStackLayout", qpStackLayout);
