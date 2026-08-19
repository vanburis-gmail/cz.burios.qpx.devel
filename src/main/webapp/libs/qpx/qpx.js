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
		SubClass.mixin = Class.mixin;
		
		return SubClass;
	};

	// Přimíchání dalších vlastností do prototypu (obdoba Java interface / traits).
	// Používá se např. pro vložení QPX.EventsMixin (on/off/trigger) do QPX.Widget.
	Class.mixin = function() {
		var mixins = Array.prototype.slice.call(arguments);
		for (var i = 0; i < mixins.length; i++) {
			var mixin = mixins[i];
			for (var name in mixin) {
				if (name !== "constructor") {
					this.prototype[name] = mixin[name];
				}
			}
		}
		return this;
	};

	global.Class = Class;
})(window);

// ================================
// Globální konfigurace frameworku
// ================================
var qpConfig = {
	debug: false
};

// ================================
// Jmenný prostor knihovny QPX
// ================================
(function(global) {
	var QPX = global.QPX || (global.QPX = {});
	QPX.version = "0.2.0";
	QPX.Class = Class;     // stejná třída je dostupná jak globálně jako Class, tak jako QPX.Class
	QPX.config = qpConfig; // totéž pro globální konfiguraci
	global.QPX = QPX;
})(window);
/*!
 * QPX - qpUtils
 * Pomocné utility a jednoduchý events mixin (pub/sub) sdílené napříč
 * celým frameworkem QPX.
 */
(function (QPX, $) {
    "use strict";

    if (!$) {
        throw new Error("QPX vyžaduje jQuery načtené před sebou.");
    }
    QPX.$ = $;

    QPX.extend = function (target) {
        var args = Array.prototype.slice.call(arguments, 1);
        for (var i = 0; i < args.length; i++) {
            var src = args[i];
            if (!src) { continue; }
            for (var k in src) { target[k] = src[k]; }
        }
        return target;
    };

    QPX.isString = function (v) { return typeof v === "string"; };
    QPX.isFunction = function (v) { return typeof v === "function"; };
    QPX.isObject = function (v) { return v !== null && typeof v === "object" && !Array.isArray(v); };

    QPX.uid = (function () {
        var counter = 0;
        return function (prefix) {
            counter += 1;
            return (prefix || "qpx") + counter;
        };
    })();

    QPX.toPx = function (v) {
        return (typeof v === "number") ? v + "px" : v;
    };

    // čtení hodnoty z objektu podle cesty "a.b.c"
    QPX.resolve = function (obj, path) {
        if (obj == null || !path) { return undefined; }
        var parts = String(path).split(".");
        var cur = obj;
        for (var i = 0; i < parts.length; i++) {
            if (cur == null) { return undefined; }
            cur = cur[parts[i]];
        }
        return cur;
    };

    // =================================================================
    // Jednoduchý pub/sub mixin — přimíchává se do QPX.Widget přes Class.mixin
    // =================================================================
    QPX.EventsMixin = {
        on: function (event, handler) {
            this._handlers = this._handlers || {};
            (this._handlers[event] = this._handlers[event] || []).push(handler);
            return this;
        },
        off: function (event, handler) {
            if (!this._handlers || !this._handlers[event]) { return this; }
            if (!handler) {
                this._handlers[event] = [];
                return this;
            }
            this._handlers[event] = this._handlers[event].filter(function (h) {
                return h !== handler;
            });
            return this;
        },
        trigger: function (event) {
            var args = Array.prototype.slice.call(arguments, 1);
            if (this._handlers && this._handlers[event]) {
                this._handlers[event].slice().forEach(function (h) {
                    h.apply(this, args);
                }, this);
            }
            // zrcadlení jako jQuery event na kontejneru, aby šlo napojit i $(el).on(...)
            if (this.$container) {
                this.$container.trigger("qpx:" + event, args);
            }
            return this;
        }
    };

})(window.QPX, window.jQuery);
/*!
 * QPX - qpWidget
 * Základní bázová třída pro všechny UI komponenty + registr a tovární
 * metoda QPX.ui(config, container), přes kterou se skládají komponenty
 * do JSON stromu (podobně jako ve webixu).
 */
(function (QPX, $) {
    "use strict";

    var registry = {};

    var Widget = QPX.Class.extend({

        // výchozí konfigurace, potomci ji přes extend rozšiřují
        defaults: {},

        // config    - konfigurační objekt komponenty
        // container - (volitelně) DOM element / jQuery výběr, do kterého se komponenta vykreslí.
        //             Pokud není zadán, vytvoří se plovoucí <div>, který je možné později připojit.
        init: function (config, container) {
            this.config = $.extend(true, {}, this.defaults, config || {});
            this.id = this.config.id || QPX.uid("qpx");
            this._children = [];
            this._handlers = {};

            var node = container && (container.jquery ? container[0] : container);
            this.$container = node ? $(node) : $("<div></div>");

            this.$container
                .addClass("qpx-view")
                .attr("data-qpx-id", this.id)
                .data("qpx-widget", this);

            if (this.config.css) { this.$container.addClass(this.config.css); }
            if (this.config.width !== undefined) { this.$container.css("width", QPX.toPx(this.config.width)); }
            if (this.config.height !== undefined) { this.$container.css("height", QPX.toPx(this.config.height)); }
            if (this.config.hidden) { this.$container.hide(); }

            this.render();

            if (this.config.on) {
                for (var ev in this.config.on) {
                    this.on(ev, this.config.on[ev]);
                }
            }

            this.trigger("ready");
        },

        // potomci přepisují — zde probíhá samotné vykreslení do this.$container
        render: function () {},

        // znovu-vykreslení (výchozí implementace jen zavolá render, konkrétní
        // komponenty typicky přepíší efektivnější variantou)
        refresh: function () {
            this.$container.empty();
            this.render();
            return this;
        },

        show: function () { this.$container.show(); this.trigger("show"); return this; },
        hide: function () { this.$container.hide(); this.trigger("hide"); return this; },

        destroy: function () {
            this.trigger("destroy");
            this._children.forEach(function (child) {
                if (child && child.destroy) { child.destroy(); }
            });
            this._children = [];
            if (this.$container) {
                this.$container.removeData("qpx-widget").empty();
            }
        },

        getContainer: function () { return this.$container; },
        getNode: function () { return this.$container[0]; },

        addChild: function (widget) {
            this._children.push(widget);
            return widget;
        },

        getChildren: function () { return this._children.slice(); }
    });

    Widget.mixin(QPX.EventsMixin);

    QPX.Widget = Widget;

    // =================================================================
    // Registr komponent + tovární metoda
    // =================================================================

    // registrace nové komponenty pod jménem použitým v "view"
    QPX.registerWidget = function (name, WidgetClass) {
        registry[name] = WidgetClass;
        return QPX;
    };

    QPX.getWidgetClass = function (name) {
        return registry[name];
    };

    // hlavní tovární metoda — sestavování z JSON konfigurace:
    //   QPX.ui({ view: "template", template: "Ahoj #name#" }, "#mistoVDom");
    QPX.ui = function (config, container) {
        if (QPX.isString(config)) {
            config = { view: config };
        }
        var view = config.view || (config.rows || config.cols ? "layout" : null);
        if (!view) {
            throw new Error("QPX: konfigurace komponenty musí obsahovat 'view' (nebo 'rows'/'cols').");
        }
        var WidgetClass = registry[view];
        if (!WidgetClass) {
            throw new Error("QPX: neregistrovaný typ komponenty '" + view + "'.");
        }
        return new WidgetClass(config, container);
    };

})(window.QPX, jQuery);
/*!
 * QPX - qpLayout
 * Responzivní layout komponenta umožňující libovolně vnořovat "rows" a "cols",
 * podobně jako ve webixu. Interně staví na flexboxu.
 */
(function (QPX, $) {
    "use strict";

    var Layout = QPX.Widget.extend({

        defaults: {
            type: "clean",     // clean | space (mezery mezi buňkami) | line (oddělovací čáry)
            responsive: false, // na úzké obrazovce přepne "cols" na "rows"
            gap: null
        },

        render: function () {
            var cfg = this.config;
            this.$container.addClass("qpx-layout");

            if (cfg.type === "space") { this.$container.addClass("qpx-layout-space"); }
            if (cfg.type === "line") { this.$container.addClass("qpx-layout-line"); }
            if (cfg.gap !== null && cfg.gap !== undefined) { this.$container.css("gap", QPX.toPx(cfg.gap)); }

            if (cfg.rows) {
                this.$container.addClass("qpx-rows");
                this._renderStack(cfg.rows, "row");
            } else if (cfg.cols) {
                this.$container.addClass("qpx-cols");
                if (cfg.responsive) { this.$container.addClass("qpx-responsive"); }
                this._renderStack(cfg.cols, "col");
            }
            // layout bez rows/cols slouží jako prostý kontejner (leaf cell)
        },

        _renderStack: function (items, direction) {
            var self = this;
            items.forEach(function (itemCfg) {
                if (itemCfg === undefined || itemCfg === null) { return; }

                var isSpacer = QPX.isObject(itemCfg) &&
                    !itemCfg.view && !itemCfg.rows && !itemCfg.cols;

                var $cell = $("<div class='qpx-cell qpx-" + direction + "'></div>");
                self._applySizing($cell, itemCfg);
                self.$container.append($cell);

                if (isSpacer) {
                    $cell.addClass("qpx-spacer");
                    return; // prázdná buňka = flexibilní mezera
                }

                var child = QPX.ui(itemCfg, $cell);
                self.addChild(child);
            });
        },

        _applySizing: function ($cell, itemCfg) {
            if (!itemCfg || !QPX.isObject(itemCfg)) { return; }
            if (itemCfg.width !== undefined) {
                $cell.css({ "flex": "0 0 auto", "width": QPX.toPx(itemCfg.width) });
            }
            if (itemCfg.height !== undefined) {
                $cell.css({ "flex": "0 0 auto", "height": QPX.toPx(itemCfg.height) });
            }
            if (itemCfg.gravity !== undefined) {
                $cell.css("flex-grow", itemCfg.gravity);
            }
            if (itemCfg.hidden) { $cell.hide(); }
        }
    });

    QPX.registerWidget("layout", Layout);
    QPX.Layout = Layout;

})(window.QPX, jQuery);
/*!
 * QPX - qpTemplate
 * Komponenta vykreslující HTML podle šablony (string, nebo funkce) a dat,
 * která lze kdykoliv změnit přes setValues()/parse() — koncepčně stejné
 * jako "template" ve webixu.
 *
 * Podpora zápisu proměnných v šabloně: "#jmeno#" i "{jmeno}", včetně
 * vnořených cest "{user.name}".
 */
(function (QPX, $) {
    "use strict";

    var VAR_RE = /#([\w.]+)#|\{([\w.]+)\}/g;

    var Template = QPX.Widget.extend({

        defaults: {
            template: "",   // string šablona, nebo function(data, common){ return html; }
            data: null,     // počáteční data
            autoheight: false,
            borderless: false
        },

        render: function () {
            var cfg = this.config;
            this.$container.addClass("qpx-template");
            if (cfg.autoheight) { this.$container.addClass("qpx-template-autoheight"); }
            if (cfg.borderless) { this.$container.addClass("qpx-borderless"); }

            this._templateFn = this._compile(cfg.template);
            this.data = cfg.data || null;

            this._draw();
        },

        // umožňuje za běhu měnit šablonu i další nastavení, podobně jako
        // webix .define()
        define: function (prop, value) {
            if (QPX.isObject(prop)) {
                $.extend(this.config, prop);
                if (prop.template !== undefined) { this._templateFn = this._compile(prop.template); }
            } else {
                this.config[prop] = value;
                if (prop === "template") { this._templateFn = this._compile(value); }
            }
            this._draw();
            return this;
        },

        // nastaví novou šablonu (zkratka za define("template", tpl))
        setTemplate: function (tpl) {
            return this.define("template", tpl);
        },

        // naplní komponentu daty a překreslí ji — hlavní API pro práci s daty
        setValues: function (data, silent) {
            this.data = data;
            this._draw();
            if (!silent) { this.trigger("change", data); }
            return this;
        },

        getValues: function () {
            return this.data;
        },

        // alias, stejně jako webix .parse()
        parse: function (data) {
            return this.setValues(data);
        },

        // přímé vložení hotového HTML bez průchodu šablonou
        setHTML: function (html) {
            this.$container.html(html);
            this.trigger("afterrender");
            return this;
        },

        refresh: function () {
            this._draw();
            return this;
        },

        _draw: function () {
            var html = this._templateFn ? this._templateFn(this.data || {}, QPX) : "";
            this.$container.html(html);
            this.trigger("afterrender");
        },

        _compile: function (tpl) {
            if (QPX.isFunction(tpl)) { return tpl; }
            var str = (tpl === null || tpl === undefined) ? "" : String(tpl);
            return function (data) {
                data = data || {};
                return str.replace(VAR_RE, function (match, a, b) {
                    var path = a || b;
                    var val = QPX.resolve(data, path);
                    return (val === undefined || val === null) ? "" : val;
                });
            };
        }
    });

    QPX.registerWidget("template", Template);
    QPX.Template = Template;

})(window.QPX, jQuery);
/*!
 * QPX - qpButton
 * Tlačítko se stejnou koncepcí jako DevExtreme dxButton:
 *  - options: text, icon, type, stylingMode, disabled, visible, hint, template
 *  - metody: option(), enable(), disable(), focus()
 *  - události: onClick, onOptionChanged
 */
(function (QPX, $) {
    "use strict";

    var Button = QPX.Widget.extend({

        defaults: {
            text: "",
            icon: "",              // krátký text/emoji glyph, nebo "css:trida-ikony"
            type: "normal",        // normal | default | success | danger | warning
            stylingMode: "contained", // contained | outlined | text
            disabled: false,
            visible: true,
            hint: "",
            template: null,        // function(data, $el) pro vlastní vykreslení obsahu
            onClick: null,
            onOptionChanged: null
        },

        render: function () {
            var cfg = this.config;
            this.$container
                .addClass("qpx-button")
                .attr("tabindex", cfg.disabled ? "-1" : "0")
                .attr("role", "button");

            if (cfg.onClick) { this.on("click", cfg.onClick); }
            if (cfg.onOptionChanged) { this.on("optionChanged", cfg.onOptionChanged); }

            this._renderContent();
            this._applyState();

            var self = this;
            this.$container.on("click.qpxButton", function (e) {
                if (self.config.disabled) { return; }
                self.trigger("click", { event: e, component: self, element: self.getNode() });
            });
            this.$container.on("keydown.qpxButton", function (e) {
                if (self.config.disabled) { return; }
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    self.$container.trigger("click");
                }
            });
        },

        _renderContent: function () {
            var cfg = this.config;
            this.$container.empty();

            if (QPX.isFunction(cfg.template)) {
                cfg.template(cfg, this.$container);
                return;
            }

            if (cfg.icon) {
                var $icon = $("<span class='qpx-icon'></span>");
                if (String(cfg.icon).indexOf("css:") === 0) {
                    $icon.addClass(String(cfg.icon).slice(4));
                } else {
                    $icon.text(cfg.icon);
                }
                this.$container.append($icon);
            }
            if (cfg.text) {
                this.$container.append($("<span class='qpx-button-text'></span>").text(cfg.text));
            }
            if (cfg.hint) { this.$container.attr("title", cfg.hint); }
        },

        _applyState: function () {
            var cfg = this.config;
            this.$container
                .removeClass("qpx-button-normal qpx-button-default qpx-button-success qpx-button-danger qpx-button-warning")
                .addClass("qpx-button-" + cfg.type)
                .removeClass("qpx-button-mode-contained qpx-button-mode-outlined qpx-button-mode-text")
                .addClass("qpx-button-mode-" + cfg.stylingMode)
                .toggleClass("qpx-state-disabled", !!cfg.disabled)
                .toggleClass("qpx-hidden", !cfg.visible)
                .attr("aria-disabled", !!cfg.disabled)
                .attr("tabindex", cfg.disabled ? "-1" : "0");
        },

        // option("text") -> čtení; option("text","Nový text") -> zápis; option({text:.., icon:..}) -> hromadně
        option: function (name, value) {
            if (arguments.length === 0) { return this.config; }
            if (QPX.isObject(name)) {
                var self = this;
                $.each(name, function (k, v) { self.option(k, v); });
                return this;
            }
            if (arguments.length === 1) { return this.config[name]; }

            var prev = this.config[name];
            if (prev === value) { return this; }
            this.config[name] = value;
            this._renderContent();
            this._applyState();
            this.trigger("optionChanged", { name: name, value: value, previousValue: prev, element: this.getNode() });
            return this;
        },

        enable: function () { return this.option("disabled", false); },
        disable: function () { return this.option("disabled", true); },
        focus: function () { this.$container.trigger("focus"); return this; },

        destroy: function () {
            this.$container.off(".qpxButton");
            this._super();
        }
    });

    QPX.registerWidget("button", Button);
    QPX.Button = Button;

})(window.QPX, jQuery);
/*!
 * QPX - qpButtonGroup
 * Skupina vizuálně spojených tlačítek, koncepčně jako DevExtreme dxButtonGroup.
 *  - options: items, keyExpr, selectionMode, selectedItemKeys, stylingMode
 *  - události: onItemClick, onSelectionChanged, onOptionChanged
 */
(function (QPX, $) {
    "use strict";

    var ButtonGroup = QPX.Widget.extend({

        defaults: {
            items: [],               // [{ text, icon, disabled, key, hint }]
            keyExpr: "key",
            selectionMode: "single", // single | multiple | none
            selectedItemKeys: [],
            stylingMode: "outlined", // contained | outlined | text
            disabled: false,
            visible: true,
            onItemClick: null,
            onSelectionChanged: null,
            onOptionChanged: null
        },

        render: function () {
            var cfg = this.config;
            this.$container
                .addClass("qpx-buttongroup")
                .toggleClass("qpx-hidden", !cfg.visible);

            if (cfg.onItemClick) { this.on("itemClick", cfg.onItemClick); }
            if (cfg.onSelectionChanged) { this.on("selectionChanged", cfg.onSelectionChanged); }
            if (cfg.onOptionChanged) { this.on("optionChanged", cfg.onOptionChanged); }

            this.selectedItemKeys = (cfg.selectedItemKeys || []).slice();
            this._renderItems();
        },

        _keyOf: function (item, index) {
            return item[this.config.keyExpr] !== undefined ? item[this.config.keyExpr] : index;
        },

        _renderItems: function () {
            var self = this;
            var cfg = this.config;
            this.$container.empty();

            cfg.items.forEach(function (item, index) {
                var key = self._keyOf(item, index);
                var selected = self.selectedItemKeys.indexOf(key) !== -1;

                var $btn = $("<div class='qpx-buttongroup-item qpx-button qpx-button-mode-" + cfg.stylingMode + "'></div>")
                    .toggleClass("qpx-state-selected", selected)
                    .toggleClass("qpx-state-disabled", !!item.disabled || !!cfg.disabled)
                    .attr("tabindex", (item.disabled || cfg.disabled) ? "-1" : "0")
                    .attr("role", "button");

                if (item.icon) {
                    var $icon = $("<span class='qpx-icon'></span>");
                    (String(item.icon).indexOf("css:") === 0)
                        ? $icon.addClass(String(item.icon).slice(4))
                        : $icon.text(item.icon);
                    $btn.append($icon);
                }
                if (item.text) {
                    $btn.append($("<span class='qpx-button-text'></span>").text(item.text));
                }
                if (item.hint) { $btn.attr("title", item.hint); }

                $btn.on("click", function (e) {
                    if (item.disabled || self.config.disabled) { return; }
                    self._handleSelection(key);
                    self.trigger("itemClick", { event: e, itemData: item, itemIndex: index, itemElement: $btn[0], component: self });
                });

                self.$container.append($btn);
            });
        },

        _handleSelection: function (key) {
            var mode = this.config.selectionMode;
            if (mode === "none") { return; }

            var prev = this.selectedItemKeys.slice();
            if (mode === "single") {
                this.selectedItemKeys = [key];
            } else { // multiple
                var idx = this.selectedItemKeys.indexOf(key);
                if (idx === -1) { this.selectedItemKeys.push(key); }
                else { this.selectedItemKeys.splice(idx, 1); }
            }
            this.config.selectedItemKeys = this.selectedItemKeys;
            this._renderItems();
            this.trigger("selectionChanged", {
                addedItemKeys: this.selectedItemKeys.filter(function (k) { return prev.indexOf(k) === -1; }),
                removedItemKeys: prev.filter(function (k) { return this.selectedItemKeys.indexOf(k) === -1; }.bind(this)),
                component: this
            });
        },

        option: function (name, value) {
            if (arguments.length === 0) { return this.config; }
            if (QPX.isObject(name)) {
                var self = this;
                $.each(name, function (k, v) { self.option(k, v); });
                return this;
            }
            if (arguments.length === 1) { return this.config[name]; }

            var prev = this.config[name];
            if (prev === value) { return this; }
            this.config[name] = value;
            if (name === "selectedItemKeys") { this.selectedItemKeys = (value || []).slice(); }
            this._renderItems();
            this.trigger("optionChanged", { name: name, value: value, previousValue: prev });
            return this;
        },

        getSelectedItemKeys: function () { return this.selectedItemKeys.slice(); },
        enable: function () { return this.option("disabled", false); },
        disable: function () { return this.option("disabled", true); }
    });

    QPX.registerWidget("buttonGroup", ButtonGroup);
    QPX.ButtonGroup = ButtonGroup;

})(window.QPX, jQuery);
/*!
 * QPX - qpDropDownButton
 * Tlačítko s rozbalovacím seznamem položek, koncepčně jako DevExtreme
 * dxDropDownButton (volitelně "split" tlačítko se samostatnou šipkou).
 *  - options: text, icon, items, keyExpr, displayExpr, splitButton, useSelectMode
 *  - události: onButtonClick, onItemClick, onSelectionChanged, onOptionChanged
 */
(function (QPX, $) {
    "use strict";

    var openInstance = null; // aktuálně otevřená instance (jen jedna najednou)

    var DropDownButton = QPX.Widget.extend({

        defaults: {
            text: "",
            icon: "",
            items: [],              // [{ text, icon, key, disabled }]
            keyExpr: "key",
            displayExpr: "text",
            splitButton: false,     // true = samostatné tlačítko + šipka
            useSelectMode: false,   // true = vybraná položka nahradí text tlačítka
            selectedItemKey: null,
            disabled: false,
            visible: true,
            stylingMode: "contained",
            dropDownOptions: {},    // { width }
            onButtonClick: null,
            onItemClick: null,
            onSelectionChanged: null,
            onOptionChanged: null
        },

        render: function () {
            var cfg = this.config;
            this.$container
                .addClass("qpx-dropdownbutton qpx-button qpx-button-mode-" + cfg.stylingMode)
                .toggleClass("qpx-dropdownbutton-split", !!cfg.splitButton)
                .toggleClass("qpx-hidden", !cfg.visible);

            if (cfg.onButtonClick) { this.on("buttonClick", cfg.onButtonClick); }
            if (cfg.onItemClick) { this.on("itemClick", cfg.onItemClick); }
            if (cfg.onSelectionChanged) { this.on("selectionChanged", cfg.onSelectionChanged); }
            if (cfg.onOptionChanged) { this.on("optionChanged", cfg.onOptionChanged); }

            this._isOpen = false;
            this._buildDom();
            this._bindEvents();
        },

        _keyOf: function (item, index) {
            return item[this.config.keyExpr] !== undefined ? item[this.config.keyExpr] : index;
        },
        _labelOf: function (item) {
            return item[this.config.displayExpr];
        },

        _buildDom: function () {
            var cfg = this.config;
            this.$container.empty().attr("tabindex", cfg.disabled ? "-1" : "0");

            this.$mainPart = $("<span class='qpx-dropdownbutton-main'></span>");
            if (cfg.icon) {
                var $icon = $("<span class='qpx-icon'></span>");
                (String(cfg.icon).indexOf("css:") === 0) ? $icon.addClass(String(cfg.icon).slice(4)) : $icon.text(cfg.icon);
                this.$mainPart.append($icon);
            }
            this.$textEl = $("<span class='qpx-button-text'></span>").text(this._currentText());
            this.$mainPart.append(this.$textEl);

            this.$arrowPart = $("<span class='qpx-dropdownbutton-arrow'>▾</span>");

            this.$container.append(this.$mainPart, this.$arrowPart);

            this.$menu = $("<div class='qpx-popup-list qpx-dropdownbutton-menu'></div>").appendTo(document.body).hide();
            this._renderMenuItems();
        },

        _currentText: function () {
            var cfg = this.config;
            if (cfg.useSelectMode && cfg.selectedItemKey !== null) {
                var self = this;
                var found = cfg.items.filter(function (it, i) { return self._keyOf(it, i) === cfg.selectedItemKey; })[0];
                if (found) { return this._labelOf(found); }
            }
            return cfg.text;
        },

        _renderMenuItems: function () {
            var self = this;
            var cfg = this.config;
            this.$menu.empty();
            if (cfg.dropDownOptions && cfg.dropDownOptions.width) {
                this.$menu.css("width", QPX.toPx(cfg.dropDownOptions.width));
            }

            cfg.items.forEach(function (item, index) {
                var key = self._keyOf(item, index);
                var $row = $("<div class='qpx-popup-list-item'></div>")
                    .toggleClass("qpx-state-disabled", !!item.disabled)
                    .toggleClass("qpx-state-selected", cfg.useSelectMode && cfg.selectedItemKey === key);

                if (item.icon) {
                    var $icon = $("<span class='qpx-icon'></span>");
                    (String(item.icon).indexOf("css:") === 0) ? $icon.addClass(String(item.icon).slice(4)) : $icon.text(item.icon);
                    $row.append($icon);
                }
                $row.append($("<span></span>").text(self._labelOf(item)));

                $row.on("click", function (e) {
                    if (item.disabled) { return; }
                    self._close();
                    if (cfg.useSelectMode) {
                        var prevKey = cfg.selectedItemKey;
                        cfg.selectedItemKey = key;
                        self.$textEl.text(self._currentText());
                        self.trigger("selectionChanged", { item: item, key: key, previousKey: prevKey, component: self });
                    }
                    self.trigger("itemClick", { event: e, itemData: item, itemIndex: index, component: self });
                });

                self.$menu.append($row);
            });
        },

        _bindEvents: function () {
            var self = this;
            var cfg = this.config;

            if (cfg.splitButton) {
                this.$mainPart.on("click.qpxDdb", function (e) {
                    if (self.config.disabled) { return; }
                    self._close();
                    self.trigger("buttonClick", { event: e, component: self, element: self.getNode() });
                });
                this.$arrowPart.on("click.qpxDdb", function (e) {
                    if (self.config.disabled) { return; }
                    e.stopPropagation();
                    self._toggle();
                });
            } else {
                this.$container.on("click.qpxDdb", function (e) {
                    if (self.config.disabled) { return; }
                    self._toggle();
                    self.trigger("buttonClick", { event: e, component: self, element: self.getNode() });
                });
            }

            $(document).on("mousedown.qpxDdb" + this.id, function (e) {
                if (!self._isOpen) { return; }
                if ($(e.target).closest(self.$menu).length || $(e.target).closest(self.$container).length) { return; }
                self._close();
            });
        },

        _toggle: function () { this._isOpen ? this._close() : this._open(); },

        _open: function () {
            if (openInstance && openInstance !== this) { openInstance._close(); }
            var off = this.$container.offset();
            this.$menu.css({
                top: off.top + this.$container.outerHeight(),
                left: off.left,
                minWidth: this.$container.outerWidth()
            }).show();
            this._isOpen = true;
            openInstance = this;
            this.trigger("opened", { component: this });
        },

        _close: function () {
            if (!this._isOpen) { return; }
            this.$menu.hide();
            this._isOpen = false;
            if (openInstance === this) { openInstance = null; }
            this.trigger("closed", { component: this });
        },

        option: function (name, value) {
            if (arguments.length === 0) { return this.config; }
            if (QPX.isObject(name)) {
                var self = this;
                $.each(name, function (k, v) { self.option(k, v); });
                return this;
            }
            if (arguments.length === 1) { return this.config[name]; }

            var prev = this.config[name];
            if (prev === value) { return this; }
            this.config[name] = value;
            this._buildDom();
            this._bindEvents();
            this.trigger("optionChanged", { name: name, value: value, previousValue: prev });
            return this;
        },

        enable: function () { return this.option("disabled", false); },
        disable: function () { return this.option("disabled", true); },

        destroy: function () {
            this.$container.off(".qpxDdb");
            $(document).off(".qpxDdb" + this.id);
            if (this.$menu) { this.$menu.remove(); }
            if (openInstance === this) { openInstance = null; }
            this._super();
        }
    });

    QPX.registerWidget("dropDownButton", DropDownButton);
    QPX.DropDownButton = DropDownButton;

})(window.QPX, jQuery);
/*!
 * QPX - qpToolBar
 * Panel nástrojů koncipovaný stejně jako DevExtreme dxToolBar:
 *  - items rozdělené do "before" / "center" / "after"
 *  - každá položka je samostatný widget: button | buttonGroup | dropDownButton | template
 *  - responzivní chování: položky, které se nevejdou do šířky panelu,
 *    se automaticky přesunou do přetečeného menu (ikona "⋮" vpravo),
 *    podobně jako u panelu nástrojů v Google Chrome DevTools.
 *
 * Konfigurace položky (item):
 *   {
 *     location: "before" | "center" | "after",   // výchozí "before"
 *     widget:   "button" | "buttonGroup" | "dropDownButton" | "template",
 *     locateInMenu: "auto" | "always" | "never",  // výchozí "auto"
 *     visible: true,
 *     cssClass: "",
 *     options: { ...konfigurace vnitřního widgetu, vč. onClick/onItemClick apod. }
 *   }
 *
 * Události toolbaru: onItemClick (agregovaně za všechny typy položek),
 * onOptionChanged.
 */
(function (QPX, $) {
    "use strict";

    var Toolbar = QPX.Widget.extend({

        defaults: {
            items: [],
            visible: true,
            disabled: false,
            theme: "generic-light",  // generic-light | generic-dark
            overflowMenuIcon: "⋮",
            onItemClick: null,
            onOptionChanged: null
        },

        render: function () {
            var cfg = this.config;
            var self = this;

            this.$container
                .addClass("qpx-toolbar")
                .addClass("qpx-theme-" + cfg.theme)
                .toggleClass("qpx-hidden", !cfg.visible)
                .toggleClass("qpx-state-disabled", !!cfg.disabled);

            if (cfg.onItemClick) { this.on("itemClick", cfg.onItemClick); }
            if (cfg.onOptionChanged) { this.on("optionChanged", cfg.onOptionChanged); }

            this.$content = $("<div class='qpx-toolbar-content'></div>");
            this.$before = $("<div class='qpx-toolbar-section qpx-toolbar-before'></div>");
            this.$center = $("<div class='qpx-toolbar-section qpx-toolbar-center'></div>");
            this.$after = $("<div class='qpx-toolbar-section qpx-toolbar-after'></div>");
            this.$content.append(this.$before, this.$center, this.$after);

            this.$overflowBtn = $("<div class='qpx-toolbar-overflow-btn' tabindex='0' role='button' title='Další položky'></div>")
                .text(cfg.overflowMenuIcon)
                .hide();

            this.$container.append(this.$content, this.$overflowBtn);

            this.$menu = $("<div class='qpx-toolbar-menu qpx-popup-list'></div>").appendTo(document.body).hide();

            this._itemRefs = [];
            this._menuRefs = [];
            this._isMenuOpen = false;

            this._buildItems();
            this._bindOverflowMenu();
            this._bindResize();

            // první rozložení až po zavěšení do DOM (kvůli měření šířky)
            var self2 = this;
            setTimeout(function () { self2._doRelayout(); }, 0);
        },

        _buildItems: function () {
            var self = this;
            this.config.items.forEach(function (itemCfg, index) {
                self._itemRefs.push(self._createItemRef(itemCfg, index));
            });
        },

        _createItemRef: function (itemCfg, index) {
            var self = this;
            itemCfg.location = itemCfg.location || "before";
            itemCfg.locateInMenu = itemCfg.locateInMenu || "auto";

            var widgetName = itemCfg.widget || (itemCfg.template !== undefined ? "template" : "button");
            var options = $.extend({}, itemCfg.options);
            if (itemCfg.template !== undefined && options.template === undefined) { options.template = itemCfg.template; }
            if (itemCfg.data !== undefined && options.data === undefined) { options.data = itemCfg.data; }
            options.view = widgetName;

            var $cell = $("<div class='qpx-toolbar-item'></div>");
            if (itemCfg.cssClass) { $cell.addClass(itemCfg.cssClass); }
            if (itemCfg.visible === false) { $cell.hide(); }

            var widget = QPX.ui(options, $cell);

            var ref = {
                config: itemCfg,
                order: index,
                location: itemCfg.location,
                $cell: $cell,
                widget: widget,
                inMenu: false
            };

            // agregace klikacích událostí jednotlivých typů widgetů do toolbar.onItemClick
            ["click", "itemClick"].forEach(function (evName) {
                if (widget.on) {
                    widget.on(evName, function (e) {
                        self.trigger("itemClick", $.extend({
                            itemData: itemCfg,
                            itemIndex: index,
                            itemElement: $cell[0],
                            component: self
                        }, e || {}));
                    });
                }
            });

            return ref;
        },

        // -------------------------------------------------------------
        // Responzivní rozložení: přesun přetékajících položek do menu
        // -------------------------------------------------------------
        _bindResize: function () {
            var self = this;
            this._onWinResize = function () { self._scheduleRelayout(); };

            if (window.ResizeObserver) {
                this._resizeObserver = new ResizeObserver(function () { self._scheduleRelayout(); });
                this._resizeObserver.observe(this.getNode());
            } else {
                $(window).on("resize.qpxToolbar" + this.id, this._onWinResize);
            }
        },

        _scheduleRelayout: function () {
            var self = this;
            if (this._layoutRaf) { return; }
            this._layoutRaf = (window.requestAnimationFrame || window.setTimeout)(function () {
                self._layoutRaf = null;
                self._doRelayout();
            });
        },

        _doRelayout: function () {
            var self = this;
            if (!this.$content || !this.$content.length) { return; }

            this._menuRefs = [];
            this._itemRefs.forEach(function (ref) {
                ref.inMenu = (ref.config.locateInMenu === "always" && ref.config.visible !== false);
                if (ref.inMenu) { self._menuRefs.push(ref); }
            });

            this._applyPositions();

            var candidates = this._itemRefs.filter(function (r) {
                return r.config.visible !== false &&
                    r.config.locateInMenu !== "never" &&
                    r.config.locateInMenu !== "always";
            }).slice().reverse(); // sbírání od posledně vykresleného (napravo) -> jako v Chrome DevTools

            var guard = 0;
            while (candidates.length && this._isOverflowing() && guard < 500) {
                guard += 1;
                var ref = candidates.shift();
                ref.inMenu = true;
                this._menuRefs.push(ref);
                this._applyPositions();
            }

            this.trigger("layoutChanged", { overflowing: this._menuRefs.length > 0 });
        },

        _isOverflowing: function () {
            var el = this.$content[0];
            return el.scrollWidth - 1 > el.clientWidth;
        },

        _applyPositions: function () {
            var self = this;
            this.$before.empty();
            this.$center.empty();
            this.$after.empty();
            this.$menu.empty();

            this._itemRefs.forEach(function (ref) {
                if (ref.config.visible === false) { return; }

                if (ref.inMenu) {
                    ref.$cell.addClass("qpx-in-menu").show();
                    self.$menu.append(ref.$cell);
                    return;
                }

                ref.$cell.removeClass("qpx-in-menu").show();
                var target = ref.location === "center" ? self.$center
                    : (ref.location === "after" ? self.$after : self.$before);
                target.append(ref.$cell);
            });

            this.$overflowBtn.toggle(this._menuRefs.length > 0);
        },

        // -------------------------------------------------------------
        // Popup s přetečenými položkami
        // -------------------------------------------------------------
        _bindOverflowMenu: function () {
            var self = this;
            this.$overflowBtn.on("click.qpxToolbar", function (e) {
                e.stopPropagation();
                self._isMenuOpen ? self._closeMenu() : self._openMenu();
            });
            $(document).on("mousedown.qpxToolbar" + this.id, function (e) {
                if (!self._isMenuOpen) { return; }
                if ($(e.target).closest(self.$menu).length || $(e.target).closest(self.$overflowBtn).length) { return; }
                self._closeMenu();
            });
        },

        _openMenu: function () {
            var off = this.$overflowBtn.offset();
            this.$menu.css({
                top: off.top + this.$overflowBtn.outerHeight(),
                left: Math.max(0, off.left + this.$overflowBtn.outerWidth() - this.$menu.outerWidth())
            }).show();
            this._isMenuOpen = true;
        },

        _closeMenu: function () {
            this.$menu.hide();
            this._isMenuOpen = false;
        },

        // -------------------------------------------------------------
        // Veřejné API
        // -------------------------------------------------------------
        option: function (name, value) {
            if (arguments.length === 0) { return this.config; }
            if (QPX.isObject(name)) {
                var self = this;
                $.each(name, function (k, v) { self.option(k, v); });
                return this;
            }
            if (arguments.length === 1) { return this.config[name]; }

            var prev = this.config[name];
            if (prev === value) { return this; }
            this.config[name] = value;

            if (name === "items") {
                this._itemRefs.forEach(function (ref) { ref.widget.destroy(); ref.$cell.remove(); });
                this._itemRefs = [];
                this._buildItems();
                this._doRelayout();
            } else if (name === "disabled") {
                this.$container.toggleClass("qpx-state-disabled", !!value);
            } else if (name === "visible") {
                this.$container.toggleClass("qpx-hidden", !value);
            } else if (name === "theme") {
                this.$container.removeClass("qpx-theme-" + prev).addClass("qpx-theme-" + value);
            }

            this.trigger("optionChanged", { name: name, value: value, previousValue: prev });
            return this;
        },

        // vrátí instanci vnitřního widgetu podle indexu položky v poli items
        getItemWidget: function (index) {
            var ref = this._itemRefs[index];
            return ref ? ref.widget : undefined;
        },

        repaint: function () { this._doRelayout(); return this; },

        destroy: function () {
            if (this._resizeObserver) { this._resizeObserver.disconnect(); }
            $(window).off(".qpxToolbar" + this.id);
            $(document).off(".qpxToolbar" + this.id);
            this._itemRefs.forEach(function (ref) { if (ref.widget && ref.widget.destroy) { ref.widget.destroy(); } });
            if (this.$menu) { this.$menu.remove(); }
            this._super();
        }
    });

    QPX.registerWidget("qpToolBar", Toolbar);
    QPX.qpToolBar = Toolbar;

})(window.QPX, jQuery);
/*!
 * QPX - qpParser
 * Umožňuje definovat komponenty třemi způsoby:
 *
 *  1) JSON skládání (viz QPX.ui/QPX.Layout):
 *       QPX.ui({ rows: [ {view:"template", template:"Ahoj"} ] }, "#app");
 *
 *  2) Napojení na konkrétní HTML element (jako kendoUI / easyUI):
 *       $("#box").qpx("template", { template: "Ahoj #name#" });
 *       // nebo:
 *       $("#box").qpx({ view: "template", template: "Ahoj" });
 *
 *  3) Deklarativně přes data-qpx-* atributy přímo v HTML (jako metro UI CSS):
 *       <div data-qpx-view="template" data-qpx-template="Ahoj #name#"></div>
 *       QPX.parse(); // proskenuje dokument a vše inicializuje
 */
(function (QPX, $) {
    "use strict";

    // převede "data-qpx-auto-height" -> "autoHeight"
    function toCamelCase(str) {
        return str.replace(/-([a-z0-9])/g, function (_, c) { return c.toUpperCase(); });
    }

    // načte všechny data-qpx-* atributy jednoho elementu do konfiguračního objektu.
    // Hodnoty se pokusí naparsovat jako JSON (čísla, booleany, objekty, pole),
    // pokud to nejde, použije se jako obyčejný string.
    QPX.parseAttrs = function (el) {
        var config = {};
        var attrs = el.attributes;
        for (var i = 0; i < attrs.length; i++) {
            var attr = attrs[i];
            var m = attr.name.match(/^data-qpx-(.+)$/);
            if (!m || m[1] === "id") { continue; }

            var key = toCamelCase(m[1]);
            var raw = attr.value;
            var value;
            try {
                value = JSON.parse(raw);
            } catch (e) {
                value = raw;
            }
            config[key] = value;
        }
        if (el.id) { config.id = config.id || el.id; }
        return config;
    };

    // proskenuje strom (celý dokument, nebo zadaný kořen) a inicializuje
    // všechny dosud neinicializované elementy s atributem data-qpx-view
    QPX.parse = function (root) {
        var $scope = root ? $(root) : $(document);
        var $found = $scope.find("[data-qpx-view]");
        if ($scope.is && $scope.is("[data-qpx-view]")) { $found = $found.add($scope); }

        $found.each(function () {
            if ($(this).data("qpx-widget")) { return; } // už inicializováno
            var cfg = QPX.parseAttrs(this);
            QPX.ui(cfg, this);
        });
        return QPX;
    };

    // vrátí instanci komponenty napojenou na daný element (nebo undefined)
    QPX.$find = function (el) {
        return $(el).data("qpx-widget");
    };

    // -----------------------------------------------------------------
    // jQuery plugin — napojení komponenty přímo na konkrétní element(y)
    // -----------------------------------------------------------------
    $.fn.qpx = function (view, config) {
        var cfg;
        if (QPX.isString(view)) {
            cfg = $.extend({ view: view }, config || {});
        } else {
            cfg = view || {};
        }

        var result = this;
        this.each(function () {
            var widget = QPX.ui(cfg, this);
            $(this).data("qpx-widget", widget);
        });
        return result;
    };

    // po načtení DOM automaticky zpracuje deklarativně zapsané komponenty,
    // pokud si to vývojář výslovně nevypne (QPX.autoParse = false;)
    $(function () {
        if (QPX.autoParse !== false) {
            QPX.parse(document);
        }
    });

})(window.QPX, jQuery);
