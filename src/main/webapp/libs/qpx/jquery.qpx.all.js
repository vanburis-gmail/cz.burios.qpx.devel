// ================================
// OOP engine: Class
// ================================
(function(global) {

	var Class = function() {};
	
	Class.extend = function(props) {
		var _super = this.prototype || {};
		var prototype = Object.create(_super);
		
		for (var name in props) {
			if (!props.hasOwnProperty(name)) continue;
			
			if (typeof props[name] === "function" &&
				typeof _super[name] === "function") {
	
				// Wrap pro super volání
				prototype[name] = (function(name, fn) {
					return function() {
						var tmp = this._super;
						this._super = _super[name];
						var result = fn.apply(this, arguments);
						this._super = tmp;
						return result;
					};
				})(name, props[name]);
			} else {
				prototype[name] = props[name];
			}
		}

		function SubClass() {
			if (this.init) {
				this.init.apply(this, arguments);
			}
		}
		SubClass.prototype = prototype;
		SubClass.prototype.constructor = SubClass;
		SubClass.extend = Class.extend;
		
		return SubClass;
	};
	global.Class = Class;
})(window);

// ================================
// Globální konfigurace frameworku
// ================================
var qpConfig = {
	debug: false
};

/**
 *  EventEmitter je globální pro komunikaci mezi widgety
 * 
 * Umožní:
 * 
 * - widget → widget komunikaci
 * - globální eventy (např. „themeChanged“, „layoutUpdated“)
 * - debugování
 * - odpojování eventů podle namespace
 * 
 * Použití:
 * <pre>
 * qpEvents.on("themeChanged", function(theme) {
 *   console.log("Theme changed to:", theme);
 * });
 * </pre>
 * 
 */
// ================================
// 3) Globální EventEmitter pro komunikaci mezi widgety
// ================================
var qpEvents = {
	_events: {},

	on: function(event, handler) {
		if (!this._events[event]) {
			this._events[event] = [];
		}
		this._events[event].push(handler);
	},

	off: function(event) {
		if (this._events[event]) {
			delete this._events[event];
		}
	},

	trigger: function(event, data) {
		var handlers = this._events[event];
		if (handlers) {
			handlers.forEach(function(fn) {
				fn(data);
			});
		}
	}
};

/**
 *  qpRegistry Umožní:
 * 
 * - registrovat widgety podle jména
 * - později je introspektovat
 * - automaticky inicializovat widgety přes data‑atributy
 * - řešit konflikty jmen
 */
// ================================
// 4) Widget registry (třídy + instance)
// ================================
var qpRegistry = {
	widgets: {},
	instances: [],

	register: function(name, widgetClass) {
		if (this.widgets[name]) {
			console.warn("qpWidget '" + name + "' je již registrován.");
		}
		this.widgets[name] = widgetClass;
	},

	get: function(name) {
		return this.widgets[name];
	},

	registerInstance: function(instance) {
		this.instances.push(instance);
	},

	findByElement: function(el) {
		return this.instances.find(function(inst) {
			return inst.el && inst.el[0] === el;
		});
	}
};

/**
 * 
 * qpMixin (rozšiřitelnost bez dědičnosti)
 * Mixiny jsou ideální pro:
 * - resizable
 * - selectable
 * - draggable
 * - keyboard navigation
 * - event namespaces
 * 
 * Příklad použití:
 * <pre>
 * qpMixin.apply(qpTabs.prototype, {
 *   logActive: function() {
 *     console.log("Active tab:", this.options.active);
 *   }
 * });
 * </pre>
 * 
 */
var qpMixin = {
	apply: function(targetPrototype, mixin) {
		Object.keys(mixin).forEach(function(key) {
			if (typeof mixin[key] === "function") {
				targetPrototype[key] = mixin[key];
			}
		});
	}
};

/**
 * Tohle je tvrdé jádro frameworku.
 * Obsahuje: 
 * 
 * - init(el, options)
 * - defaults
 * - render()
 * - destroy()
 * - trigger(eventName, data)
 * - on(eventName, handler)
 * - off(eventName)
 * - setOption(key, value)
 * - refresh()
 * 
 * - beforeCreate
 * - afterCreate
 * - beforeRender
 * - afterRender
 * - beforeDestroy
 * - afterDestroy
 */
var qpWidget = Class.extend({
	// Defaultní options – potomci si rozšiřují/override
	defaults: {
		width: null,
		height: null
	},
	// Verze widgetu – potomci mohou přepsat
	version: "1.0.0",
	// Konstruktor
	init: function(el, options) {
		this.el = $(el);
		this.options = $.extend(true, {}, this.defaults, options);
		this._events = {};      // interní eventy (on/trigger)
		this._timeline = [];    // lifecycle log
		this._widgetId = "qp-" + Math.random().toString(36).substr(2, 9);
		this._createdAt = Date.now();
		this._version = this.version || "1.0.0";
		this._widgetName = this._widgetName || "qpWidget";
		if (this.options.width != null) {
			if (typeof this.options.width === "number") {
				this.el.css("width", this.options.width + "px");
			} else {
				this.el.css("width", this.options.width);
			}
		}
		if (this.options.height != null) {
			if (typeof this.options.height === "number") {
				this.el.css("height", this.options.height + "px");
			} else {
				this.el.css("height", this.options.height);
			}
		}
		this.timeline("init:start");
		this.beforeCreate();
		this.timeline("beforeCreate");
		this._create();
		this.timeline("_create");
		this.afterCreate();
		this.timeline("afterCreate");
		this._bind();
		this.timeline("_bind");
		this.beforeRender();
		this.timeline("beforeRender");
		this.render();
		this.timeline("render");
		this.afterRender();
		this.timeline("afterRender");
		this.timeline("init:end");
	},
	// ---- Lifecycle hooks ----
	beforeCreate: function() { },
	afterCreate: function() { },
	beforeRender: function() { },
	afterRender: function() { },
	beforeDestroy: function() { },
	afterDestroy: function() { },

	// ---- Vnitřní lifecycle metody k override ----
	_create: function() { },
	_bind: function() { },
	render: function() { },

	refresh: function() {
		this.timeline("refresh");
	},
	// ---- Destroy ----
	destroy: function() {
		this.timeline("destroy:start");
		this.beforeDestroy();
		// odpojení jQuery eventů s namespace
		if (this._widgetName) {
			this.el.off("." + this._widgetName);
		}
		// interní eventy
		this._events = {};
		// odstranění data z elementu
		if (this.el) {
			this.el.removeData(this._widgetName);
		}
		this.afterDestroy();
		this.timeline("destroy:end");
	},
	// ============================
	// Event API (lokální pro instanci)
	// ============================
	on: function(eventName, handler) {
		if (!this._events[eventName]) {
			this._events[eventName] = [];
		}
		this._events[eventName].push(handler);
	},
	off: function(eventName) {
		if (this._events[eventName]) {
			delete this._events[eventName];
		}
	},
	trigger: function(eventName, data) {
		var handlers = this._events[eventName];
		if (handlers) {
			handlers.forEach(function(fn) {
				fn.call(this, data);
			}, this);
		}
	},
	// ============================
	// Global event API (mezi widgety)
	// ============================
	sendGlobal: function(event, data) {
		qpEvents.trigger(event, data);
	},
	listenGlobal: function(event, handler) {
		qpEvents.on(event, handler);
	},
	stopGlobal: function(event) {
		qpEvents.off(event);
	},
	// ============================
	// Options API
	// ============================
	setOption: function(key, value) {
		this.options[key] = value;
		this.timeline("setOption:" + key);
		this.refresh();
	},
	getOption: function(key) {
		return this.options[key];
	},
	// ============================
	// Debug / logování / timeline
	// ============================
	log: function() {
		if (qpConfig.debug) {
			var args = Array.prototype.slice.call(arguments);
			args.unshift("[" + this._widgetName + "][" + this._widgetId + "]");
			console.log.apply(console, args);
		}
	},
	timeline: function(event) {
		this._timeline.push({
			event: event,
			time: Date.now()
		});
		this.log("lifecycle:", event);
	},
	renderTo: function($container) {
		// přesun widgetu do nového kontejneru
		$container.append(this.el);
		// pokud widget ještě nebyl renderován (lazy)
		if (!this._rendered) {
			this.beforeRender();
			this.render();
			this.afterRender();
			this._rendered = true;
		}
		return this;
	}
});

/**
 * - registraci widgetu
 * - jQuery plugin wrapper
 * - metadata (_widgetName)
 * - bezpečnou inicializaci
 */
(function($) {
	$.qpDefine = function(name, widgetClass) {
		// registrace widget třídy
		qpRegistry.register(name, widgetClass);
		$.fn[name] = function(options) {
			var args = Array.prototype.slice.call(arguments, 1);
			return this.each(function() {
				var instance = $.data(this, name);
				// vytvoření instance
				if (!instance && typeof options !== "string") {
					instance = new widgetClass(this, options);
					instance._widgetName = name;
					$.data(this, name, instance);
					qpRegistry.registerInstance(instance);
				}
				// volání metody
				if (instance && typeof options === "string") {
					var method = options;
					if (typeof instance[method] === "function") {
						instance[method].apply(instance, args);
					} else {
						if (qpConfig.debug) {
							console.warn("Metoda '" + method + "' neexistuje na widgetu '" + name + "'.");
						}
					}
				}
			});
		};
	};
})(jQuery);

/*
 * Automatická inicializace přes data-atributy
 * <div data-qp="qpTabs" data-active="1"></div>
 */
$(function() {
	$("[data-qp]").each(function() {
		var $el = $(this);
		var widgetName = $el.data("qp");
		var WidgetClass = qpRegistry.get(widgetName);
		if (!WidgetClass) {
			if (qpConfig.debug) {
				console.warn("Widget '" + widgetName + "' není registrován.");
			}
			return;
		}
		var options = {};
		// načíst všechna data-* kromě data-qp
		var dataset = this.dataset || {};
		Object.keys(dataset).forEach(function(key) {
			if (key === "qp") return;
			options[key] = dataset[key];
		});
		// inicializace přes jQuery plugin
		if (typeof $el[widgetName] === "function") {
			$el[widgetName](options);
		}
	});
});
/**
 * qpWidgetFactory
 * -------------------------
 * Centrální továrna na widgety.
 * Přijímá JSON definici:
 * 
 * {
 *    type: "qpDataGrid",
 *    options: {...}
 * }
 * 
 * Vrací instanci widgetu.
 */
var qpWidgetFactory = {

    /**
     * Vytvoří widget z JSON definice.
     * @param {Object} json - { type: "...", options: {...} }
     * @param {jQuery} $container - kam widget vložit
     * @returns {qpWidget|null}
     */
    create: function(json, $container) {

        if (!json || typeof json.type !== "string") {
            console.error("qpWidgetFactory: invalid JSON widget definition:", json);
            return null;
        }

        var WidgetClass = window[json.type];

        if (typeof WidgetClass !== "function") {
            console.error("qpWidgetFactory: unknown widget type:", json.type);
            return null;
        }

        // vytvoříme host element
        var $host = $("<div></div>").appendTo($container);

        // konstruktor widgetu (el, options)
        var widget = new WidgetClass($host, json.options || {});

        return widget;
    }
};

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

var qpButton = qpWidget.extend({
	_widgetName: "qpButton",
	defaults: {
		id: null,
		text: "",
		icon: null,
		toggle: false,
		onClick: null
	},
	_create: function() {
		this.el.addClass("qp-btn");
		if (this.options.icon) {
			var $icon = $("<span class='qp-btn-icon'></span>");
			if (this.options.icon.indexOf("<svg") === 0) {
				$icon.html(this.options.icon);
			} else if (this.options.icon.indexOf("/") !== -1) {
				$icon.append("<img src='" + this.options.icon + "'/>");
			} else {
				$icon.addClass(this.options.icon);
			}
			this.el.append($icon);
		}
		if (this.options.text) {
			this.el.append("<span class='qp-btn-text'>" + this.options.text + "</span>");
		}
		if (this.options.toggle) {
			this.el.addClass("qp-btn-toggle");
		}
		this._bind();
	},
	_bind: function() {
		var self = this;

		this.el.on("click." + this._widgetName, function() {
			if (self.options.toggle) {
				self.el.toggleClass("active");
			}
			if (self.options.onClick) {
				self.options.onClick(self.options.id, self.el);
			}
		});
	}
});

$.qpDefine("qpButton", qpButton);

var qpDropdownMenu = qpWidget.extend({
	_widgetName: "qpDropdownMenu",
	defaults: {
		id: null,
		text: "",
		icon: null,
		items: [],
		onClick: null
	},
	_create: function() {
		var self = this;
		this.el.addClass("qp-btn qp-btn-dropdown");
		if (this.options.icon) {
			var $icon = $("<span class='qp-btn-icon'></span>");
			$icon.append("<img src='" + this.options.icon + "'/>");
			this.el.append($icon);
		}
		this.el.append("<span class='qp-btn-text'>" + this.options.text + "</span>");
		this.el.append("<span class='qp-btn-arrow'>▼</span>");

		this.menu = $("<ul class='qp-toolbar-dropdown'></ul>").appendTo("body").hide();

		this.options.items.forEach(function(mi) {
            $("<li>" + mi.text + "</li>")
                .appendTo(self.menu)
                .on("click", function(e) {
                    e.stopPropagation();
                    self.menu.hide();
                    if (self.options.onClick) {
                        self.options.onClick(mi.id, self.el);
                    }
                });
        });
        this._bind();
    },
    _bind: function() {
        var self = this;
        this.el.on("click." + this._widgetName, function(e) {
            e.stopPropagation();
            self._toggle();
        });
        $(document).on("click." + this._widgetName, function() {
            self.menu.hide();
        });
    },
    _toggle: function() {
        if (this.menu.is(":visible")) {
            this.menu.hide();
        } else {
            var o = this.el.offset();
            this.menu.css({
                top: o.top + this.el.outerHeight(),
                left: o.left
            }).show();
        }
    }
});

$.qpDefine("qpDropdownMenu", qpDropdownMenu);

/* --------------------------------------------------------
 * plugin: qpToolBar
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

            var widget;

            if (item.type === "button") {
                widget = $("<div></div>").appendTo(self.bar).qpButton({
                    id: item.id,
                    text: item.text,
                    icon: item.icon,
                    toggle: item.toggle,
                    onClick: self.options.onClick
                });
            }

            if (item.type === "dropdown") {
                widget = $("<div></div>").appendTo(self.bar).qpDropdownMenu({
                    id: item.id,
                    text: item.text,
                    icon: item.icon,
                    items: item.menu,
                    onClick: self.options.onClick
                });
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

/* --------------------------------------------------------
 * widget: qpTabNav
 * role: navigace tabů + overflow + responsive/scroll
 * --------------------------------------------------------
 */
var qpTabNav = qpOverflowWidget.extend({

    _widgetName: "qpTabNav",

    version: "1.0.0",

    defaults: {
        // deklarativní JSON konfigurace
        // [{ title, icon }]
        tabs: [],

        // vzhled/behavior
        closable: true,
        draggable: true,
        responsive: true,     // true = popup, false = scroll tlačítka
        contextMenu: true
    },

    /* ---------------------------------------
     * CREATE
     * ---------------------------------------
     */
    _create: function() {

        // wrapper pro navigaci
        this.el.addClass("qp-tabs-nav-wrapper");

        // samotný <ul> s taby
        this.nav = this.el.find(".qp-tabs-nav");
        if (!this.nav.length) {
            this.nav = $("<ul class='qp-tabs-nav'></ul>").appendTo(this.el);
        }

        // existující HTML <li> dekorujeme
        this._decorateExistingTabs();

        // JSON tabs → vytvořit
        this._createTabsFromOptions();

        // overflow logika (more button, popup, resize observer)
        qpOverflowWidget.prototype._create.call(this);

        // navigační tlačítka (scroll) pro responsive:false
        if (this.options.responsive === false) {
            this._createScrollButtons();
        }

        // bind událostí
        this._bind();
    },

    /* ---------------------------------------
     * INITIAL TABS DECORATION
     * ---------------------------------------
     */
    _decorateExistingTabs: function() {
        var self = this;
        this.nav.children("li").each(function() {
            self._decorateTab($(this));
        });
    },

    _decorateTab: function($tab) {
        if (this.options.closable && !$tab.find(".qp-tab-close").length) {
            $("<span class='qp-tab-close'>×</span>").appendTo($tab);
        }
        if (this.options.draggable) {
            $tab.attr("draggable", true);
        }
    },

    _createTabsFromOptions: function() {
        var self = this;

        if (!Array.isArray(this.options.tabs) || !this.options.tabs.length) return;

        this.options.tabs.forEach(function(t) {
            self.addTab(t.title || "Tab", t.icon || null);
        });
    },

    /* ---------------------------------------
     * PUBLIC API
     * ---------------------------------------
     */
    addTab: function(title, icon) {
        var html = "";

        if (icon) {
            html += "<span class='qp-tab-icon " + icon + "'></span>";
        }
        html += title;

        var $tab = $("<li>" + html + "</li>");
        this._decorateTab($tab);
        this.nav.append($tab);
        this.checkOverflow && this.checkOverflow();
        return $tab.index();
    },

    removeTab: function(index) {
        this.nav.children().eq(index).remove();
        this.checkOverflow && this.checkOverflow();
    },

    activate: function(index) {
        var tabs = this.nav.children();
        if (!tabs.length) return;

        index = Math.max(0, Math.min(index, tabs.length - 1));

        tabs.removeClass("active").eq(index).addClass("active");

        // posunout do viditelné oblasti při scroll režimu
        if (this.options.responsive === false) {
            this._scrollTabIntoView(index);
        }
    },

    getTabs: function() {
        return this.nav.children();
    },

    onTabClick: function(handler) {
        this._onTabClick = handler;
    },

    onTabClose: function(handler) {
        this._onTabClose = handler;
    },

    /* ---------------------------------------
     * BIND EVENTS
     * ---------------------------------------
     */
    _bind: function() {
        var self = this;
        var ns = "." + this._widgetName;

        // click na tab
        this.nav.on("click" + ns, "li", function(e) {
            var $li = $(this);

            // ignore click na close (řešíme zvlášť)
            if ($(e.target).closest(".qp-tab-close").length) return;

            var index = $li.index();
            if (self._onTabClick) self._onTabClick(index);
        });

        // close button
        this.nav.on("click" + ns, ".qp-tab-close", function(e) {
            e.stopPropagation();
            var index = $(this).closest("li").index();
            if (self._onTabClose) self._onTabClose(index);
        });

        // drag & drop (základní varianta)
        if (this.options.draggable) {
            this._bindDragAndDrop(ns);
        }
    },

    _bindDragAndDrop: function(ns) {
        var self = this;
        var dragIndex = null;

        this.nav.on("dragstart" + ns, "li", function(e) {
            dragIndex = $(this).index();
            e.originalEvent.dataTransfer.effectAllowed = "move";
        });

        this.nav.on("dragover" + ns, "li", function(e) {
            e.preventDefault();
            e.originalEvent.dataTransfer.dropEffect = "move";
        });

        this.nav.on("drop" + ns, "li", function(e) {
            e.preventDefault();
            var targetIndex = $(this).index();
            if (dragIndex == null || dragIndex === targetIndex) return;

            var $tabs = self.nav.children();
            var $dragged = $tabs.eq(dragIndex);

            if (targetIndex === $tabs.length - 1) {
                $dragged.appendTo(self.nav);
            } else if (dragIndex < targetIndex) {
                $dragged.insertAfter($tabs.eq(targetIndex));
            } else {
                $dragged.insertBefore($tabs.eq(targetIndex));
            }

            dragIndex = null;
            self.checkOverflow && self.checkOverflow();
        });
    },

    /* ---------------------------------------
     * SCROLL BUTTONS (responsive:false)
     * ---------------------------------------
     */
    _createScrollButtons: function() {
        if (this.el.find(".qp-tabs-nav-prev").length) return;

        this.prevBtn = $("<button type='button' class='qp-tabs-nav-prev' aria-label='Previous tabs'>&lsaquo;</button>")
            .prependTo(this.el);
        this.nextBtn = $("<button type='button' class='qp-tabs-nav-next' aria-label='Next tabs'>&rsaquo;</button>")
            .appendTo(this.el);

        var self = this;
        this.prevBtn.on("click", function() {
            self._scrollBy(-100);
        });
        this.nextBtn.on("click", function() {
            self._scrollBy(100);
        });

        this.nav.css({
            overflow: "hidden",
            whiteSpace: "nowrap"
        });
    },

    _scrollBy: function(delta) {
        var current = this.nav.scrollLeft();
        this.nav.scrollLeft(current + delta);
    },

    _scrollTabIntoView: function(index) {
        var $tab = this.nav.children().eq(index);
        if (!$tab.length) return;

        var navOffset = this.nav.offset().left;
        var navScroll = this.nav.scrollLeft();
        var navWidth = this.nav.innerWidth();

        var tabOffset = $tab.offset().left;
        var tabWidth = $tab.outerWidth();

        var left = tabOffset - navOffset + navScroll;
        var right = left + tabWidth;

        if (left < navScroll) {
            this.nav.scrollLeft(left);
        } else if (right > navScroll + navWidth) {
            this.nav.scrollLeft(right - navWidth);
        }
    },

    /* ---------------------------------------
     * OVERFLOW API (UNIFIED)
     * ---------------------------------------
     */
    getOverflowTargetWidth: function() {
        return this.el.width();
    },

    getOverflowItems: function() {
        var items = [];

        // pokud responsive:false, overflow řešíme přes scroll tlačítka
        if (this.options.responsive === false) {
            return items;
        }

        var wrapperRight = this.el.offset().left + this.el.width();
        var moreWidth = this.moreBtn ? this.moreBtn.outerWidth() : 0;

        this.nav.children().each((i, el) => {
            var $el = $(el);
            var right = $el.offset().left + $el.outerWidth();

            if (right > wrapperRight - moreWidth) {
                items.push({
                    text: $el.text().trim(),
                    action: () => {
                        if (this._onTabClick) this._onTabClick(i);
                        this.activate(i);
                    }
                });
            }
        });

        return items;
    },

    onOverflowChange: function(isOverflowing) {
        // místo pro další logiku (třeba CSS stavy)
    }
});

$.qpDefine("qpTabNav", qpTabNav);

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

/**
 * qpDataGrid
 */
var qpDataGrid = qpWidget.extend({

	_widgetName: "qpDataGrid",
	
	version: "1.0.0",
	defaults: {
		dataSource: {
			type: "local",   // "local" | "remote"
			data: [],        // pokud type = "local"
			transport: {     // pokud type = "remote"
				read: {
					url: null,
					method: "GET",
					params: {} // nebo function(state) { return {...}; }
				}
			},
			onLoaded: null
		},
		columns: [],
		responsive: true,
		rowHeight: 32,
		selectable: true,
		editable: false,
		template: null,
		onRowClick: null,
		onRowDblClick: null,
		onRowSelect: null,
		selectionMode: "single",
		reorderable: false
	},

	_create: function() {
		this.el.addClass("qp-dg");
		this.el.data("qpDataGrid", this);

		// interní cache dat
		this._data = [];

		// interní stav gridu (sorting, filtering, paging)
		this._state = {
			// sort: { field: null, dir: null },
			sort: [],
			filters: [],
			page: 1,
			pageSize: 50
		};

		// zajistíme fill sloupec
		if (!this.options.columns.some(c => c.fill)) {
			this.options.columns.push({ fill: true });
		}

		// HEADER
		this.header = new qpDataGridHeader(
			$('<div class="qp-dg-header"></div>').appendTo(this.el),
			{
				columns: this.options.columns,
				grid: this,
				reorderable: this.options.reorderable
			}
		);

		// BODY
		this.body = $('<div class="qp-dg-body"></div>').appendTo(this.el);

		// NAČTENÍ DAT
		this._loadDataSource();

		// klávesová navigace
		this._bindKeyboardNavigation();
	},

	// ---------------------------------------------------------
	// DATASOURCE LOADING (LOCAL / REMOTE + DYNAMIC PARAMS)
	// ---------------------------------------------------------
	_loadDataSource: function() {
		var ds = this.options.dataSource || {};
		var self = this;

		// fallback: pokud někdo předal přímo pole
		if (Array.isArray(ds)) {
			this._data = ds;
			this._renderRows();
			return;
		}

		var type = ds.type || "local";

		// LOCAL DATASOURCE
		if (type === "local") {
			this._data = ds.data || [];
			this._renderRows();
			if (typeof ds.onLoaded === "function") ds.onLoaded(this._data);
			return;
		}

		// REMOTE DATASOURCE
		if (type === "remote") {
			var read = ds.transport.read;

			if (!read.url) {
				console.error("qpDataGrid: dataSource.transport.read.url is required for remote dataSource.");
				this._data = [];
				this._renderRows();
				return;
			}

			// dynamic params
			var params = {};
			if (typeof read.params === "function") {
				params = read.params(this._state);
			} else if (typeof read.params === "object") {
				params = read.params;
			}

			// 🔥 automatické doplnění sort parametrů
			var sort = this._state.sort;
				/*
			if (sort && sort.field) {
				params.sortField = sort.field;
				params.sortDir = sort.dir;
				if (Array.isArray(this._state.sort) && this._state.sort.length) {
				    params.sort = this._state.sort.map(s => ({
				        field: s.field,
				        dir: s.dir
				    }));
				}
			}
				*/
			params.sort = this._state.sort.map(s => ({ 
				field: s.field, 
				dir: s.dir 
			}));
			console.log("_loadDataSource.param: ", params);
			$.ajax({
				url: read.url,
				method: read.method || "GET",
				data: params,
				contentType : 'application/json; charset=utf-8',
				success: function(response) {
					self._data = response || [];
					self._renderRows();
					if (typeof ds.onLoaded === "function") ds.onLoaded(self._data);
				},
				error: function(xhr) {
					console.error("qpDataGrid: remote dataSource load failed.", xhr);
					self._data = [];
					self._renderRows();
				}
			});

			return;
		}

		// fallback
		this._data = ds.data || [];
		this._renderRows();
		if (typeof ds.onLoaded === "function") ds.onLoaded(this._data);
	},

	// ---------------------------------------------------------
	// RENDER ROWS
	// ---------------------------------------------------------
	_renderRows: function() {
		var self = this;

		this.body.empty();
		this.rows = [];

		(this._data || []).forEach(function(rowData, index) {
			var $row = $('<div class="qp-dg-row"></div>').appendTo(self.body);

			var row = new qpDataGridRow($row, {
				index: index,
				data: rowData,
				columns: self.options.columns,
				responsive: self.options.responsive,
				selectable: self.options.selectable,
				editable: self.options.editable,
				template: self.options.template,
				selectionMode: self.options.selectionMode,

				onClick: function(data, rowInstance) {
					if (self.options.onRowClick) self.options.onRowClick(data, rowInstance);
				},
				onDblClick: function(data, rowInstance) {
					if (self.options.onRowDblClick) self.options.onRowDblClick(data, rowInstance);
				},
				onSelect: function(data, rowInstance) {
					if (self.options.onRowSelect) self.options.onRowSelect(data, rowInstance);
				}
			});

			self.rows.push(row);
		});
	},

	// ---------------------------------------------------------
	// SORTING API (voláno z headerCell)
	// ---------------------------------------------------------
	/*
	_setSort: function(field) {
		var sort = this._state.sort;

		if (sort.field !== field) {
			this._state.sort = { field: field, dir: "asc" };
		} else {
			this._state.sort.dir = sort.dir === "asc" ? "desc" : "asc";
		}

		// aktualizace ikon v headeru
		this.header.items.forEach(function(item) {
			item.widget.updateSortIcon();
		});

		// načtení dat
		this._loadDataSource();
	},
	*/
	_setSort: function(field, shiftKey, ctrlKey) {
		console.log("SET SORT:", field, "shift:", shiftKey, "ctrl:", ctrlKey);

	    var sorts = this._state.sort;

	    // CTRL = RESET SORTS
	    if (ctrlKey) {
	        this._state.sort = [{ field: field, dir: "asc" }];
	    }
	    else if (!shiftKey) {
	        // SINGLE SORT MODE
	        var existing = sorts.find(s => s.field === field);

	        if (!existing) {
	            this._state.sort = [{ field: field, dir: "asc" }];
	        } else {
	            existing.dir = existing.dir === "asc" ? "desc" : "asc";
	            this._state.sort = [existing];
	        }
	    }
	    else {
	        // MULTI SORT MODE (Shift+Click)
	        var existing = sorts.find(s => s.field === field);

	        if (!existing) {
	            sorts.push({ field: field, dir: "asc" });
	        } else {
	            existing.dir = existing.dir === "asc" ? "desc" : "asc";
	        }
	    }
		console.log("STATE SORT:", this._state.sort);
		
	    // UPDATE HEADER ICONS
	    this.header.items.forEach(function(item) {
	        item.widget.updateSortIcon();
	    });

	    // LOAD DATA
	    this._loadDataSource();
	},

	// ---------------------------------------------------------
	// HEADER DRAG-RESIZE
	// ---------------------------------------------------------
	_onHeaderResizeStart: function(e, index) {
		var self = this;
		this._isResizing = true;

		var startX = e.pageX;
		var col = this.options.columns[index];
		var startWidth = col.width || self.header.items[index].wrapper.outerWidth() || 100;

		function onMove(e2) {
			var delta = e2.pageX - startX;
			var newWidth = Math.max(40, startWidth + delta);

			self.header.items[index].widget.setWidth(newWidth);
			self.rows.forEach(r => r.setColumnWidth(index, newWidth));

			self.options.columns[index].width = newWidth;
		}

		function onUp() {
			self._isResizing = false;

			var realWidth = self.header.items[index].wrapper.outerWidth();
			self.options.columns[index].width = realWidth;

			self.header.items[index].widget.setWidth(realWidth);
			self.rows.forEach(r => r.setColumnWidth(index, realWidth));
			self.rows.forEach(r => r._reflow && r._reflow());

			$(document).off("mousemove", onMove);
			$(document).off("mouseup", onUp);
		}

		$(document).on("mousemove", onMove);
		$(document).on("mouseup", onUp);
	},

	// ---------------------------------------------------------
	// HEADER DRAG-REORDER
	// ---------------------------------------------------------
	_onHeaderDragStart: function(index) {
		if (!this.options.reorderable) return;
		if (this._isResizing) return;
		this._dragSrcIndex = index;
		this._dragTargetIndex = null;
	},

	_onHeaderDragEnter: function(index) {
		if (!this.options.reorderable) return;
		if (this._isResizing) return;
		this._dragTargetIndex = index;
	},

	_onHeaderDrop: function() {
		if (!this.options.reorderable) return;
		if (this._isResizing) return;

		var src = this._dragSrcIndex;
		var dst = this._dragTargetIndex;

		if (src == null || dst == null || src === dst) return;

		var cols = this.options.columns;
		var moved = cols[src];
		cols.splice(src, 1);
		cols.splice(dst, 0, moved);

		this.header.refresh();
		this._renderRows();
		this.rows.forEach(r => r._reflow && r._reflow());

		this._dragSrcIndex = null;
		this._dragTargetIndex = null;
	},

	// ---------------------------------------------------------
	// KEYBOARD NAVIGATION
	// ---------------------------------------------------------
	_bindKeyboardNavigation: function() {
		var self = this;

		this.el.attr("tabindex", 0);

		this.el.on("keydown", function(e) {
			if (!self.options.selectable) return;

			var key = e.key;

			if (key !== "ArrowDown" && key !== "ArrowUp") return;

			e.preventDefault();

			var selectedIndex = self._getSelectedRowIndex();

			if (selectedIndex === -1) {
				if (self.rows.length > 0) {
					self._selectRowByIndex(0);
				}
				return;
			}

			if (key === "ArrowDown" && selectedIndex < self.rows.length - 1) {
				self._selectRowByIndex(selectedIndex + 1);
			}

			if (key === "ArrowUp" && selectedIndex > 0) {
				self._selectRowByIndex(selectedIndex - 1);
			}
		});
	},

	_getSelectedRowIndex: function() {
		if (!this.rows) return -1;
		for (var i = 0; i < this.rows.length; i++) {
			if (this.rows[i].el.hasClass("selected")) {
				return i;
			}
		}
		return -1;
	},

	_selectRowByIndex: function(index) {
		var row = this.rows[index];
		if (!row) return;

		if (this.options.selectionMode === "single") {
			this._deselectAllExcept(row);
		}

		row.select();
		if (row.el && row.el[0] && row.el[0].scrollIntoView) {
			row.el[0].scrollIntoView({ block: "nearest", behavior: "smooth" });
		}
	},

	_deselectAllExcept: function(row) {
		this.rows.forEach(r => {
			if (r !== row) r.deselect();
		});
	},

	// ---------------------------------------------------------
	// PUBLIC API
	// ---------------------------------------------------------
	refresh: function() {
		this.header.refresh();
		this._renderRows();
	},

	setDataSource: function(ds) {
		this.options.dataSource = ds;
		this._loadDataSource();
	},

	// zpětná kompatibilita
	setData: function(data) {
		this.options.dataSource = {
			type: "local",
			data: data
		};
		this._loadDataSource();
	},

	destroy: function() {
		if (this.rows) {
			this.rows.forEach(r => r.destroy && r.destroy());
		}
		if (this.header && this.header.destroy) {
			this.header.destroy();
		}
		this.el.empty();
		this.el.removeData(this._widgetName);
	}
});

$.qpDefine("qpDataGrid", qpDataGrid);

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

/**
 * qpDataGridHeaderCell
 */
var qpDataGridHeaderCell = qpWidget.extend({

    _widgetName: "qpDataGridHeaderCell",

    defaults: {
        column: null,
        grid: null,
        index: 0
    },

    _create: function() {
        var col = this.options.column;

        // wrapper – jeden cell
        this.wrapper = $("<div class='qp-dg-header-cell'></div>")
            .appendTo(this.el);

        // text
        this.title = $("<div class='qp-dg-header-title'></div>")
            .text(col.title || "")
            .appendTo(this.wrapper);

        // sort ikona
        this.sortIcon = $("<div class='qp-dg-sort-icon'></div>")
            .appendTo(this.wrapper);

        // zarovnání
        if (col.align === "right") {
            this.title.css("text-align", "right");
        } else if (col.align === "center") {
            this.title.css("text-align", "center");
        } else {
            this.title.css("text-align", "left");
        }

        // počáteční šířka z definice
        if (col.width) {
            this.setWidth(col.width);
        }

        // sortable flag (použijeme v _bind)
        if (col.sortable !== false && col.field) {
            this.wrapper.addClass("sortable");
        }

        this.updateSortIcon();
    },
	/*
	_bind: function() {
	    var self = this;
	    var ns = "." + this._widgetName;
	    var col = this.options.column;
	    var grid = this.options.grid;

	    if (!grid || !col || col.sortable === false || !col.field) return;

	    this.wrapper.on("click" + ns, function(e) {
	        e.preventDefault();
	        e.stopPropagation();

	        grid._setSort(col.field);   // 🔥 TADY SE SPOUŠTÍ AJAX SORT
	    });
	},
	*/
    _bind: function() {
        var self = this;
        var ns = "." + this._widgetName;
        var col = this.options.column;
        var grid = this.options.grid;

        if (!grid || !col || col.sortable === false || !col.field) return;

        this.wrapper.on("click" + ns, function(e) {
            e.preventDefault();
            e.stopPropagation();

            grid._setSort(col.field, e.shiftKey);   // 🔥 SHIFT MULTI-SORT
        });
    },

    // ---------------------------------------
    // SORT ICON UPDATE
    // ---------------------------------------
	/*
    updateSortIcon: function() {
        var grid = this.options.grid;
        var col = this.options.column;

        if (!grid || !grid._state || !grid._state.sort) {
            this.sortIcon.removeClass("asc desc").hide();
            return;
        }

        var sort = grid._state.sort;

        if (sort.field !== col.field || !sort.dir) {
            this.sortIcon.removeClass("asc desc").hide();
            return;
        }

        this.sortIcon.show();

        if (sort.dir === "asc") {
            this.sortIcon.removeClass("desc").addClass("asc");
        } else {
            this.sortIcon.removeClass("asc").addClass("desc");
        }
    },
	*/
	updateSortIcon: function() {
	    var grid = this.options.grid;
	    var col = this.options.column;

	    var sorts = grid._state.sort;
	    var index = sorts.findIndex(s => s.field === col.field);

	    if (index === -1) {
	        this.sortIcon.removeClass("asc desc").hide();
	        this.wrapper.removeClass("multi-sort");
	        return;
	    }

	    var sort = sorts[index];

	    this.sortIcon.show();
	    this.wrapper.addClass("multi-sort");

	    if (sort.dir === "asc") {
	        this.sortIcon.removeClass("desc").addClass("asc");
	    } else {
	        this.sortIcon.removeClass("asc").addClass("desc");
	    }

	    // pořadí sortu (1,2,3…)
	    this.sortIcon.attr("data-order", index + 1);
	},
	
    // ---------------------------------------
    // WIDTH HANDLING
    // ---------------------------------------
    setWidth: function(w) {
        if (typeof w === "number") w = w + "px";
        this.wrapper.css("width", w);
    },

    destroy: function() {
        var ns = "." + this._widgetName;
        if (this.wrapper) {
            this.wrapper.off(ns);
        }
        this.el.empty();
        this.el.removeData(this._widgetName);
    }
});

$.qpDefine("qpDataGridHeaderCell", qpDataGridHeaderCell);

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
