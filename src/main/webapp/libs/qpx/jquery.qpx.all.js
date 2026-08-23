/*!
 * qpx - core
 * Vlastní JS UI framework nad jQuery.
 * Modul obsahuje: jmenný prostor qpx, Java-like Class systém s dědičností,
 * pomocné utility a jednoduchý events mixin (pub/sub).
 */
(function (root, $) {
    "use strict";

    if (!$) {
        throw new Error("qpx vyžaduje jQuery načtené před sebou.");
    }

    var qpx = root.qpx = root.qpx || {};
    qpx.version = "0.1.0";
    qpx.$ = $;

    // =================================================================
    // Class systém — inspirováno "Simple JavaScript Inheritance" (J. Resig),
    // rozšířeno o dědičnost statických členů a mixiny, aby se chovalo
    // podobně jako třídy v Javě (extends, super volání, statické metody).
    //
    //   var Animal = qpx.Class.extend({
    //       init: function(name){ this.name = name; },
    //       speak: function(){ return this.name + " vydává zvuk"; }
    //   });
    //
    //   var Dog = Animal.extend({
    //       speak: function(){ return this._super() + " (štěká)"; }
    //   });
    //
    //   new Dog("Rex").speak();
    // =================================================================
    var initializing = false;
    var fnTest = /xyz/.test(function () { /* eslint-disable */ if (0) { xyz; } /* eslint-enable */ })
        ? /\b_super\b/
        : /.*/;

    function Class() {}

    Class.extend = function (protoProps, staticProps) {
        var _super = this.prototype;

        initializing = true;
        var prototype = new this();
        initializing = false;

        for (var name in protoProps) {
            prototype[name] = (typeof protoProps[name] === "function" &&
                typeof _super[name] === "function" &&
                fnTest.test(protoProps[name]))
                ? (function (name, fn) {
                    return function () {
                        var tmp = this._super;
                        this._super = _super[name];
                        var ret;
                        try {
                            ret = fn.apply(this, arguments);
                        } finally {
                            this._super = tmp;
                        }
                        return ret;
                    };
                })(name, protoProps[name])
                : protoProps[name];
        }

        function QpxClass() {
            if (!initializing && this.init) {
                this.init.apply(this, arguments);
            }
        }

        QpxClass.prototype = prototype;
        QpxClass.prototype.constructor = QpxClass;

        // dědičnost statických členů (podobně jako statické atributy/metody v Javě)
        for (var key in this) {
            if (Object.prototype.hasOwnProperty.call(this, key) && key !== "prototype") {
                QpxClass[key] = this[key];
            }
        }
        QpxClass.extend = Class.extend;
        QpxClass.mixin = Class.mixin;
        QpxClass.implement = Class.mixin;

        if (staticProps) {
            for (var sKey in staticProps) {
                QpxClass[sKey] = staticProps[sKey];
            }
        }

        return QpxClass;
    };

    // přimíchání dalších vlastností do prototypu (obdoba Java interface / traits)
    Class.mixin = function () {
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

    qpx.Class = Class;

    // =================================================================
    // Utility
    // =================================================================
    qpx.extend = function (target) {
        var args = Array.prototype.slice.call(arguments, 1);
        for (var i = 0; i < args.length; i++) {
            var src = args[i];
            if (!src) { continue; }
            for (var k in src) { target[k] = src[k]; }
        }
        return target;
    };

    qpx.isString = function (v) { return typeof v === "string"; };
    qpx.isFunction = function (v) { return typeof v === "function"; };
    qpx.isObject = function (v) { return v !== null && typeof v === "object" && !Array.isArray(v); };

    qpx.uid = (function () {
        var counter = 0;
        return function (prefix) {
            counter += 1;
            return (prefix || "qpx") + counter;
        };
    })();

    qpx.toPx = function (v) {
        return (typeof v === "number") ? v + "px" : v;
    };

    // čtení hodnoty z objektu podle cesty "a.b.c"
    qpx.resolve = function (obj, path) {
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
    // Jednoduchý pub/sub mixin — lze přimíchat do libovolné qpx.Class
    // =================================================================
    qpx.EventsMixin = {
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

})(window, window.jQuery);

/*!
 * qpx - widget
 * Základní bázová třída pro všechny UI komponenty + registr a tovární
 * metoda qpx.ui(config, container), přes kterou se skládají komponenty
 * do JSON stromu (podobně jako ve webixu).
 */
(function (qpx, $) {
    "use strict";

    var registry = {};

    var Widget = qpx.Class.extend({

        // výchozí konfigurace, potomci ji přes _super/extend rozšiřují
        defaults: {},

        // config  - konfigurační objekt komponenty
        // container - (volitelně) DOM element / jQuery výběr, do kterého se komponenta vykreslí.
        //             Pokud není zadán, vytvoří se plovoucí <div>, který je možné později připojit.
        init: function (config, container) {
            this.config = $.extend(true, {}, this.defaults, config || {});
            this.id = this.config.id || qpx.uid("qpx");
            this._children = [];
            this._handlers = {};

            var node = container && (container.jquery ? container[0] : container);
            this.$container = node ? $(node) : $("<div></div>");

            this.$container
                .addClass("qpx-view")
                .attr("data-qpx-id", this.id)
                .data("qpx-widget", this);

            if (this.config.css) { this.$container.addClass(this.config.css); }
            if (this.config.width !== undefined) { this.$container.css("width", qpx.toPx(this.config.width)); }
            if (this.config.height !== undefined) { this.$container.css("height", qpx.toPx(this.config.height)); }
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

    Widget.mixin(qpx.EventsMixin);

    qpx.Widget = Widget;

    // =================================================================
    // Registr komponent + tovární metoda
    // =================================================================

    // registrace nové komponenty pod jménem použitým v "view"
    qpx.registerWidget = function (name, WidgetClass) {
        registry[name] = WidgetClass;
        return qpx;
    };

    qpx.getWidgetClass = function (name) {
        return registry[name];
    };

    // hlavní tovární metoda — sestavování z JSON konfigurace:
    //   qpx.ui({ view: "template", template: "Ahoj #name#" }, "#mistoVDom");
	/*	
    qpx.ui = function (config, container) {
        if (qpx.isString(config)) {
            config = { view: config };
        }
        var view = config.view || (config.rows || config.cols ? "layout" : null);
        if (!view) {
            throw new Error("qpx: konfigurace komponenty musí obsahovat 'view' (nebo 'rows'/'cols').");
        }
        var WidgetClass = registry[view];
        if (!WidgetClass) {
            throw new Error("qpx: neregistrovaný typ komponenty '" + view + "'.");
        }
        return new WidgetClass(config, container);
    };
	*/
	qpx.ui = function (config, container) {
	    if (qpx.isString(config)) {
	        config = { view: config };
	    }
	    var view = config.view || (config.rows || config.cols ? "layout" : null);
	    if (!view) {
	        throw new Error("qpx: konfigurace komponenty musí obsahovat 'view' (nebo 'rows'/'cols').");
	    }
	    var WidgetClass = registry[view];
	    if (!WidgetClass) {
	        throw new Error("qpx: neregistrovaný typ komponenty '" + view + "'.");
	    }

	    var instance = new WidgetClass(config, container);

	    // 🔥 DOPLNĚNO — stejné chování jako jQuery plugin
	    if (instance.$container) {
	        instance.$container.data("qpx-widget", instance);
	    }

	    return instance;
	};

})(window.qpx, jQuery);

/*!
 * qpx - layout
 * Responzivní layout komponenta umožňující libovolně vnořovat "rows" a "cols",
 * podobně jako ve webixu. Interně staví na flexboxu.
 */
(function (qpx, $) {
    "use strict";

    var Layout = qpx.Widget.extend({

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
            if (cfg.gap !== null && cfg.gap !== undefined) { this.$container.css("gap", qpx.toPx(cfg.gap)); }

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

                var isSpacer = qpx.isObject(itemCfg) &&
                    !itemCfg.view && !itemCfg.rows && !itemCfg.cols;

                var $cell = $("<div class='qpx-cell qpx-" + direction + "'></div>");
                self._applySizing($cell, itemCfg);
                self.$container.append($cell);

                if (isSpacer) {
                    $cell.addClass("qpx-spacer");
                    return; // prázdná buňka = flexibilní mezera
                }

                var child = qpx.ui(itemCfg, $cell);
                self.addChild(child);
            });
        },

        _applySizing: function ($cell, itemCfg) {
            if (!itemCfg || !qpx.isObject(itemCfg)) { return; }
            if (itemCfg.width !== undefined) {
                $cell.css({ "flex": "0 0 auto", "width": qpx.toPx(itemCfg.width) });
            }
            if (itemCfg.height !== undefined) {
                $cell.css({ "flex": "0 0 auto", "height": qpx.toPx(itemCfg.height) });
            }
            if (itemCfg.gravity !== undefined) {
                $cell.css("flex-grow", itemCfg.gravity);
            }
            if (itemCfg.hidden) { $cell.hide(); }
        }
    });

    qpx.registerWidget("layout", Layout);
    qpx.Layout = Layout;

})(window.qpx, jQuery);

/*!
 * qpx - template
 * První konkrétní UI komponenta frameworku. Chová se obdobně jako
 * "template" ve webixu: vykresluje HTML podle šablony (string, nebo
 * funkce) a dat, která lze kdykoliv změnit přes setValues()/parse().
 *
 * Podpora zápisu proměnných v šabloně: "#jmeno#" i "{jmeno}", včetně
 * vnořených cest "{user.name}".
 */
(function (qpx, $) {
    "use strict";

    var VAR_RE = /#([\w.]+)#|\{([\w.]+)\}/g;

    var Template = qpx.Widget.extend({

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
            if (qpx.isObject(prop)) {
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
            var html = this._templateFn ? this._templateFn(this.data || {}, qpx) : "";
            this.$container.html(html);
            this.trigger("afterrender");
        },

        _compile: function (tpl) {
            if (qpx.isFunction(tpl)) { return tpl; }
            var str = (tpl === null || tpl === undefined) ? "" : String(tpl);
            return function (data) {
                data = data || {};
                return str.replace(VAR_RE, function (match, a, b) {
                    var path = a || b;
                    var val = qpx.resolve(data, path);
                    return (val === undefined || val === null) ? "" : val;
                });
            };
        }
    });

    qpx.registerWidget("template", Template);
    qpx.Template = Template;

})(window.qpx, jQuery);

/*!
 * qpx - button
 * Tlačítko se stejnou koncepcí jako DevExtreme dxButton:
 *  - options: text, icon, type, stylingMode, disabled, visible, hint, template
 *  - metody: option(), enable(), disable(), focus()
 *  - události: onClick, onOptionChanged
 */
(function (qpx, $) {
    "use strict";

    var Button = qpx.Widget.extend({

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

            if (qpx.isFunction(cfg.template)) {
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
            if (qpx.isObject(name)) {
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

    qpx.registerWidget("button", Button);
    qpx.Button = Button;

})(window.qpx, jQuery);

/*!
 * qpx - buttonGroup
 * Skupina vizuálně spojených tlačítek, koncepčně jako DevExtreme dxButtonGroup.
 *  - options: items, keyExpr, selectionMode, selectedItemKeys, stylingMode
 *  - události: onItemClick, onSelectionChanged, onOptionChanged
 */
(function (qpx, $) {
    "use strict";

    var ButtonGroup = qpx.Widget.extend({

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
            if (qpx.isObject(name)) {
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

    qpx.registerWidget("buttonGroup", ButtonGroup);
    qpx.ButtonGroup = ButtonGroup;

})(window.qpx, jQuery);

/*!
 * qpx - dropDownButton
 * Tlačítko s rozbalovacím seznamem položek, koncepčně jako DevExtreme
 * dxDropDownButton (volitelně "split" tlačítko se samostatnou šipkou).
 *  - options: text, icon, items, keyExpr, displayExpr, splitButton, useSelectMode
 *  - události: onButtonClick, onItemClick, onSelectionChanged, onOptionChanged
 */
(function (qpx, $) {
    "use strict";

    var openInstance = null; // aktuálně otevřená instance (jen jedna najednou)

    var DropDownButton = qpx.Widget.extend({

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
                this.$menu.css("width", qpx.toPx(cfg.dropDownOptions.width));
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
            if (qpx.isObject(name)) {
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

    qpx.registerWidget("dropDownButton", DropDownButton);
    qpx.DropDownButton = DropDownButton;

})(window.qpx, jQuery);

/*!
 * qpx - qpSwitch
 * Přepínač inspirovaný DevExtreme dxSwitch:
 *  - options: value, onText, offText, name, disabled, visible, hint, stylingMode
 *  - metody: option(), value(), toggle(), enable(), disable(), focus()
 *  - události: onValueChanged, onOptionChanged
 */
(function (qpx, $) {
    "use strict";

    var Switch = qpx.Widget.extend({

        defaults: {
            value: false,          // true/false
            onText: "On",
            offText: "Off",
            name: "",
            disabled: false,
            visible: true,
            hint: "",
            stylingMode: "default", // default | outlined | flat
            onValueChanged: null,
            onOptionChanged: null
        },

        render: function () {
            var cfg = this.config;

            this.$container
                .addClass("qpx-switch")
                .addClass("qpx-switch-mode-" + cfg.stylingMode)
                .toggleClass("qpx-hidden", !cfg.visible)
                .toggleClass("qpx-state-disabled", !!cfg.disabled)
                .attr("role", "switch")
                .attr("tabindex", cfg.disabled ? "-1" : "0")
                .attr("aria-checked", !!cfg.value);

            if (cfg.name) {
                this.$container.attr("data-qpx-name", cfg.name);
            }
            if (cfg.hint) {
                this.$container.attr("title", cfg.hint);
            }

            if (cfg.onValueChanged) { this.on("valueChanged", cfg.onValueChanged); }
            if (cfg.onOptionChanged) { this.on("optionChanged", cfg.onOptionChanged); }

            this._renderContent();
            this._bindEvents();
        },

        _renderContent: function () {
            var cfg = this.config;
            this.$container.empty();

            var $track = $("<div class='qpx-switch-track'></div>");
            var $thumb = $("<div class='qpx-switch-thumb'></div>");
            var $labelOn = $("<span class='qpx-switch-label qpx-switch-label-on'></span>").text(cfg.onText);
            var $labelOff = $("<span class='qpx-switch-label qpx-switch-label-off'></span>").text(cfg.offText);

            $track.append($labelOff, $labelOn);
            $track.append($thumb);

            this.$container.append($track);

            this.$container
                .toggleClass("qpx-switch-on", !!cfg.value)
                .toggleClass("qpx-switch-off", !cfg.value)
                .attr("aria-checked", !!cfg.value);
        },

        _bindEvents: function () {
            var self = this;

            this.$container.off(".qpxSwitch");

            this.$container.on("click.qpxSwitch", function (e) {
                if (self.config.disabled) { return; }
                self.toggle();
            });

            this.$container.on("keydown.qpxSwitch", function (e) {
                if (self.config.disabled) { return; }
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    self.toggle();
                }
            });
        },

        // veřejné API: value() getter/setter
        value: function (val) {
            if (arguments.length === 0) {
                return !!this.config.value;
            }
            return this.option("value", !!val);
        },

        toggle: function () {
            return this.option("value", !this.config.value);
        },

        // option("x") -> čtení; option("x", v) -> zápis; option({x:..}) -> hromadně
        option: function (name, value) {
            if (arguments.length === 0) { return this.config; }
            if (qpx.isObject(name)) {
                var self = this;
                $.each(name, function (k, v) { self.option(k, v); });
                return this;
            }
            if (arguments.length === 1) { return this.config[name]; }

            var prev = this.config[name];
            if (prev === value) { return this; }

            this.config[name] = value;

            if (name === "value") {
                this.$container
                    .toggleClass("qpx-switch-on", !!this.config.value)
                    .toggleClass("qpx-switch-off", !this.config.value)
                    .attr("aria-checked", !!this.config.value);

                this.trigger("valueChanged", {
                    value: !!this.config.value,
                    previousValue: !!prev,
                    component: this,
                    element: this.getNode()
                });
            } else if (name === "visible") {
                this.$container.toggleClass("qpx-hidden", !value);
            } else if (name === "disabled") {
                this.$container
                    .toggleClass("qpx-state-disabled", !!value)
                    .attr("tabindex", value ? "-1" : "0");
            } else if (name === "stylingMode") {
                this.$container
                    .removeClass("qpx-switch-mode-default qpx-switch-mode-outlined qpx-switch-mode-flat")
                    .addClass("qpx-switch-mode-" + value);
            }

            this._renderContent();

            this.trigger("optionChanged", {
                name: name,
                value: value,
                previousValue: prev,
                element: this.getNode(),
                component: this
            });

            return this;
        },

        enable: function () { return this.option("disabled", false); },
        disable: function () { return this.option("disabled", true); },
        focus: function () { this.$container.trigger("focus"); return this; },

        destroy: function () {
            this.$container.off(".qpxSwitch");
            this._super();
        }
    });

    qpx.registerWidget("qpSwitch", Switch);
    qpx.qpSwitch = Switch;

})(window.qpx, jQuery);

/*!
 * qpx - qpTagBox
 * Vícenásobný výběr položek zobrazený jako "tagy" v poli, koncepčně
 * i vzhledově co nejblíže DevExtreme dxTagBox (kombinace textového
 * pole s vyhledáváním + rozbalovacího seznamu položek s možností
 * vícenásobného výběru).
 *
 * options:
 *   items / dataSource, valueExpr, displayExpr, value (pole hodnot),
 *   placeholder, searchEnabled, searchTimeout, minSearchLength, noDataText,
 *   multiline, maxDisplayedTags, showMultiTagOnly,
 *   showSelectionControls, hideSelectedItems, acceptCustomValue,
 *   showClearButton, stylingMode ("outlined"|"filled"|"underlined"),
 *   disabled, readOnly, visible, tagTemplate, itemTemplate, dropDownOptions
 *
 * events:
 *   onInitialized, onContentReady, onValueChanged, onSelectionChanged,
 *   onOpened, onClosed, onCustomItemCreating, onOptionChanged, onDisposing
 *
 * methods:
 *   option(name[, value]), value([val]), open(), close(),
 *   getSelectedItems(), getDataSource(), reset(), focus(),
 *   enable(), disable(), destroy()
 */
(function (qpx, $) {
    "use strict";

    var openInstance = null; // aktuálně otevřená instance (jen jedna najednou)

    var TagBox = qpx.Widget.extend({

        defaults: {
            dataSource: null,
            items: [],
            valueExpr: null,      // null = "this" (celá položka je hodnota)
            displayExpr: null,    // null = item.text, nebo JSON.stringify

            value: [],

            placeholder: "Vyberte...",
            searchEnabled: true,
            searchTimeout: 200,
            minSearchLength: 0,
            noDataText: "Žádné položky",

            multiline: true,           // false = jeden řádek se scrollem místo zalamování tagů
            maxDisplayedTags: undefined,
            showMultiTagOnly: false,   // true = místo jednotlivých tagů jen "N vybráno"

            showSelectionControls: false, // "Vybrat vše" / "Zrušit výběr" v popupu
            hideSelectedItems: false,
            acceptCustomValue: false,

            showClearButton: false,
            stylingMode: "outlined",  // outlined | filled | underlined

            disabled: false,
            readOnly: false,
            visible: true,

            tagTemplate: null,   // function(tagData:{value,item}, tagIndex, tagElement)
            itemTemplate: null,  // function(itemData, itemIndex, itemElement)
            dropDownOptions: {}, // { width, maxHeight }

            onValueChanged: null,
            onSelectionChanged: null,
            onOpened: null,
            onClosed: null,
            onCustomItemCreating: null,
            onOptionChanged: null,
            onInitialized: null,
            onContentReady: null,
            onDisposing: null
        },

        // ---------------------------------------------------------------
        render: function () {
            var cfg = this.config;
            var self = this;

            cfg.items = (cfg.items && cfg.items.length) ? cfg.items : (cfg.dataSource || []);
            cfg.value = cfg.value || [];

            this.$container
                .addClass("qpx-tagbox")
                .addClass("qpx-tagbox-mode-" + cfg.stylingMode)
                .toggleClass("qpx-hidden", !cfg.visible)
                .toggleClass("qpx-state-disabled", !!cfg.disabled)
                .toggleClass("qpx-state-readonly", !!cfg.readOnly)
                .attr("role", "combobox")
                .attr("aria-expanded", "false")
                .attr("aria-multiselectable", "true");

            if (cfg.onInitialized) { this.on("ready", cfg.onInitialized); }
            if (cfg.onContentReady) { this.on("contentReady", cfg.onContentReady); }
            if (cfg.onValueChanged) { this.on("valueChanged", cfg.onValueChanged); }
            if (cfg.onSelectionChanged) { this.on("selectionChanged", cfg.onSelectionChanged); }
            if (cfg.onOpened) { this.on("opened", cfg.onOpened); }
            if (cfg.onClosed) { this.on("closed", cfg.onClosed); }
            if (cfg.onOptionChanged) { this.on("optionChanged", cfg.onOptionChanged); }
            if (cfg.onDisposing) { this.on("destroy", cfg.onDisposing); }

            this._isOpen = false;
            this._searchText = "";
            this._highlightIndex = -1;

            this._buildDom();
            this._bindEvents();

            setTimeout(function () { self.trigger("contentReady", { component: self }); }, 0);
        },

        // ---------------------------------------------------------------
        // DOM
        // ---------------------------------------------------------------
        _buildDom: function () {
            var cfg = this.config;
            this.$container.empty();

            this.$field = $("<div class='qpx-tagbox-field'></div>");
            this.$searchInput = $("<input type='text' class='qpx-tagbox-search' autocomplete='off'>")
                .prop("disabled", !!cfg.disabled)
                .prop("readOnly", !!cfg.readOnly || !cfg.searchEnabled);

            this.$clearBtn = $("<span class='qpx-tagbox-clear' tabindex='-1' title='Vymazat výběr'>✕</span>").hide();
            this.$arrow = $("<span class='qpx-tagbox-arrow'>▾</span>");

            this.$container.append(this.$field, this.$clearBtn, this.$arrow);

            this.$dropdown = $("<div class='qpx-popup-list qpx-tagbox-dropdown'></div>").appendTo(document.body).hide();
            this.$list = $("<div class='qpx-tagbox-list'></div>");
            this.$dropdown.append(this.$list);

            if (cfg.dropDownOptions && cfg.dropDownOptions.width) { this.$dropdown.css("width", qpx.toPx(cfg.dropDownOptions.width)); }
            if (cfg.dropDownOptions && cfg.dropDownOptions.maxHeight) { this.$list.css("max-height", qpx.toPx(cfg.dropDownOptions.maxHeight)); }

            this._renderField();
            this._renderDropdownItems();
        },

        _bindEvents: function () {
            var self = this;
            var cfg = this.config;

            this.$container.on("click.qpxTagBox", function (e) {
                if (cfg.disabled) { return; }
                if ($(e.target).closest(".qpx-tagbox-tag-remove, .qpx-tagbox-clear").length) { return; }
                self.$searchInput.trigger("focus");
                if (!cfg.readOnly) { self.open(); }
            });

            this.$searchInput.on("focus.qpxTagBox", function () {
                if (!cfg.disabled && !cfg.readOnly) { self.open(); }
            });

            var searchTimer = null;
            this.$searchInput.on("input.qpxTagBox", function () {
                var val = this.value;
                clearTimeout(searchTimer);
                searchTimer = setTimeout(function () {
                    self._searchText = (val.length >= (cfg.minSearchLength || 0)) ? val : "";
                    self._highlightIndex = -1;
                    self._renderDropdownItems();
                    if (!self._isOpen) { self.open(); }
                }, cfg.searchTimeout);
            });

            this.$searchInput.on("keydown.qpxTagBox", function (e) {
                if (cfg.disabled || cfg.readOnly) { return; }
                var items = self._filteredItems();

                switch (e.key) {
                    case "ArrowDown":
                        e.preventDefault();
                        if (!self._isOpen) { self.open(); }
                        self._highlightIndex = Math.min(items.length - 1, self._highlightIndex + 1);
                        self._renderDropdownItems();
                        break;

                    case "ArrowUp":
                        e.preventDefault();
                        self._highlightIndex = Math.max(0, self._highlightIndex - 1);
                        self._renderDropdownItems();
                        break;

                    case "Enter":
                        e.preventDefault();
                        if (self._highlightIndex > -1 && items[self._highlightIndex]) {
                            self._toggleItem(items[self._highlightIndex]);
                        } else if (cfg.acceptCustomValue && this.value.trim()) {
                            self._handleCustomItemCreating(this.value.trim());
                        }
                        break;

                    case "Escape":
                        e.preventDefault();
                        self.close();
                        break;

                    case "Backspace":
                        if (!this.value && cfg.value.length) {
                            e.preventDefault();
                            self._removeValue(cfg.value[cfg.value.length - 1]);
                        }
                        break;
                }
            });

            this.$arrow.on("click.qpxTagBox", function (e) {
                e.stopPropagation();
                if (cfg.disabled || cfg.readOnly) { return; }
                if (self._isOpen) { self.close(); } else { self.$searchInput.trigger("focus"); self.open(); }
            });

            this.$clearBtn.on("click.qpxTagBox", function (e) {
                e.stopPropagation();
                if (cfg.disabled || cfg.readOnly) { return; }
                self.option("value", []);
            });

            $(document).on("mousedown.qpxTagBox" + this.id, function (e) {
                if (!self._isOpen) { return; }
                if ($(e.target).closest(self.$dropdown).length || $(e.target).closest(self.$container).length) { return; }
                self.close();
            });
        },

        // ---------------------------------------------------------------
        // Vykreslení pole s tagy
        // ---------------------------------------------------------------
        _renderField: function () {
            var self = this;
            var cfg = this.config;
            this.$field.empty();

            var values = cfg.value || [];
            var useMultiTagOnly = cfg.showMultiTagOnly && values.length > 0;
            var limit = (cfg.maxDisplayedTags !== undefined && cfg.maxDisplayedTags !== null) ? cfg.maxDisplayedTags : values.length;

            if (useMultiTagOnly) {
                this._appendSummaryTag(values.length + " vybráno");
            } else {
                values.slice(0, limit).forEach(function (val) { self._appendTag(val); });
                if (values.length > limit) { this._appendSummaryTag("+" + (values.length - limit)); }
            }

            this.$field.toggleClass("qpx-tagbox-field-multiline", !!cfg.multiline);
            this.$searchInput.attr("placeholder", values.length ? "" : cfg.placeholder);
            this.$field.append(this.$searchInput);

            this.$clearBtn.toggle(!!cfg.showClearButton && values.length > 0 && !cfg.disabled && !cfg.readOnly);
        },

        _appendTag: function (val) {
            var self = this;
            var cfg = this.config;
            var item = this._itemForValue(val);
            var $tag = $("<span class='qpx-tagbox-tag'></span>");

            if (qpx.isFunction(cfg.tagTemplate)) {
                var result = cfg.tagTemplate.call(this, { value: val, item: item }, 0, $tag[0]);
                if (result !== undefined && result !== null) { $tag.append(result); }
            } else {
                $tag.append($("<span class='qpx-tagbox-tag-text'></span>").text(item !== undefined ? this._displayOf(item) : String(val)));
                if (!cfg.disabled && !cfg.readOnly) {
                    var $remove = $("<span class='qpx-tagbox-tag-remove' tabindex='-1'>✕</span>");
                    $remove.on("click.qpxTagBox", function (e) { e.stopPropagation(); self._removeValue(val); });
                    $tag.append($remove);
                }
            }

            this.$field.append($tag);
        },

        _appendSummaryTag: function (text) {
            this.$field.append($("<span class='qpx-tagbox-tag qpx-tagbox-tag-summary'></span>").text(text));
        },

        // ---------------------------------------------------------------
        // Rozbalovací seznam položek
        // ---------------------------------------------------------------
        _renderDropdownItems: function () {
            var self = this;
            var cfg = this.config;
            this.$list.empty();

            if (cfg.showSelectionControls) {
                var $ctrl = $("<div class='qpx-tagbox-selection-controls'></div>");
                $ctrl.append(
                    $("<span class='qpx-tagbox-select-all'></span>").text("Vybrat vše")
                        .on("click.qpxTagBox", function (e) { e.stopPropagation(); self._selectAllFiltered(); }),
                    $("<span class='qpx-tagbox-clear-all'></span>").text("Zrušit výběr")
                        .on("click.qpxTagBox", function (e) { e.stopPropagation(); self.option("value", []); })
                );
                this.$list.append($ctrl);
            }

            var items = this._filteredItems();

            if (!items.length) {
                this.$list.append($("<div class='qpx-tagbox-nodata'></div>").text(cfg.noDataText));
                return;
            }

            items.forEach(function (item, idx) {
                var val = self._valueOf(item);
                var selected = self._indexOfValue(val) !== -1;

                var $row = $("<div class='qpx-popup-list-item qpx-tagbox-item'></div>")
                    .toggleClass("qpx-state-selected", selected)
                    .toggleClass("qpx-state-highlighted", idx === self._highlightIndex);

                $row.append($("<span class='qpx-tagbox-item-check'></span>"));

                if (qpx.isFunction(cfg.itemTemplate)) {
                    var res = cfg.itemTemplate.call(self, item, idx, $row[0]);
                    if (res !== undefined && res !== null) { $row.append(res); }
                } else {
                    $row.append($("<span class='qpx-tagbox-item-text'></span>").text(self._displayOf(item)));
                }

                $row.on("click.qpxTagBox", function (e) {
                    e.stopPropagation();
                    self._toggleItem(item);
                    self.$searchInput.trigger("focus");
                });

                self.$list.append($row);
            });
        },

        _filteredItems: function () {
            var self = this;
            var cfg = this.config;
            var text = (this._searchText || "").toLowerCase();

            return (cfg.items || []).filter(function (item) {
                if (cfg.hideSelectedItems && self._indexOfValue(self._valueOf(item)) !== -1) { return false; }
                if (!text) { return true; }
                return self._displayOf(item).toLowerCase().indexOf(text) !== -1;
            });
        },

        // ---------------------------------------------------------------
        // Popup otevřít/zavřít
        // ---------------------------------------------------------------
        open: function () {
            if (this.config.disabled || this._isOpen) { return this; }
            if (openInstance && openInstance !== this) { openInstance.close(); }

            this._renderDropdownItems();

            var off = this.$container.offset();
            this.$dropdown.css({
                top: off.top + this.$container.outerHeight(),
                left: off.left,
                minWidth: this.$container.outerWidth()
            }).show();

            this._isOpen = true;
            this.$container.attr("aria-expanded", "true");
            openInstance = this;
            this.trigger("opened", { component: this });
            return this;
        },

        close: function () {
            if (!this._isOpen) { return this; }
            this.$dropdown.hide();
            this._isOpen = false;
            this._highlightIndex = -1;
            this.$container.attr("aria-expanded", "false");
            if (openInstance === this) { openInstance = null; }
            this.trigger("closed", { component: this });
            return this;
        },

        // ---------------------------------------------------------------
        // Práce s hodnotami / výběrem
        // ---------------------------------------------------------------
        _valueOf: function (item) {
            if (this.config.valueExpr && this.config.valueExpr !== "this") {
                return qpx.resolve(item, this.config.valueExpr);
            }
            return item;
        },

        _displayOf: function (item) {
            if (this.config.displayExpr) {
                var v = qpx.resolve(item, this.config.displayExpr);
                return (v === undefined || v === null) ? "" : String(v);
            }
            if (qpx.isObject(item)) { return item.text !== undefined ? String(item.text) : JSON.stringify(item); }
            return String(item);
        },

        _itemForValue: function (val) {
            var self = this;
            return (this.config.items || []).filter(function (it) { return self._valueOf(it) === val; })[0];
        },

        _itemsForValues: function (values) {
            var self = this;
            return values.map(function (v) {
                var found = self._itemForValue(v);
                return found !== undefined ? found : v;
            });
        },

        _indexOfValue: function (val) {
            var arr = this.config.value || [];
            for (var i = 0; i < arr.length; i++) { if (arr[i] === val) { return i; } }
            return -1;
        },

        _toggleItem: function (item) {
            var val = this._valueOf(item);
            var arr = (this.config.value || []).slice();
            var idx = arr.indexOf(val);
            if (idx === -1) { arr.push(val); } else { arr.splice(idx, 1); }
            this.option("value", arr);
        },

        _removeValue: function (val) {
            var arr = (this.config.value || []).slice();
            var idx = arr.indexOf(val);
            if (idx === -1) { return; }
            arr.splice(idx, 1);
            this.option("value", arr);
        },

        _selectAllFiltered: function () {
            var self = this;
            var arr = (this.config.value || []).slice();
            this._filteredItems().forEach(function (item) {
                var val = self._valueOf(item);
                if (arr.indexOf(val) === -1) { arr.push(val); }
            });
            this.option("value", arr);
        },

        _handleCustomItemCreating: function (text) {
            var cfg = this.config;
            if (!text) { return; }

            var createdItem;
            if (qpx.isFunction(cfg.onCustomItemCreating)) {
                var args = { text: text, component: this, customItem: undefined };
                var ret = cfg.onCustomItemCreating(args);
                createdItem = (args.customItem !== undefined) ? args.customItem : ret;
            }
            if (createdItem === undefined || createdItem === null) {
                if (!cfg.acceptCustomValue) { return; }
                createdItem = text;
            }

            if (cfg.items.indexOf(createdItem) === -1) { cfg.items.push(createdItem); }
            this._toggleItem(createdItem);

            this.$searchInput.val("");
            this._searchText = "";
            this._renderDropdownItems();
        },

        // ---------------------------------------------------------------
        // Veřejné API
        // ---------------------------------------------------------------
        // value() -> čtení pole vybraných hodnot; value(pole) -> zápis (zkratka za option("value", ...))
        value: function (val) {
            if (arguments.length === 0) { return (this.config.value || []).slice(); }
            return this.option("value", val);
        },

        getSelectedItems: function () { return this._itemsForValues((this.config.value || []).slice()); },
        getDataSource: function () { return this.config.items; },
        reset: function () { return this.option("value", []); },
        focus: function () { this.$searchInput.trigger("focus"); return this; },
        enable: function () { return this.option("disabled", false); },
        disable: function () { return this.option("disabled", true); },

        option: function (name, value) {
            if (arguments.length === 0) { return this.config; }
            if (qpx.isObject(name)) {
                var self = this;
                $.each(name, function (k, v) { self.option(k, v); });
                return this;
            }
            if (arguments.length === 1) { return this.config[name]; }

            var prev = this.config[name];
            if (prev === value) { return this; }
            this.config[name] = value;

            switch (name) {
                case "value": {
                    var prevArr = (prev || []).slice();
                    var newArr = value || [];
                    this.config.value = newArr;
                    this._renderField();
                    this._renderDropdownItems();

                    this.trigger("valueChanged", { value: newArr.slice(), previousValue: prevArr, component: this, element: this.getNode() });

                    var added = newArr.filter(function (v) { return prevArr.indexOf(v) === -1; });
                    var removed = prevArr.filter(function (v) { return newArr.indexOf(v) === -1; });
                    if (added.length || removed.length) {
                        this.trigger("selectionChanged", { addedItems: this._itemsForValues(added), removedItems: this._itemsForValues(removed), component: this });
                    }
                    break;
                }

                case "items":
                case "dataSource":
                    this.config.items = value || [];
                    this._renderField();
                    this._renderDropdownItems();
                    break;

                case "disabled":
                    this.$container.toggleClass("qpx-state-disabled", !!value);
                    this.$searchInput.prop("disabled", !!value);
                    if (value) { this.close(); }
                    this._renderField();
                    break;

                case "readOnly":
                    this.$container.toggleClass("qpx-state-readonly", !!value);
                    this.$searchInput.prop("readOnly", !!value || !this.config.searchEnabled);
                    this._renderField();
                    break;

                case "visible":
                    this.$container.toggleClass("qpx-hidden", !value);
                    break;

                case "stylingMode":
                    this.$container.removeClass("qpx-tagbox-mode-" + prev).addClass("qpx-tagbox-mode-" + value);
                    break;

                case "searchEnabled":
                    this.$searchInput.prop("readOnly", !value || !!this.config.readOnly);
                    break;

                case "placeholder":
                case "maxDisplayedTags":
                case "showMultiTagOnly":
                case "showClearButton":
                case "multiline":
                    this._renderField();
                    break;

                case "hideSelectedItems":
                case "showSelectionControls":
                case "noDataText":
                    this._renderDropdownItems();
                    break;
            }

            this.trigger("optionChanged", { name: name, value: value, previousValue: prev, component: this });
            return this;
        },

        destroy: function () {
            this.$container.off(".qpxTagBox");
            if (this.$searchInput) { this.$searchInput.off(".qpxTagBox"); }
            $(document).off(".qpxTagBox" + this.id);
            if (this.$dropdown) { this.$dropdown.remove(); }
            if (openInstance === this) { openInstance = null; }
            this._super();
        }
    });

    qpx.registerWidget("qpTagBox", TagBox);
    qpx.qpTagBox = TagBox;

})(window.qpx, jQuery);

/*!
 * qpx - qpAutocomplete
 * Textové pole s automatickým našeptáváním položek podle psaného textu,
 * koncepčně i vzhledově co nejblíže DevExtreme dxAutocomplete. Na rozdíl
 * od qpSelectBox/qpLookup NENÍ výběr z nabídky vynucen — hodnotou je
 * vždy zadaný text, položka z nabídky jen text doplní.
 *
 * options:
 *   items / dataSource, displayExpr, value (text),
 *   placeholder, minSearchLength, searchTimeout, maxItemCount, noDataText,
 *   showClearButton, stylingMode ("outlined"|"filled"|"underlined"),
 *   disabled, readOnly, visible, itemTemplate, dropDownOptions
 *
 * events:
 *   onInitialized, onContentReady, onValueChanged, onSelectionChanged,
 *   onOpened, onClosed, onEnterKey, onOptionChanged, onDisposing
 *
 * methods:
 *   option(name[, value]), value([val]), open(), close(),
 *   getDataSource(), reset(), focus(), enable(), disable(), destroy()
 */
(function (qpx, $) {
    "use strict";

    var openInstance = null; // aktuálně otevřená instance (jen jedna najednou)

    var Autocomplete = qpx.Widget.extend({

        defaults: {
            dataSource: null,
            items: [],
            displayExpr: null,   // null = item.text, nebo přímo řetězec

            value: "",

            placeholder: "Zadejte text...",
            minSearchLength: 1,
            searchTimeout: 200,
            maxItemCount: undefined,
            noDataText: "Žádné položky",

            showClearButton: false,
            stylingMode: "outlined",  // outlined | filled | underlined

            disabled: false,
            readOnly: false,
            visible: true,

            itemTemplate: null,  // function(itemData, itemIndex, itemElement)
            dropDownOptions: {}, // { width, maxHeight }

            onValueChanged: null,
            onSelectionChanged: null,
            onOpened: null,
            onClosed: null,
            onEnterKey: null,
            onOptionChanged: null,
            onInitialized: null,
            onContentReady: null,
            onDisposing: null
        },

        // ---------------------------------------------------------------
        render: function () {
            var cfg = this.config;
            var self = this;

            cfg.items = (cfg.items && cfg.items.length) ? cfg.items : (cfg.dataSource || []);
            cfg.value = cfg.value || "";

            this.$container
                .addClass("qpx-autocomplete")
                .addClass("qpx-autocomplete-mode-" + cfg.stylingMode)
                .toggleClass("qpx-hidden", !cfg.visible)
                .toggleClass("qpx-state-disabled", !!cfg.disabled)
                .toggleClass("qpx-state-readonly", !!cfg.readOnly)
                .attr("role", "combobox")
                .attr("aria-expanded", "false")
                .attr("aria-autocomplete", "list");

            if (cfg.onInitialized) { this.on("ready", cfg.onInitialized); }
            if (cfg.onContentReady) { this.on("contentReady", cfg.onContentReady); }
            if (cfg.onValueChanged) { this.on("valueChanged", cfg.onValueChanged); }
            if (cfg.onSelectionChanged) { this.on("selectionChanged", cfg.onSelectionChanged); }
            if (cfg.onOpened) { this.on("opened", cfg.onOpened); }
            if (cfg.onClosed) { this.on("closed", cfg.onClosed); }
            if (cfg.onEnterKey) { this.on("enterKey", cfg.onEnterKey); }
            if (cfg.onOptionChanged) { this.on("optionChanged", cfg.onOptionChanged); }
            if (cfg.onDisposing) { this.on("destroy", cfg.onDisposing); }

            this._isOpen = false;
            this._searchText = cfg.value;
            this._highlightIndex = -1;

            this._buildDom();
            this._bindEvents();

            setTimeout(function () { self.trigger("contentReady", { component: self }); }, 0);
        },

        // ---------------------------------------------------------------
        // DOM
        // ---------------------------------------------------------------
        _buildDom: function () {
            var cfg = this.config;
            this.$container.empty();

            this.$input = $("<input type='text' class='qpx-autocomplete-input' autocomplete='off'>")
                .val(cfg.value)
                .attr("placeholder", cfg.placeholder)
                .prop("disabled", !!cfg.disabled)
                .prop("readOnly", !!cfg.readOnly);

            this.$clearBtn = $("<span class='qpx-autocomplete-clear' tabindex='-1' title='Vymazat'>✕</span>").hide();

            this.$container.append(this.$input, this.$clearBtn);

            this.$dropdown = $("<div class='qpx-popup-list qpx-autocomplete-dropdown'></div>").appendTo(document.body).hide();
            this.$list = $("<div class='qpx-autocomplete-list'></div>");
            this.$dropdown.append(this.$list);

            if (cfg.dropDownOptions && cfg.dropDownOptions.width) { this.$dropdown.css("width", qpx.toPx(cfg.dropDownOptions.width)); }
            if (cfg.dropDownOptions && cfg.dropDownOptions.maxHeight) { this.$list.css("max-height", qpx.toPx(cfg.dropDownOptions.maxHeight)); }

            this._renderField();
        },

        _bindEvents: function () {
            var self = this;
            var cfg = this.config;
            var searchTimer = null;

            this.$input.on("focus.qpxAutocomplete", function () {
                if (cfg.disabled || cfg.readOnly) { return; }
                self._searchText = self.$input.val();
                self._renderDropdownItems();
                self.open();
            });

            this.$input.on("input.qpxAutocomplete", function () {
                var val = this.value;
                clearTimeout(searchTimer);
                searchTimer = setTimeout(function () {
                    self._searchText = val;
                    self._highlightIndex = -1;
                    self._renderDropdownItems();
                    if (!self._isOpen) { self.open(); }
                    self.$clearBtn.toggle(!!cfg.showClearButton && val.length > 0);
                }, cfg.searchTimeout);
            });

            this.$input.on("keydown.qpxAutocomplete", function (e) {
                if (cfg.disabled || cfg.readOnly) { return; }
                var items = self._filteredItems();

                switch (e.key) {
                    case "ArrowDown":
                        e.preventDefault();
                        if (!self._isOpen) { self.open(); }
                        self._highlightIndex = Math.min(items.length - 1, self._highlightIndex + 1);
                        self._renderDropdownItems();
                        break;

                    case "ArrowUp":
                        e.preventDefault();
                        self._highlightIndex = Math.max(0, self._highlightIndex - 1);
                        self._renderDropdownItems();
                        break;

                    case "Enter":
                        if (self._highlightIndex > -1 && items[self._highlightIndex]) {
                            self._selectItem(items[self._highlightIndex]);
                        } else {
                            self._commitTypedValue();
                        }
                        self.trigger("enterKey", { component: self, event: e });
                        break;

                    case "Escape":
                        e.preventDefault();
                        self.close();
                        break;
                }
            });

            this.$input.on("blur.qpxAutocomplete", function () {
                // commit se řeší v mousedown handleru dokumentu (aby fungoval i klik na položku)
            });

            this.$clearBtn.on("click.qpxAutocomplete", function (e) {
                e.stopPropagation();
                if (cfg.disabled || cfg.readOnly) { return; }
                self.option("value", "");
                self.$input.trigger("focus");
            });

            $(document).on("mousedown.qpxAutocomplete" + this.id, function (e) {
                if (!self._isOpen) { return; }
                if ($(e.target).closest(self.$dropdown).length || $(e.target).closest(self.$container).length) { return; }
                self._commitTypedValue();
                self.close();
            });
        },

        _renderField: function () {
            var cfg = this.config;
            this.$input.val(cfg.value || "");
            this.$clearBtn.toggle(!!cfg.showClearButton && !!cfg.value);
        },

        // ---------------------------------------------------------------
        // Rozbalovací seznam návrhů
        // ---------------------------------------------------------------
        _renderDropdownItems: function () {
            var self = this;
            var cfg = this.config;
            this.$list.empty();

            var items = this._filteredItems();

            if (!items.length) {
                this.$list.append($("<div class='qpx-autocomplete-nodata'></div>").text(cfg.noDataText));
                return;
            }

            items.forEach(function (item, idx) {
                var $row = $("<div class='qpx-popup-list-item qpx-autocomplete-item'></div>")
                    .toggleClass("qpx-state-highlighted", idx === self._highlightIndex);

                if (qpx.isFunction(cfg.itemTemplate)) {
                    var res = cfg.itemTemplate.call(self, item, idx, $row[0]);
                    if (res !== undefined && res !== null) { $row.append(res); }
                } else {
                    $row.append($("<span class='qpx-autocomplete-item-text'></span>").text(self._displayOf(item)));
                }

                $row.on("mousedown.qpxAutocomplete", function (e) {
                    // mousedown místo click, aby předešlo blur/mousedown handleru dokumentu
                    e.preventDefault();
                    e.stopPropagation();
                    self._selectItem(item);
                });

                self.$list.append($row);
            });
        },

        _filteredItems: function () {
            var self = this;
            var cfg = this.config;
            var text = (this._searchText || "");

            if (text.length < (cfg.minSearchLength || 0)) { return []; }

            var lower = text.toLowerCase();
            var result = (cfg.items || []).filter(function (item) {
                if (!lower) { return true; }
                return self._displayOf(item).toLowerCase().indexOf(lower) !== -1;
            });

            if (cfg.maxItemCount) { result = result.slice(0, cfg.maxItemCount); }
            return result;
        },

        _displayOf: function (item) {
            if (this.config.displayExpr) {
                var v = qpx.resolve(item, this.config.displayExpr);
                return (v === undefined || v === null) ? "" : String(v);
            }
            if (qpx.isObject(item)) { return item.text !== undefined ? String(item.text) : JSON.stringify(item); }
            return String(item);
        },

        _selectItem: function (item) {
            var text = this._displayOf(item);
            this.option("value", text);
            this.trigger("selectionChanged", { item: item, component: this });
            this.close();
            this.$input.trigger("focus");
        },

        _commitTypedValue: function () {
            var text = this.$input.val();
            if (text !== this.config.value) { this.option("value", text); }
        },

        // ---------------------------------------------------------------
        // Popup otevřít/zavřít
        // ---------------------------------------------------------------
        open: function () {
            if (this.config.disabled || this.config.readOnly || this._isOpen) { return this; }
            if (openInstance && openInstance !== this) { openInstance.close(); }

            this._renderDropdownItems();

            var off = this.$container.offset();
            this.$dropdown.css({
                top: off.top + this.$container.outerHeight(),
                left: off.left,
                minWidth: this.$container.outerWidth()
            }).show();

            this._isOpen = true;
            this.$container.attr("aria-expanded", "true");
            openInstance = this;
            this.trigger("opened", { component: this });
            return this;
        },

        close: function () {
            if (!this._isOpen) { return this; }
            this.$dropdown.hide();
            this._isOpen = false;
            this._highlightIndex = -1;
            this.$container.attr("aria-expanded", "false");
            if (openInstance === this) { openInstance = null; }
            this.trigger("closed", { component: this });
            return this;
        },

        // ---------------------------------------------------------------
        // Veřejné API
        // ---------------------------------------------------------------
        value: function (val) {
            if (arguments.length === 0) { return this.config.value; }
            return this.option("value", val);
        },

        getDataSource: function () { return this.config.items; },
        reset: function () { return this.option("value", ""); },
        focus: function () { this.$input.trigger("focus"); return this; },
        enable: function () { return this.option("disabled", false); },
        disable: function () { return this.option("disabled", true); },

        option: function (name, value) {
            if (arguments.length === 0) { return this.config; }
            if (qpx.isObject(name)) {
                var self = this;
                $.each(name, function (k, v) { self.option(k, v); });
                return this;
            }
            if (arguments.length === 1) { return this.config[name]; }

            var prev = this.config[name];
            if (prev === value) { return this; }
            this.config[name] = value;

            switch (name) {
                case "value":
                    this._searchText = value || "";
                    this._renderField();
                    this.trigger("valueChanged", { value: value, previousValue: prev, component: this, element: this.getNode() });
                    break;

                case "items":
                case "dataSource":
                    this.config.items = value || [];
                    if (this._isOpen) { this._renderDropdownItems(); }
                    break;

                case "disabled":
                    this.$container.toggleClass("qpx-state-disabled", !!value);
                    this.$input.prop("disabled", !!value);
                    if (value) { this.close(); }
                    break;

                case "readOnly":
                    this.$container.toggleClass("qpx-state-readonly", !!value);
                    this.$input.prop("readOnly", !!value);
                    if (value) { this.close(); }
                    break;

                case "visible":
                    this.$container.toggleClass("qpx-hidden", !value);
                    break;

                case "stylingMode":
                    this.$container.removeClass("qpx-autocomplete-mode-" + prev).addClass("qpx-autocomplete-mode-" + value);
                    break;

                case "placeholder":
                    this.$input.attr("placeholder", value);
                    break;

                case "showClearButton":
                    this._renderField();
                    break;

                case "minSearchLength":
                case "maxItemCount":
                case "noDataText":
                    if (this._isOpen) { this._renderDropdownItems(); }
                    break;
            }

            this.trigger("optionChanged", { name: name, value: value, previousValue: prev, component: this });
            return this;
        },

        destroy: function () {
            this.$container.off(".qpxAutocomplete");
            if (this.$input) { this.$input.off(".qpxAutocomplete"); }
            $(document).off(".qpxAutocomplete" + this.id);
            if (this.$dropdown) { this.$dropdown.remove(); }
            if (openInstance === this) { openInstance = null; }
            this._super();
        }
    });

    qpx.registerWidget("qpAutocomplete", Autocomplete);
    qpx.qpAutocomplete = Autocomplete;

})(window.qpx, jQuery);

/*!
 * qpx - qpSelectBox
 * Výběr jedné položky z rozbalovacího seznamu, koncepčně i vzhledově
 * co nejblíže DevExtreme dxSelectBox. Na rozdíl od qpAutocomplete je
 * hodnotou vždy položka ze seznamu (resp. valueExpr z ní) — volný text
 * je povolen jen při acceptCustomValue: true.
 *
 * options:
 *   items / dataSource, valueExpr, displayExpr, value,
 *   placeholder, searchEnabled, searchTimeout, minSearchLength, noDataText,
 *   acceptCustomValue, showClearButton, stylingMode ("outlined"|"filled"|"underlined"),
 *   disabled, readOnly, visible, itemTemplate, dropDownOptions
 *
 * events:
 *   onInitialized, onContentReady, onValueChanged, onSelectionChanged,
 *   onOpened, onClosed, onCustomItemCreating, onOptionChanged, onDisposing
 *
 * methods:
 *   option(name[, value]), value([val]), open(), close(),
 *   getSelectedItem(), getDataSource(), reset(), focus(),
 *   enable(), disable(), destroy()
 */
(function (qpx, $) {
    "use strict";

    var openInstance = null; // aktuálně otevřená instance (jen jedna najednou)

    var SelectBox = qpx.Widget.extend({

        defaults: {
            dataSource: null,
            items: [],
            valueExpr: null,      // null = "this" (celá položka je hodnota)
            displayExpr: null,    // null = item.text, nebo JSON.stringify

            value: null,

            placeholder: "Vyberte...",
            searchEnabled: false,
            searchTimeout: 200,
            minSearchLength: 0,
            noDataText: "Žádné položky",

            acceptCustomValue: false,
            showClearButton: false,
            stylingMode: "outlined",  // outlined | filled | underlined

            disabled: false,
            readOnly: false,
            visible: true,

            itemTemplate: null,  // function(itemData, itemIndex, itemElement)
            dropDownOptions: {}, // { width, maxHeight }

            onValueChanged: null,
            onSelectionChanged: null,
            onOpened: null,
            onClosed: null,
            onCustomItemCreating: null,
            onOptionChanged: null,
            onInitialized: null,
            onContentReady: null,
            onDisposing: null
        },

        // ---------------------------------------------------------------
        render: function () {
            var cfg = this.config;
            var self = this;

            cfg.items = (cfg.items && cfg.items.length) ? cfg.items : (cfg.dataSource || []);

            this.$container
                .addClass("qpx-selectbox")
                .addClass("qpx-selectbox-mode-" + cfg.stylingMode)
                .toggleClass("qpx-hidden", !cfg.visible)
                .toggleClass("qpx-state-disabled", !!cfg.disabled)
                .toggleClass("qpx-state-readonly", !!cfg.readOnly)
                .attr("role", "combobox")
                .attr("aria-expanded", "false");

            if (cfg.onInitialized) { this.on("ready", cfg.onInitialized); }
            if (cfg.onContentReady) { this.on("contentReady", cfg.onContentReady); }
            if (cfg.onValueChanged) { this.on("valueChanged", cfg.onValueChanged); }
            if (cfg.onSelectionChanged) { this.on("selectionChanged", cfg.onSelectionChanged); }
            if (cfg.onOpened) { this.on("opened", cfg.onOpened); }
            if (cfg.onClosed) { this.on("closed", cfg.onClosed); }
            if (cfg.onOptionChanged) { this.on("optionChanged", cfg.onOptionChanged); }
            if (cfg.onDisposing) { this.on("destroy", cfg.onDisposing); }

            this._isOpen = false;
            this._searchText = "";
            this._highlightIndex = -1;

            this._buildDom();
            this._bindEvents();

            setTimeout(function () { self.trigger("contentReady", { component: self }); }, 0);
        },

        // ---------------------------------------------------------------
        // DOM
        // ---------------------------------------------------------------
        _buildDom: function () {
            var cfg = this.config;
            this.$container.empty();

            this.$input = $("<input type='text' class='qpx-selectbox-input' autocomplete='off'>")
                .prop("disabled", !!cfg.disabled)
                .prop("readOnly", !cfg.searchEnabled || !!cfg.readOnly);

            this.$clearBtn = $("<span class='qpx-selectbox-clear' tabindex='-1' title='Vymazat výběr'>✕</span>").hide();
            this.$arrow = $("<span class='qpx-selectbox-arrow'>▾</span>");

            this.$container.append(this.$input, this.$clearBtn, this.$arrow);

            this.$dropdown = $("<div class='qpx-popup-list qpx-selectbox-dropdown'></div>").appendTo(document.body).hide();
            this.$list = $("<div class='qpx-selectbox-list'></div>");
            this.$dropdown.append(this.$list);

            if (cfg.dropDownOptions && cfg.dropDownOptions.width) { this.$dropdown.css("width", qpx.toPx(cfg.dropDownOptions.width)); }
            if (cfg.dropDownOptions && cfg.dropDownOptions.maxHeight) { this.$list.css("max-height", qpx.toPx(cfg.dropDownOptions.maxHeight)); }

            this._renderField();
        },

        _bindEvents: function () {
            var self = this;
            var cfg = this.config;

            this.$container.on("click.qpxSelectBox", function (e) {
                if (cfg.disabled || cfg.readOnly) { return; }
                if ($(e.target).closest(".qpx-selectbox-clear").length) { return; }
                self.$input.trigger("focus");
                if (self._isOpen) { self.close(); } else { self.open(); }
            });

            this.$input.on("focus.qpxSelectBox", function () {
                if (cfg.disabled || cfg.readOnly) { return; }
                if (cfg.searchEnabled) { self.$input.val(""); self._searchText = ""; self._renderDropdownItems(); }
            });

            var searchTimer = null;
            this.$input.on("input.qpxSelectBox", function () {
                if (!cfg.searchEnabled) { return; }
                var val = this.value;
                clearTimeout(searchTimer);
                searchTimer = setTimeout(function () {
                    self._searchText = (val.length >= (cfg.minSearchLength || 0)) ? val : "";
                    self._highlightIndex = -1;
                    self._renderDropdownItems();
                    if (!self._isOpen) { self.open(); }
                }, cfg.searchTimeout);
            });

            this.$input.on("keydown.qpxSelectBox", function (e) {
                if (cfg.disabled || cfg.readOnly) { return; }
                var items = self._filteredItems();

                switch (e.key) {
                    case "ArrowDown":
                        e.preventDefault();
                        if (!self._isOpen) { self.open(); }
                        self._highlightIndex = Math.min(items.length - 1, self._highlightIndex + 1);
                        self._renderDropdownItems();
                        break;

                    case "ArrowUp":
                        e.preventDefault();
                        self._highlightIndex = Math.max(0, self._highlightIndex - 1);
                        self._renderDropdownItems();
                        break;

                    case "Enter":
                        e.preventDefault();
                        if (self._highlightIndex > -1 && items[self._highlightIndex]) {
                            self._selectItem(items[self._highlightIndex]);
                        } else if (cfg.acceptCustomValue && this.value.trim()) {
                            self._handleCustomItemCreating(this.value.trim());
                        }
                        break;

                    case "Escape":
                        e.preventDefault();
                        self._renderField();
                        self.close();
                        break;
                }
            });

            this.$arrow.on("click.qpxSelectBox", function (e) {
                e.stopPropagation();
                if (cfg.disabled || cfg.readOnly) { return; }
                if (self._isOpen) { self.close(); } else { self.$input.trigger("focus"); self.open(); }
            });

            this.$clearBtn.on("click.qpxSelectBox", function (e) {
                e.stopPropagation();
                if (cfg.disabled || cfg.readOnly) { return; }
                self.option("value", null);
            });

            $(document).on("mousedown.qpxSelectBox" + this.id, function (e) {
                if (!self._isOpen) { return; }
                if ($(e.target).closest(self.$dropdown).length || $(e.target).closest(self.$container).length) { return; }
                self._renderField();
                self.close();
            });
        },

        // ---------------------------------------------------------------
        _renderField: function () {
            var cfg = this.config;
            var item = this._itemForValue(cfg.value);
            var text = (cfg.value !== null && cfg.value !== undefined)
                ? (item !== undefined ? this._displayOf(item) : String(cfg.value))
                : "";

            this.$input.val(text).attr("placeholder", cfg.placeholder);
            this.$clearBtn.toggle(!!cfg.showClearButton && cfg.value !== null && cfg.value !== undefined && !cfg.disabled && !cfg.readOnly);
        },

        // ---------------------------------------------------------------
        // Rozbalovací seznam položek
        // ---------------------------------------------------------------
        _renderDropdownItems: function () {
            var self = this;
            var cfg = this.config;
            this.$list.empty();

            var items = this._filteredItems();

            if (!items.length) {
                this.$list.append($("<div class='qpx-selectbox-nodata'></div>").text(cfg.noDataText));
                return;
            }

            items.forEach(function (item, idx) {
                var val = self._valueOf(item);
                var selected = self._valuesEqual(val, cfg.value);

                var $row = $("<div class='qpx-popup-list-item qpx-selectbox-item'></div>")
                    .toggleClass("qpx-state-selected", selected)
                    .toggleClass("qpx-state-highlighted", idx === self._highlightIndex);

                if (qpx.isFunction(cfg.itemTemplate)) {
                    var res = cfg.itemTemplate.call(self, item, idx, $row[0]);
                    if (res !== undefined && res !== null) { $row.append(res); }
                } else {
                    $row.append($("<span class='qpx-selectbox-item-text'></span>").text(self._displayOf(item)));
                }

                $row.on("mousedown.qpxSelectBox", function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    self._selectItem(item);
                });

                self.$list.append($row);
            });
        },

        _filteredItems: function () {
            var self = this;
            var cfg = this.config;
            var text = (this._searchText || "").toLowerCase();

            return (cfg.items || []).filter(function (item) {
                if (!text) { return true; }
                return self._displayOf(item).toLowerCase().indexOf(text) !== -1;
            });
        },

        // ---------------------------------------------------------------
        // Práce s hodnotou
        // ---------------------------------------------------------------
        _valueOf: function (item) {
            if (this.config.valueExpr && this.config.valueExpr !== "this") {
                return qpx.resolve(item, this.config.valueExpr);
            }
            return item;
        },

        _displayOf: function (item) {
            if (this.config.displayExpr) {
                var v = qpx.resolve(item, this.config.displayExpr);
                return (v === undefined || v === null) ? "" : String(v);
            }
            if (qpx.isObject(item)) { return item.text !== undefined ? String(item.text) : JSON.stringify(item); }
            return String(item);
        },

        _itemForValue: function (val) {
            var self = this;
            return (this.config.items || []).filter(function (it) { return self._valuesEqual(self._valueOf(it), val); })[0];
        },

        _valuesEqual: function (a, b) { return a === b; },

        _selectItem: function (item) {
            var val = this._valueOf(item);
            this.option("value", val);
            this.trigger("selectionChanged", { selectedItem: item, component: this });
            this.close();
            this.$input.trigger("focus");
        },

        _handleCustomItemCreating: function (text) {
            var cfg = this.config;
            if (!text) { return; }

            var createdItem;
            if (qpx.isFunction(cfg.onCustomItemCreating)) {
                var args = { text: text, component: this, customItem: undefined };
                var ret = cfg.onCustomItemCreating(args);
                createdItem = (args.customItem !== undefined) ? args.customItem : ret;
            }
            if (createdItem === undefined || createdItem === null) {
                if (!cfg.acceptCustomValue) { return; }
                createdItem = text;
            }

            if (cfg.items.indexOf(createdItem) === -1) { cfg.items.push(createdItem); }
            this._selectItem(createdItem);
        },

        // ---------------------------------------------------------------
        // Popup otevřít/zavřít
        // ---------------------------------------------------------------
        open: function () {
            if (this.config.disabled || this.config.readOnly || this._isOpen) { return this; }
            if (openInstance && openInstance !== this) { openInstance.close(); }

            this._renderDropdownItems();

            var off = this.$container.offset();
            this.$dropdown.css({
                top: off.top + this.$container.outerHeight(),
                left: off.left,
                minWidth: this.$container.outerWidth()
            }).show();

            this._isOpen = true;
            this.$container.attr("aria-expanded", "true");
            openInstance = this;
            this.trigger("opened", { component: this });
            return this;
        },

        close: function () {
            if (!this._isOpen) { return this; }
            this.$dropdown.hide();
            this._isOpen = false;
            this._highlightIndex = -1;
            this.$container.attr("aria-expanded", "false");
            if (openInstance === this) { openInstance = null; }
            this.trigger("closed", { component: this });
            return this;
        },

        // ---------------------------------------------------------------
        // Veřejné API
        // ---------------------------------------------------------------
        value: function (val) {
            if (arguments.length === 0) { return this.config.value; }
            return this.option("value", val);
        },

        getSelectedItem: function () { return this._itemForValue(this.config.value); },
        getDataSource: function () { return this.config.items; },
        reset: function () { return this.option("value", null); },
        focus: function () { this.$input.trigger("focus"); return this; },
        enable: function () { return this.option("disabled", false); },
        disable: function () { return this.option("disabled", true); },

        option: function (name, value) {
            if (arguments.length === 0) { return this.config; }
            if (qpx.isObject(name)) {
                var self = this;
                $.each(name, function (k, v) { self.option(k, v); });
                return this;
            }
            if (arguments.length === 1) { return this.config[name]; }

            var prev = this.config[name];
            if (prev === value) { return this; }
            this.config[name] = value;

            switch (name) {
                case "value": {
                    this._renderField();
                    this.trigger("valueChanged", { value: value, previousValue: prev, component: this, element: this.getNode() });
                    break;
                }

                case "items":
                case "dataSource":
                    this.config.items = value || [];
                    this._renderField();
                    if (this._isOpen) { this._renderDropdownItems(); }
                    break;

                case "disabled":
                    this.$container.toggleClass("qpx-state-disabled", !!value);
                    this.$input.prop("disabled", !!value);
                    if (value) { this.close(); }
                    this._renderField();
                    break;

                case "readOnly":
                    this.$container.toggleClass("qpx-state-readonly", !!value);
                    this.$input.prop("readOnly", !!value || !this.config.searchEnabled);
                    if (value) { this.close(); }
                    this._renderField();
                    break;

                case "visible":
                    this.$container.toggleClass("qpx-hidden", !value);
                    break;

                case "stylingMode":
                    this.$container.removeClass("qpx-selectbox-mode-" + prev).addClass("qpx-selectbox-mode-" + value);
                    break;

                case "searchEnabled":
                    this.$input.prop("readOnly", !value || !!this.config.readOnly);
                    break;

                case "placeholder":
                case "showClearButton":
                    this._renderField();
                    break;

                case "noDataText":
                    if (this._isOpen) { this._renderDropdownItems(); }
                    break;
            }

            this.trigger("optionChanged", { name: name, value: value, previousValue: prev, component: this });
            return this;
        },

        destroy: function () {
            this.$container.off(".qpxSelectBox");
            if (this.$input) { this.$input.off(".qpxSelectBox"); }
            $(document).off(".qpxSelectBox" + this.id);
            if (this.$dropdown) { this.$dropdown.remove(); }
            if (openInstance === this) { openInstance = null; }
            this._super();
        }
    });

    qpx.registerWidget("qpSelectBox", SelectBox);
    qpx.qpSelectBox = SelectBox;

})(window.qpx, jQuery);

/*!
 * qpx - qpDropDownBox
 * Pole zobrazující aktuální hodnotu (přes displayExpr/dataSource), po
 * kliknutí rozbalí POPUP S LIBOVOLNÝM VLASTNÍM OBSAHEM (contentTemplate)
 * — např. qpTreeView, qpDataGrid nebo jinou kombinaci qpx komponent.
 * Koncepčně i vzhledově co nejblíže DevExtreme dxDropDownBox.
 *
 * Narozdíl od qpSelectBox/qpLookup si qpDropDownBox sám nespravuje
 * seznam položek — jen poskytuje "rám" (pole + popup) a řízení hodnoty;
 * o samotný výběr uvnitř popupu se stará obsah vložený přes contentTemplate,
 * který dostane odkaz na komponentu (component.option("value", ...), component.close()).
 *
 * options:
 *   items / dataSource, valueExpr, displayExpr, value,
 *   contentTemplate(e, contentElement), deferRendering,
 *   placeholder, showClearButton, stylingMode ("outlined"|"filled"|"underlined"),
 *   disabled, readOnly, visible, dropDownOptions
 *
 * events:
 *   onInitialized, onContentReady, onValueChanged,
 *   onOpened, onClosed, onOptionChanged, onDisposing
 *
 * methods:
 *   option(name[, value]), value([val]), open(), close(),
 *   content(), reset(), focus(), enable(), disable(), destroy()
 */
(function (qpx, $) {
    "use strict";

    var openInstance = null; // aktuálně otevřená instance (jen jedna najednou)

    var DropDownBox = qpx.Widget.extend({

        defaults: {
            dataSource: null,
            items: [],
            valueExpr: null,
            displayExpr: null,

            value: null,

            contentTemplate: null, // function(e:{component, value}, contentElement)
            deferRendering: true,  // true = obsah popupu se vykreslí až při prvním otevření

            placeholder: "Vyberte...",
            showClearButton: false,
            stylingMode: "outlined",  // outlined | filled | underlined

            disabled: false,
            readOnly: false,
            visible: true,

            dropDownOptions: {}, // { width, height, maxHeight }

            onValueChanged: null,
            onOpened: null,
            onClosed: null,
            onOptionChanged: null,
            onInitialized: null,
            onContentReady: null,
            onDisposing: null
        },

        // ---------------------------------------------------------------
        render: function () {
            var cfg = this.config;
            var self = this;

            cfg.items = (cfg.items && cfg.items.length) ? cfg.items : (cfg.dataSource || []);

            this.$container
                .addClass("qpx-dropdownbox")
                .addClass("qpx-dropdownbox-mode-" + cfg.stylingMode)
                .toggleClass("qpx-hidden", !cfg.visible)
                .toggleClass("qpx-state-disabled", !!cfg.disabled)
                .toggleClass("qpx-state-readonly", !!cfg.readOnly)
                .attr("role", "combobox")
                .attr("aria-expanded", "false");

            if (cfg.onInitialized) { this.on("ready", cfg.onInitialized); }
            if (cfg.onContentReady) { this.on("contentReady", cfg.onContentReady); }
            if (cfg.onValueChanged) { this.on("valueChanged", cfg.onValueChanged); }
            if (cfg.onOpened) { this.on("opened", cfg.onOpened); }
            if (cfg.onClosed) { this.on("closed", cfg.onClosed); }
            if (cfg.onOptionChanged) { this.on("optionChanged", cfg.onOptionChanged); }
            if (cfg.onDisposing) { this.on("destroy", cfg.onDisposing); }

            this._isOpen = false;
            this._contentRendered = false;

            this._buildDom();
            this._bindEvents();

            if (!cfg.deferRendering) { this._ensureContent(); }

            setTimeout(function () { self.trigger("contentReady", { component: self }); }, 0);
        },

        // ---------------------------------------------------------------
        // DOM
        // ---------------------------------------------------------------
        _buildDom: function () {
            var cfg = this.config;
            this.$container.empty();

            this.$input = $("<input type='text' class='qpx-dropdownbox-input' autocomplete='off' readonly>")
                .prop("disabled", !!cfg.disabled);

            this.$clearBtn = $("<span class='qpx-dropdownbox-clear' tabindex='-1' title='Vymazat výběr'>✕</span>").hide();
            this.$arrow = $("<span class='qpx-dropdownbox-arrow'>▾</span>");

            this.$container.append(this.$input, this.$clearBtn, this.$arrow);

            this.$dropdown = $("<div class='qpx-popup-surface qpx-dropdownbox-popup'></div>").appendTo(document.body).hide();
            this.$content = $("<div class='qpx-dropdownbox-content'></div>");
            this.$dropdown.append(this.$content);

            if (cfg.dropDownOptions && cfg.dropDownOptions.width) { this.$dropdown.css("width", qpx.toPx(cfg.dropDownOptions.width)); }
            if (cfg.dropDownOptions && cfg.dropDownOptions.height) { this.$content.css("height", qpx.toPx(cfg.dropDownOptions.height)); }
            if (cfg.dropDownOptions && cfg.dropDownOptions.maxHeight) { this.$content.css("max-height", qpx.toPx(cfg.dropDownOptions.maxHeight)); }

            this._renderField();
        },

        _bindEvents: function () {
            var self = this;
            var cfg = this.config;

            this.$container.on("click.qpxDropDownBox", function (e) {
                if (cfg.disabled || cfg.readOnly) { return; }
                if ($(e.target).closest(".qpx-dropdownbox-clear").length) { return; }
                if (self._isOpen) { self.close(); } else { self.open(); }
            });

            this.$clearBtn.on("click.qpxDropDownBox", function (e) {
                e.stopPropagation();
                if (cfg.disabled || cfg.readOnly) { return; }
                self.option("value", null);
            });

            $(document).on("mousedown.qpxDropDownBox" + this.id, function (e) {
                if (!self._isOpen) { return; }
                if ($(e.target).closest(self.$dropdown).length || $(e.target).closest(self.$container).length) { return; }
                self.close();
            });

            $(document).on("keydown.qpxDropDownBox" + this.id, function (e) {
                if (self._isOpen && e.key === "Escape") { self.close(); }
            });
        },

        _renderField: function () {
            var cfg = this.config;
            this.$input.val(this._resolveDisplayText()).attr("placeholder", cfg.placeholder);
            this.$clearBtn.toggle(!!cfg.showClearButton && cfg.value !== null && cfg.value !== undefined && !cfg.disabled && !cfg.readOnly);
        },

        _resolveDisplayText: function () {
            var cfg = this.config;
            if (cfg.value === null || cfg.value === undefined || cfg.value === "") { return ""; }

            if (cfg.displayExpr || cfg.valueExpr) {
                var self = this;
                var item = (cfg.items || []).filter(function (it) {
                    var v = cfg.valueExpr ? qpx.resolve(it, cfg.valueExpr) : it;
                    return v === cfg.value;
                })[0];
                if (item !== undefined) {
                    if (cfg.displayExpr) {
                        var d = qpx.resolve(item, cfg.displayExpr);
                        return (d === undefined || d === null) ? "" : String(d);
                    }
                    return qpx.isObject(item) ? JSON.stringify(item) : String(item);
                }
            }
            return String(cfg.value);
        },

        // ---------------------------------------------------------------
        // Obsah popupu
        // ---------------------------------------------------------------
        _ensureContent: function () {
            var cfg = this.config;
            if (this._contentRendered) { return; }
            this._contentRendered = true;

            this.$content.empty();
            if (qpx.isFunction(cfg.contentTemplate)) {
                var res = cfg.contentTemplate.call(this, { component: this, value: cfg.value }, this.$content[0]);
                if (res !== undefined && res !== null) { this.$content.append(res); }
            } else {
                this.$content.append($("<div class='qpx-dropdownbox-nocontent'></div>").text("contentTemplate není nastaven."));
            }
        },

        content: function () { return this.$content; },

        // ---------------------------------------------------------------
        // Popup otevřít/zavřít
        // ---------------------------------------------------------------
        open: function () {
            if (this.config.disabled || this.config.readOnly || this._isOpen) { return this; }
            if (openInstance && openInstance !== this) { openInstance.close(); }

            this._ensureContent();

            var off = this.$container.offset();
            this.$dropdown.css({
                top: off.top + this.$container.outerHeight(),
                left: off.left,
                minWidth: this.$container.outerWidth()
            }).show();

            this._isOpen = true;
            this.$container.attr("aria-expanded", "true");
            openInstance = this;
            this.trigger("opened", { component: this });
            return this;
        },

        close: function () {
            if (!this._isOpen) { return this; }
            this.$dropdown.hide();
            this._isOpen = false;
            this.$container.attr("aria-expanded", "false");
            if (openInstance === this) { openInstance = null; }
            this.trigger("closed", { component: this });
            return this;
        },

        // ---------------------------------------------------------------
        // Veřejné API
        // ---------------------------------------------------------------
        value: function (val) {
            if (arguments.length === 0) { return this.config.value; }
            return this.option("value", val);
        },

        getDataSource: function () { return this.config.items; },
        reset: function () { return this.option("value", null); },
        focus: function () { this.$input.trigger("focus"); return this; },
        enable: function () { return this.option("disabled", false); },
        disable: function () { return this.option("disabled", true); },

        option: function (name, value) {
            if (arguments.length === 0) { return this.config; }
            if (qpx.isObject(name)) {
                var self = this;
                $.each(name, function (k, v) { self.option(k, v); });
                return this;
            }
            if (arguments.length === 1) { return this.config[name]; }

            var prev = this.config[name];
            if (prev === value) { return this; }
            this.config[name] = value;

            switch (name) {
                case "value":
                    this._renderField();
                    this.trigger("valueChanged", { value: value, previousValue: prev, component: this, element: this.getNode() });
                    break;

                case "items":
                case "dataSource":
                    this.config.items = value || [];
                    this._renderField();
                    break;

                case "disabled":
                    this.$container.toggleClass("qpx-state-disabled", !!value);
                    this.$input.prop("disabled", !!value);
                    if (value) { this.close(); }
                    this._renderField();
                    break;

                case "readOnly":
                    this.$container.toggleClass("qpx-state-readonly", !!value);
                    if (value) { this.close(); }
                    break;

                case "visible":
                    this.$container.toggleClass("qpx-hidden", !value);
                    break;

                case "stylingMode":
                    this.$container.removeClass("qpx-dropdownbox-mode-" + prev).addClass("qpx-dropdownbox-mode-" + value);
                    break;

                case "placeholder":
                case "showClearButton":
                    this._renderField();
                    break;

                case "contentTemplate":
                    this._contentRendered = false;
                    if (this._isOpen) { this._ensureContent(); }
                    break;
            }

            this.trigger("optionChanged", { name: name, value: value, previousValue: prev, component: this });
            return this;
        },

        destroy: function () {
            this.$container.off(".qpxDropDownBox");
            $(document).off(".qpxDropDownBox" + this.id);
            if (this.$dropdown) { this.$dropdown.remove(); }
            if (openInstance === this) { openInstance = null; }
            this._super();
        }
    });

    qpx.registerWidget("qpDropDownBox", DropDownBox);
    qpx.qpDropDownBox = DropDownBox;

})(window.qpx, jQuery);

/*!
 * qpx - qpLookup
 * Výběr jedné položky ze seznamu, koncepčně i vzhledově co nejblíže
 * DevExtreme dxLookup. Na rozdíl od qpSelectBox se nabídka neotvírá
 * jako úzký dropdown pod polem, ale jako VYSTŘEDĚNÝ POPUP s titulkem,
 * vlastním vyhledávacím polem v hlavičce a (volitelně) tlačítky
 * Hotovo/Zrušit dole (applyValueMode: "useButtons").
 *
 * options:
 *   items / dataSource, valueExpr, displayExpr, value,
 *   placeholder, title, searchEnabled, searchTimeout, minSearchLength,
 *   searchPlaceholder, noDataText, applyValueMode ("instantly"|"useButtons"),
 *   cancelText, doneText, showClearButton,
 *   stylingMode ("outlined"|"filled"|"underlined"),
 *   disabled, readOnly, visible, itemTemplate, dropDownOptions
 *
 * events:
 *   onInitialized, onContentReady, onValueChanged, onSelectionChanged,
 *   onOpened, onClosed, onOptionChanged, onDisposing
 *
 * methods:
 *   option(name[, value]), value([val]), open(), close(),
 *   getSelectedItem(), getDataSource(), reset(), focus(),
 *   enable(), disable(), destroy()
 */
(function (qpx, $) {
    "use strict";

    var openInstance = null; // aktuálně otevřená instance (jen jedna najednou)

    var Lookup = qpx.Widget.extend({

        defaults: {
            dataSource: null,
            items: [],
            valueExpr: null,
            displayExpr: null,

            value: null,

            placeholder: "Vyberte...",
            title: "Vyberte položku",

            searchEnabled: true,
            searchTimeout: 200,
            minSearchLength: 0,
            searchPlaceholder: "Hledat...",
            noDataText: "Žádné položky",

            applyValueMode: "instantly", // instantly | useButtons
            cancelText: "Zrušit",
            doneText: "Hotovo",

            showClearButton: false,
            stylingMode: "outlined",  // outlined | filled | underlined

            disabled: false,
            readOnly: false,
            visible: true,

            itemTemplate: null,  // function(itemData, itemIndex, itemElement)
            dropDownOptions: {}, // { width, height }

            onValueChanged: null,
            onSelectionChanged: null,
            onOpened: null,
            onClosed: null,
            onOptionChanged: null,
            onInitialized: null,
            onContentReady: null,
            onDisposing: null
        },

        // ---------------------------------------------------------------
        render: function () {
            var cfg = this.config;
            var self = this;

            cfg.items = (cfg.items && cfg.items.length) ? cfg.items : (cfg.dataSource || []);

            this.$container
                .addClass("qpx-lookup")
                .addClass("qpx-lookup-mode-" + cfg.stylingMode)
                .toggleClass("qpx-hidden", !cfg.visible)
                .toggleClass("qpx-state-disabled", !!cfg.disabled)
                .toggleClass("qpx-state-readonly", !!cfg.readOnly)
                .attr("role", "button")
                .attr("aria-expanded", "false");

            if (cfg.onInitialized) { this.on("ready", cfg.onInitialized); }
            if (cfg.onContentReady) { this.on("contentReady", cfg.onContentReady); }
            if (cfg.onValueChanged) { this.on("valueChanged", cfg.onValueChanged); }
            if (cfg.onSelectionChanged) { this.on("selectionChanged", cfg.onSelectionChanged); }
            if (cfg.onOpened) { this.on("opened", cfg.onOpened); }
            if (cfg.onClosed) { this.on("closed", cfg.onClosed); }
            if (cfg.onOptionChanged) { this.on("optionChanged", cfg.onOptionChanged); }
            if (cfg.onDisposing) { this.on("destroy", cfg.onDisposing); }

            this._isOpen = false;
            this._searchText = "";
            this._highlightIndex = -1;
            this._pendingValue = cfg.value; // rozpracovaný výběr v režimu "useButtons"

            this._buildDom();
            this._bindEvents();

            setTimeout(function () { self.trigger("contentReady", { component: self }); }, 0);
        },

        // ---------------------------------------------------------------
        // DOM — pole v řádku stránky
        // ---------------------------------------------------------------
        _buildDom: function () {
            var cfg = this.config;
            this.$container.empty();

            this.$input = $("<input type='text' class='qpx-lookup-input' readonly autocomplete='off'>")
                .prop("disabled", !!cfg.disabled);

            this.$clearBtn = $("<span class='qpx-lookup-clear' tabindex='-1' title='Vymazat výběr'>✕</span>").hide();
            this.$arrow = $("<span class='qpx-lookup-arrow'>▾</span>");

            this.$container.append(this.$input, this.$clearBtn, this.$arrow);

            this._buildPopup();
            this._renderField();
        },

        // DOM — vystředěný popup (overlay + hlavička s titulkem/hledáním + seznam + patička)
        _buildPopup: function () {
            var cfg = this.config;

            this.$overlay = $("<div class='qpx-lookup-overlay'></div>").appendTo(document.body).hide();
            this.$popup = $("<div class='qpx-popup-surface qpx-lookup-popup'></div>").appendTo(this.$overlay);

            if (cfg.dropDownOptions && cfg.dropDownOptions.width) { this.$popup.css("width", qpx.toPx(cfg.dropDownOptions.width)); }
            if (cfg.dropDownOptions && cfg.dropDownOptions.height) { this.$popup.css("height", qpx.toPx(cfg.dropDownOptions.height)); }

            this.$header = $("<div class='qpx-lookup-header'></div>");
            this.$title = $("<div class='qpx-lookup-title'></div>").text(cfg.title);
            this.$closeIcon = $("<span class='qpx-lookup-close' title='Zavřít'>✕</span>");
            this.$header.append(this.$title, this.$closeIcon);

            this.$searchWrap = $("<div class='qpx-lookup-search-wrap'></div>");
            this.$searchInput = $("<input type='text' class='qpx-lookup-search' autocomplete='off'>")
                .attr("placeholder", cfg.searchPlaceholder);
            this.$searchWrap.append(this.$searchInput);

            this.$list = $("<div class='qpx-lookup-list'></div>");

            this.$footer = $("<div class='qpx-lookup-footer'></div>");
            this.$cancelBtn = $("<button type='button' class='qpx-lookup-btn qpx-lookup-btn-cancel'></button>").text(cfg.cancelText);
            this.$doneBtn = $("<button type='button' class='qpx-lookup-btn qpx-lookup-btn-done'></button>").text(cfg.doneText);
            this.$footer.append(this.$cancelBtn, this.$doneBtn);

            this.$popup.append(this.$header, this.$searchWrap, this.$list, this.$footer);

            this.$searchWrap.toggle(!!cfg.searchEnabled);
            this.$footer.toggle(cfg.applyValueMode === "useButtons");
        },

        _bindEvents: function () {
            var self = this;
            var cfg = this.config;

            this.$container.on("click.qpxLookup", function (e) {
                if (cfg.disabled || cfg.readOnly) { return; }
                if ($(e.target).closest(".qpx-lookup-clear").length) { return; }
                self.open();
            });

            this.$clearBtn.on("click.qpxLookup", function (e) {
                e.stopPropagation();
                if (cfg.disabled || cfg.readOnly) { return; }
                self.option("value", null);
            });

            var searchTimer = null;
            this.$searchInput.on("input.qpxLookup", function () {
                var val = this.value;
                clearTimeout(searchTimer);
                searchTimer = setTimeout(function () {
                    self._searchText = (val.length >= (cfg.minSearchLength || 0)) ? val : "";
                    self._highlightIndex = -1;
                    self._renderList();
                }, cfg.searchTimeout);
            });

            this.$searchInput.on("keydown.qpxLookup", function (e) {
                if (e.key === "Escape") { self.close(); }
            });

            this.$closeIcon.on("click.qpxLookup", function () { self.close(); });

            this.$overlay.on("mousedown.qpxLookup", function (e) {
                if ($(e.target).is(self.$overlay)) { self.close(); }
            });

            this.$cancelBtn.on("click.qpxLookup", function () {
                self._pendingValue = self.config.value;
                self.close();
            });

            this.$doneBtn.on("click.qpxLookup", function () {
                self.option("value", self._pendingValue);
                self.close();
            });

            $(document).on("keydown.qpxLookup" + this.id, function (e) {
                if (self._isOpen && e.key === "Escape") { self.close(); }
            });
        },

        _renderField: function () {
            var cfg = this.config;
            var item = this._itemForValue(cfg.value);
            var text = (cfg.value !== null && cfg.value !== undefined)
                ? (item !== undefined ? this._displayOf(item) : String(cfg.value))
                : "";

            this.$input.val(text).attr("placeholder", cfg.placeholder);
            this.$clearBtn.toggle(!!cfg.showClearButton && cfg.value !== null && cfg.value !== undefined && !cfg.disabled && !cfg.readOnly);
        },

        // ---------------------------------------------------------------
        // Seznam položek v popupu
        // ---------------------------------------------------------------
        _renderList: function () {
            var self = this;
            var cfg = this.config;
            this.$list.empty();

            var items = this._filteredItems();
            var activeValue = (cfg.applyValueMode === "useButtons") ? this._pendingValue : cfg.value;

            if (!items.length) {
                this.$list.append($("<div class='qpx-lookup-nodata'></div>").text(cfg.noDataText));
                return;
            }

            items.forEach(function (item, idx) {
                var val = self._valueOf(item);
                var selected = val === activeValue;

                var $row = $("<div class='qpx-popup-list-item qpx-lookup-item'></div>")
                    .toggleClass("qpx-state-selected", selected)
                    .toggleClass("qpx-state-highlighted", idx === self._highlightIndex);

                if (qpx.isFunction(cfg.itemTemplate)) {
                    var res = cfg.itemTemplate.call(self, item, idx, $row[0]);
                    if (res !== undefined && res !== null) { $row.append(res); }
                } else {
                    $row.append($("<span class='qpx-lookup-item-text'></span>").text(self._displayOf(item)));
                }

                $row.on("click.qpxLookup", function () { self._chooseItem(item); });

                self.$list.append($row);
            });
        },

        _filteredItems: function () {
            var self = this;
            var cfg = this.config;
            var text = (this._searchText || "").toLowerCase();

            return (cfg.items || []).filter(function (item) {
                if (!text) { return true; }
                return self._displayOf(item).toLowerCase().indexOf(text) !== -1;
            });
        },

        // ---------------------------------------------------------------
        // Práce s hodnotou
        // ---------------------------------------------------------------
        _valueOf: function (item) {
            if (this.config.valueExpr && this.config.valueExpr !== "this") {
                return qpx.resolve(item, this.config.valueExpr);
            }
            return item;
        },

        _displayOf: function (item) {
            if (this.config.displayExpr) {
                var v = qpx.resolve(item, this.config.displayExpr);
                return (v === undefined || v === null) ? "" : String(v);
            }
            if (qpx.isObject(item)) { return item.text !== undefined ? String(item.text) : JSON.stringify(item); }
            return String(item);
        },

        _itemForValue: function (val) {
            var self = this;
            return (this.config.items || []).filter(function (it) { return self._valueOf(it) === val; })[0];
        },

        _chooseItem: function (item) {
            var val = this._valueOf(item);
            var cfg = this.config;

            if (cfg.applyValueMode === "useButtons") {
                this._pendingValue = val;
                this.trigger("selectionChanged", { selectedItem: item, component: this });
                this._renderList();
            } else {
                this.option("value", val);
                this.trigger("selectionChanged", { selectedItem: item, component: this });
                this.close();
            }
        },

        // ---------------------------------------------------------------
        // Popup otevřít/zavřít
        // ---------------------------------------------------------------
        open: function () {
            if (this.config.disabled || this.config.readOnly || this._isOpen) { return this; }
            if (openInstance && openInstance !== this) { openInstance.close(); }

            this._pendingValue = this.config.value;
            this._searchText = "";
            this.$searchInput.val("");
            this._renderList();

            this.$overlay.show();
            this._isOpen = true;
            this.$container.attr("aria-expanded", "true");
            openInstance = this;

            if (this.config.searchEnabled) { this.$searchInput.trigger("focus"); }

            this.trigger("opened", { component: this });
            return this;
        },

        close: function () {
            if (!this._isOpen) { return this; }
            this.$overlay.hide();
            this._isOpen = false;
            this._highlightIndex = -1;
            this.$container.attr("aria-expanded", "false");
            if (openInstance === this) { openInstance = null; }
            this.trigger("closed", { component: this });
            return this;
        },

        // ---------------------------------------------------------------
        // Veřejné API
        // ---------------------------------------------------------------
        value: function (val) {
            if (arguments.length === 0) { return this.config.value; }
            return this.option("value", val);
        },

        getSelectedItem: function () { return this._itemForValue(this.config.value); },
        getDataSource: function () { return this.config.items; },
        reset: function () { return this.option("value", null); },
        focus: function () { this.$input.trigger("focus"); return this; },
        enable: function () { return this.option("disabled", false); },
        disable: function () { return this.option("disabled", true); },

        option: function (name, value) {
            if (arguments.length === 0) { return this.config; }
            if (qpx.isObject(name)) {
                var self = this;
                $.each(name, function (k, v) { self.option(k, v); });
                return this;
            }
            if (arguments.length === 1) { return this.config[name]; }

            var prev = this.config[name];
            if (prev === value) { return this; }
            this.config[name] = value;

            switch (name) {
                case "value":
                    this._pendingValue = value;
                    this._renderField();
                    this.trigger("valueChanged", { value: value, previousValue: prev, component: this, element: this.getNode() });
                    break;

                case "items":
                case "dataSource":
                    this.config.items = value || [];
                    this._renderField();
                    if (this._isOpen) { this._renderList(); }
                    break;

                case "disabled":
                    this.$container.toggleClass("qpx-state-disabled", !!value);
                    this.$input.prop("disabled", !!value);
                    if (value) { this.close(); }
                    this._renderField();
                    break;

                case "readOnly":
                    this.$container.toggleClass("qpx-state-readonly", !!value);
                    if (value) { this.close(); }
                    break;

                case "visible":
                    this.$container.toggleClass("qpx-hidden", !value);
                    break;

                case "stylingMode":
                    this.$container.removeClass("qpx-lookup-mode-" + prev).addClass("qpx-lookup-mode-" + value);
                    break;

                case "placeholder":
                case "showClearButton":
                    this._renderField();
                    break;

                case "title":
                    this.$title.text(value);
                    break;

                case "searchEnabled":
                    this.$searchWrap.toggle(!!value);
                    break;

                case "searchPlaceholder":
                    this.$searchInput.attr("placeholder", value);
                    break;

                case "applyValueMode":
                    this.$footer.toggle(value === "useButtons");
                    break;

                case "cancelText":
                    this.$cancelBtn.text(value);
                    break;

                case "doneText":
                    this.$doneBtn.text(value);
                    break;

                case "noDataText":
                    if (this._isOpen) { this._renderList(); }
                    break;
            }

            this.trigger("optionChanged", { name: name, value: value, previousValue: prev, component: this });
            return this;
        },

        destroy: function () {
            this.$container.off(".qpxLookup");
            $(document).off(".qpxLookup" + this.id);
            if (this.$overlay) { this.$overlay.remove(); }
            if (openInstance === this) { openInstance = null; }
            this._super();
        }
    });

    qpx.registerWidget("qpLookup", Lookup);
    qpx.qpLookup = Lookup;

})(window.qpx, jQuery);

/*!
 * qpx - qpToolBar (refactored)
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
 * onOptionChanged, layoutChanged.
 */
(function (qpx, $) {
    "use strict";

    var Toolbar = qpx.Widget.extend({

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
                .toggleClass("qpx-state-disabled", !!cfg.disabled)
                .attr("role", "toolbar");

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

            this.$menu = $("<div class='qpx-toolbar-menu qpx-popup-list' role='menu'></div>")
                .appendTo(document.body)
                .hide();

            this._itemRefs = [];
            this._menuRefs = [];
            this._isMenuOpen = false;
            this._layoutRaf = null;
            this._resizeObserver = null;
            this._onWinResize = null;

            this._buildItems();
            this._bindOverflowMenu();
            this._bindResize();

            // první rozložení až po zavěšení do DOM (kvůli měření šířky)
            var self2 = this;
            setTimeout(function () { self2._doRelayout(); }, 0);
        },

        // -------------------------------------------------------------
        // Vytvoření položek
        // -------------------------------------------------------------
        _buildItems: function () {
            var self = this;
            this._itemRefs = [];
            (this.config.items || []).forEach(function (itemCfg, index) {
                self._itemRefs.push(self._createItemRef(itemCfg, index));
            });
            this._applyPositions();
        },

        _createItemRef: function (itemCfg, index) {
            var self = this;

            itemCfg = itemCfg || {};
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

            var widget = qpx.ui(options, $cell);

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
            var raf = window.requestAnimationFrame || window.setTimeout;
            this._layoutRaf = raf(function () {
                self._layoutRaf = null;
                self._doRelayout();
            });
        },

        _doRelayout: function () {
            var self = this;
            if (!this.$content || !this.$content.length) { return; }

            // reset menu refs podle locateInMenu === "always"
            this._menuRefs = [];
            this._itemRefs.forEach(function (ref) {
                ref.inMenu = (ref.config.locateInMenu === "always" && ref.config.visible !== false);
                if (ref.inMenu) { self._menuRefs.push(ref); }
            });

            this._applyPositions();

            // kandidáti na přesun do menu (auto)
            var candidates = this._itemRefs.filter(function (r) {
                return r.config.visible !== false &&
                    r.config.locateInMenu !== "never" &&
                    r.config.locateInMenu !== "always";
            }).slice().reverse(); // od konce (napravo), jako v Chrome DevTools

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
            // malá tolerance kvůli zaokrouhlování
            return el.scrollWidth - 1 > el.clientWidth;
        },

        _applyPositions: function () {
            var self = this;

            // Nepoužívat empty(), protože maže DOM widgetů a ruší události.
            // detach() zachová DOM i události.
            this.$before.children().detach();
            this.$center.children().detach();
            this.$after.children().detach();
            this.$menu.children().detach();

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

            this.$overflowBtn.on("keydown.qpxToolbar", function (e) {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    self._isMenuOpen ? self._closeMenu() : self._openMenu();
                }
            });

            $(document).on("mousedown.qpxToolbar" + this.id, function (e) {
                if (!self._isMenuOpen) { return; }
                if ($(e.target).closest(self.$menu).length || $(e.target).closest(self.$overflowBtn).length) { return; }
                self._closeMenu();
            });
        },

        _openMenu: function () {
            if (!this._menuRefs.length) { return; }

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
            if (qpx.isObject(name)) {
                var self = this;
                $.each(name, function (k, v) { self.option(k, v); });
                return this;
            }
            if (arguments.length === 1) { return this.config[name]; }

            var prev = this.config[name];
            if (prev === value) { return this; }
            this.config[name] = value;

            if (name === "items") {
                // zničit staré widgety
                this._itemRefs.forEach(function (ref) {
                    if (ref.widget && ref.widget.destroy) { ref.widget.destroy(); }
                    if (ref.$cell) { ref.$cell.remove(); }
                });
                this._itemRefs = [];
                this._menuRefs = [];
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

        repaint: function () {
            this._doRelayout();
            return this;
        },

        destroy: function () {
            // odpojení resize observer / handlerů
            if (this._resizeObserver) {
                this._resizeObserver.disconnect();
                this._resizeObserver = null;
            }
            $(window).off(".qpxToolbar" + this.id);
            $(document).off(".qpxToolbar" + this.id);

            if (this._layoutRaf && window.cancelAnimationFrame) {
                window.cancelAnimationFrame(this._layoutRaf);
            }
            this._layoutRaf = null;

            // zničit vnitřní widgety
            this._itemRefs.forEach(function (ref) {
                if (ref.widget && ref.widget.destroy) { ref.widget.destroy(); }
                if (ref.$cell) { ref.$cell.remove(); }
            });
            this._itemRefs = [];
            this._menuRefs = [];

            if (this.$menu) { this.$menu.remove(); }

            this._super();
        }
    });

    qpx.registerWidget("qpToolBar", Toolbar);
    qpx.qpToolBar = Toolbar;

})(window.qpx, jQuery);

/*!
 * qpx - qpTabView
 * Panel se záložkami koncipovaný podobně jako DevExtreme dxTabPanel:
 *  - "items" = pole záložek, každá má title/icon a obsah panelu
 *  - obsah panelu lze zadat jako template (string/funkce), html/text,
 *    nebo jako vnořenou qpx konfiguraci (view / rows / cols) - stejně
 *    jako u qpToolBar, takže lze skládat plné qpx widgety.
 *  - vizuálně i chováním se blíží dxTabPanel: posuvný indikátor pod
 *    aktivní záložkou, tlačítka pro scroll při přetečení, klávesová
 *    navigace (šipky/Home/End) podle WAI-ARIA "tabs" patternu,
 *    volitelný swipe na dotykových zařízeních, deferRendering apod.
 *
 * Options (nejbližší ekvivalent k dxTabPanel):
 *   items, dataSource, selectedIndex, selectedItem,
 *   tabsPosition: "top"|"bottom"|"left"|"right",
 *   stylingMode:  "primary" (podtržený indikátor) | "secondary" (vyplněné "pilulky"),
 *   iconPosition: "start"|"end"|"top"|"bottom",
 *   animationEnabled, swipeEnabled, deferRendering, repaintChangesOnly,
 *   showNavButtons, scrollingEnabled, loop, rtlEnabled,
 *   disabled, visible, focusStateEnabled, hoverStateEnabled,
 *   itemHoldTimeout, itemTemplate, itemTitleTemplate,
 *   width, height (řeší už qpx.Widget)
 *
 * Events:
 *   onInitialized, onContentReady, onSelectionChanged,
 *   onItemClick, onTitleClick, onItemHold, onItemContextMenu,
 *   onItemRendered, onOptionChanged, onDisposing
 *
 * Methods:
 *   option(name[, value]), selectItem(indexOrItem),
 *   getSelectedIndex(), getSelectedItem(),
 *   getItemElement(index), getTabElement(index),
 *   repaint(), destroy()
 */
(function (qpx, $) {
    "use strict";

    var TabView = qpx.Widget.extend({

        defaults: {
            items: [],
            dataSource: null,
            selectedIndex: 0,
            selectedItem: null,

            tabsPosition: "top",     // top | bottom | left | right
            stylingMode: "primary",  // primary | secondary
            iconPosition: "start",   // start | end | top | bottom

            animationEnabled: true,
            swipeEnabled: true,
            deferRendering: true,
            repaintChangesOnly: false,

            showNavButtons: false,
            scrollingEnabled: true,
            loop: false,
            rtlEnabled: false,

            disabled: false,
            visible: true,
            focusStateEnabled: true,
            hoverStateEnabled: true,

            itemHoldTimeout: 750,
            itemTemplate: null,
            itemTitleTemplate: null,

            onInitialized: null,
            onContentReady: null,
            onSelectionChanged: null,
            onItemClick: null,
            onTitleClick: null,
            onItemHold: null,
            onItemContextMenu: null,
            onItemRendered: null,
            onOptionChanged: null,
            onDisposing: null
        },

        // ---------------------------------------------------------------
        // Vykreslení
        // ---------------------------------------------------------------
        render: function () {
            var cfg = this.config;
            var self = this;

            if ((!cfg.items || !cfg.items.length) && cfg.dataSource) {
                cfg.items = cfg.dataSource;
            }
            cfg.items = cfg.items || [];

            this.$container
                .addClass("qpx-tabview")
                .addClass("qpx-tabview-pos-" + cfg.tabsPosition)
                .addClass("qpx-tabview-styling-" + cfg.stylingMode)
                .addClass("qpx-icon-position-" + cfg.iconPosition)
                .toggleClass("qpx-rtl", !!cfg.rtlEnabled)
                .toggleClass("qpx-hidden", !cfg.visible)
                .toggleClass("qpx-state-disabled", !!cfg.disabled)
                .toggleClass("qpx-focusable", !!cfg.focusStateEnabled)
                .toggleClass("qpx-hoverable", !!cfg.hoverStateEnabled)
                .attr("dir", cfg.rtlEnabled ? "rtl" : "ltr");

            if (cfg.onInitialized) { this.on("ready", cfg.onInitialized); }
            if (cfg.onContentReady) { this.on("contentReady", cfg.onContentReady); }
            if (cfg.onSelectionChanged) { this.on("selectionChanged", cfg.onSelectionChanged); }
            if (cfg.onItemClick) { this.on("itemClick", cfg.onItemClick); }
            if (cfg.onTitleClick) { this.on("titleClick", cfg.onTitleClick); }
            if (cfg.onItemHold) { this.on("itemHold", cfg.onItemHold); }
            if (cfg.onItemContextMenu) { this.on("itemContextMenu", cfg.onItemContextMenu); }
            if (cfg.onItemRendered) { this.on("itemRendered", cfg.onItemRendered); }
            if (cfg.onOptionChanged) { this.on("optionChanged", cfg.onOptionChanged); }
            if (cfg.onDisposing) { this.on("destroy", cfg.onDisposing); }

            // --- DOM kostra -------------------------------------------------
            this.$tabsWrapper = $("<div class='qpx-tabview-tabswrapper'></div>");
            this.$navPrev = $("<div class='qpx-tabview-nav qpx-tabview-nav-prev' tabindex='-1' role='button' aria-label='Předchozí záložky'>&#8249;</div>").hide();
            this.$navNext = $("<div class='qpx-tabview-nav qpx-tabview-nav-next' tabindex='-1' role='button' aria-label='Další záložky'>&#8250;</div>").hide();
            this.$tabsScroll = $("<div class='qpx-tabview-tabsscroll'></div>");
            this.$tabsList = $("<div class='qpx-tabview-tabslist' role='tablist'></div>");
            this.$indicator = $("<div class='qpx-tabview-indicator qpx-no-anim'></div>");

            this.$tabsList.append(this.$indicator);
            this.$tabsScroll.append(this.$tabsList);
            this.$tabsWrapper.append(this.$navPrev, this.$tabsScroll, this.$navNext);

            this.$content = $("<div class='qpx-tabview-content' role='presentation'></div>");

            if (cfg.tabsPosition === "bottom") {
                this.$container.append(this.$content, this.$tabsWrapper);
            } else {
                this.$container.append(this.$tabsWrapper, this.$content);
            }

            this._itemRefs = [];
            this._selectedIndex = -1;
            this._layoutRaf = null;
            this._resizeObserver = null;

            this._buildItems();
            this._bindNav();
            this._bindKeyboard();
            if (cfg.swipeEnabled) { this._bindSwipe(); }
            this._bindResize();

            var initialIndex = this._resolveInitialIndex();
            this._selectIndex(initialIndex, { initial: true, silent: false });

            setTimeout(function () {
                self._updateNavVisibility();
                self._moveIndicator(false);
                self.trigger("contentReady", { component: self });
            }, 0);
        },

        _resolveInitialIndex: function () {
            var cfg = this.config;
            if (cfg.selectedItem != null) {
                var idx = this._indexOfItem(cfg.selectedItem);
                if (idx > -1) { return idx; }
            }
            return cfg.selectedIndex || 0;
        },

        // ---------------------------------------------------------------
        // Sestavení položek (záložka + panel)
        // ---------------------------------------------------------------
        _buildItems: function () {
            var self = this;
            this._itemRefs = [];
            (this.config.items || []).forEach(function (itemCfg, index) {
                self._itemRefs.push(self._createItemRef(itemCfg || {}, index));
            });

            if (!this.config.deferRendering) {
                this._itemRefs.forEach(function (ref) { self._renderPanelContent(ref); });
            }
        },

        _rebuildItems: function () {
            this._itemRefs.forEach(function (ref) {
                if (ref.widget && ref.widget.destroy) { ref.widget.destroy(); }
                ref.$tab.remove();
                ref.$panel.remove();
            });
            this._itemRefs = [];
            this._selectedIndex = -1;

            this.$tabsList.empty().append(this.$indicator);
            this.$content.empty();

            this._buildItems();
            var idx = this._resolveInitialIndex();
            this._selectIndex(idx, { initial: true });
            this._updateNavVisibility();
        },

        _createItemRef: function (itemCfg, index) {
            var self = this;
            var cfg = this.config;

            var $tab = $("<div class='qpx-tabview-tab' role='tab' tabindex='-1'></div>")
                .attr("aria-selected", "false")
                .attr("id", this.id + "-tab-" + index)
                .attr("aria-controls", this.id + "-panel-" + index);

            if (itemCfg.disabled) { $tab.addClass("qpx-state-disabled").attr("aria-disabled", "true"); }
            if (itemCfg.visible === false) { $tab.addClass("qpx-hidden"); }
            if (itemCfg.cssClass) { $tab.addClass(itemCfg.cssClass); }

            var $icon = null;
            if (itemCfg.icon) {
                $icon = $("<span class='qpx-icon'></span>").addClass("qpx-icon-" + itemCfg.icon);
            }

            var $title = $("<span class='qpx-tabview-tab-title'></span>");
            if (qpx.isFunction(cfg.itemTitleTemplate)) {
                var tContent = cfg.itemTitleTemplate.call(this, itemCfg, index, $title[0]);
                if (tContent !== undefined) { $title.append(tContent); }
            } else {
                $title.text(itemCfg.title != null ? itemCfg.title : (itemCfg.text || ""));
            }

            if ($icon) {
                if (cfg.iconPosition === "end" || cfg.iconPosition === "bottom") {
                    $tab.append($title, $icon);
                } else {
                    $tab.append($icon, $title);
                }
            } else {
                $tab.append($title);
            }

            var $badge = null;
            if (itemCfg.badge !== undefined && itemCfg.badge !== null && itemCfg.badge !== "") {
                $badge = $("<span class='qpx-tabview-tab-badge'></span>").text(itemCfg.badge);
                $tab.append($badge);
            }

            var $panel = $("<div class='qpx-tabview-panel' role='tabpanel'></div>")
                .attr("id", this.id + "-panel-" + index)
                .attr("aria-labelledby", this.id + "-tab-" + index)
                .hide();

            this.$tabsList.append($tab);
            this.$content.append($panel);

            var ref = {
                config: itemCfg,
                index: index,
                $tab: $tab,
                $panel: $panel,
                widget: null,
                rendered: false
            };

            // klik na záložku
            $tab.on("click.qpxTabView", function (e) {
                if (itemCfg.disabled || cfg.disabled) { return; }
                self.trigger("titleClick", { itemData: itemCfg, itemIndex: index, itemElement: $tab[0], component: self, event: e });
                self.trigger("itemClick", { itemData: itemCfg, itemIndex: index, itemElement: $tab[0], component: self, event: e });
                self.option("selectedIndex", index);
            });

            // podržení položky (itemHold), stejně jako u dx widgetů
            var holdTimer = null;
            $tab.on("mousedown.qpxTabView touchstart.qpxTabView", function (e) {
                if (itemCfg.disabled || cfg.disabled) { return; }
                window.clearTimeout(holdTimer);
                holdTimer = window.setTimeout(function () {
                    self.trigger("itemHold", { itemData: itemCfg, itemIndex: index, itemElement: $tab[0], component: self, event: e });
                }, cfg.itemHoldTimeout);
            });
            $tab.on("mouseup.qpxTabView mouseleave.qpxTabView touchend.qpxTabView touchmove.qpxTabView", function () {
                window.clearTimeout(holdTimer);
            });

            $tab.on("contextmenu.qpxTabView", function (e) {
                if (itemCfg.disabled || cfg.disabled) { return; }
                self.trigger("itemContextMenu", { itemData: itemCfg, itemIndex: index, itemElement: $tab[0], component: self, event: e });
            });

            return ref;
        },

        // vykreslení obsahu panelu (líné, dle deferRendering) —
        // podporuje template (string/funkce), html/text, nebo vnořenou qpx konfiguraci
        _renderPanelContent: function (ref) {
            if (ref.rendered) { return; }
            var itemCfg = ref.config;
            var cfg = this.config;
            var content = itemCfg.template !== undefined ? itemCfg.template : cfg.itemTemplate;

            if (qpx.isFunction(content)) {
                var result = content.call(this, itemCfg, ref.index, ref.$panel[0]);
                if (result !== undefined && result !== null) { ref.$panel.append(result); }
            } else if (qpx.isString(content)) {
                ref.$panel.html(content);
            } else if (itemCfg.view || itemCfg.rows || itemCfg.cols) {
                ref.widget = qpx.ui(itemCfg, ref.$panel);
                this.addChild(ref.widget);
            } else if (itemCfg.html !== undefined) {
                ref.$panel.html(itemCfg.html);
            } else if (itemCfg.text !== undefined && itemCfg.title !== undefined) {
                // "text" použit jako obsah, "title" jako popisek záložky
                ref.$panel.text(itemCfg.text);
            }

            ref.rendered = true;
            this.trigger("itemRendered", { itemData: itemCfg, itemIndex: ref.index, itemElement: ref.$panel[0], component: this });
        },

        // ---------------------------------------------------------------
        // Výběr záložky
        // ---------------------------------------------------------------
        _indexOfItem: function (item) {
            var refs = this._itemRefs;
            for (var i = 0; i < refs.length; i++) {
                if (refs[i].config === item) { return i; }
            }
            return -1;
        },

        _findSelectableIndex: function (fromIndex, direction) {
            var refs = this._itemRefs;
            if (!refs.length) { return -1; }
            var loop = this.config.loop;
            var i = fromIndex;
            var guard = 0;

            while (guard <= refs.length) {
                if (i < 0) { i = loop ? refs.length - 1 : 0; }
                if (i > refs.length - 1) { i = loop ? 0 : refs.length - 1; }

                var ref = refs[i];
                if (ref && !ref.config.disabled && ref.config.visible !== false) { return i; }
                if (i === fromIndex && guard > 0) { break; }

                i += direction;
                guard += 1;
            }
            return -1;
        },

        _selectIndex: function (index, opts) {
            opts = opts || {};
            var refs = this._itemRefs;
            if (!refs.length) { return; }

            index = Math.max(0, Math.min(index, refs.length - 1));
            if (refs[index] && refs[index].config.disabled) {
                var alt = this._findSelectableIndex(index, 1);
                if (alt === -1) { return; }
                index = alt;
            }
            if (index === this._selectedIndex && !opts.initial) { return; }

            var prevIndex = this._selectedIndex;
            var prevRef = refs[prevIndex];
            var ref = refs[index];

            if (prevRef) {
                prevRef.$tab.removeClass("qpx-state-selected").attr({ "aria-selected": "false", tabindex: "-1" });
                prevRef.$panel.hide();
            }

            this._selectedIndex = index;
            this.config.selectedIndex = index;
            this.config.selectedItem = ref.config;

            this._renderPanelContent(ref);

            ref.$tab.addClass("qpx-state-selected").attr({ "aria-selected": "true", tabindex: "0" });
            ref.$panel.show();

            this._scrollTabIntoView(ref);
            this._moveIndicator(this.config.animationEnabled && !opts.initial);

            if (!opts.silent) {
                this.trigger("selectionChanged", {
                    component: this,
                    addedItems: [ref.config],
                    removedItems: prevRef ? [prevRef.config] : []
                });
            }
        },

        _moveIndicator: function (animate) {
            var ref = this._itemRefs[this._selectedIndex];
            if (!ref || !this.$indicator) { return; }

            this.$indicator.toggleClass("qpx-no-anim", !animate);

            var vertical = (this.config.tabsPosition === "left" || this.config.tabsPosition === "right");
            if (vertical) {
                this.$indicator.css({ top: ref.$tab.position().top, height: ref.$tab.outerHeight(), left: "", width: "" });
            } else {
                this.$indicator.css({ left: ref.$tab.position().left, width: ref.$tab.outerWidth(), top: "", height: "" });
            }
        },

        // ---------------------------------------------------------------
        // Scrollování / nav tlačítka (při přetečení pásu záložek)
        // ---------------------------------------------------------------
        _bindNav: function () {
            var self = this;
            var step = function () { return Math.max(80, self.$tabsScroll.width() * 0.75); };

            this.$navPrev.on("click.qpxTabView", function () {
                self.$tabsScroll.stop
                    ? self.$tabsScroll.animate({ scrollLeft: "-=" + step() }, 150)
                    : (self.$tabsScroll[0].scrollLeft -= step());
            });
            this.$navNext.on("click.qpxTabView", function () {
                self.$tabsScroll.stop
                    ? self.$tabsScroll.animate({ scrollLeft: "+=" + step() }, 150)
                    : (self.$tabsScroll[0].scrollLeft += step());
            });
            this.$tabsScroll.on("scroll.qpxTabView", function () { self._updateNavVisibility(); });
        },

        _updateNavVisibility: function () {
            var cfg = this.config;
            var el = this.$tabsScroll[0];
            if (!el) { return; }

            var vertical = (cfg.tabsPosition === "left" || cfg.tabsPosition === "right");
            var overflowing = cfg.scrollingEnabled && (vertical
                ? el.scrollHeight - 1 > el.clientHeight
                : el.scrollWidth - 1 > el.clientWidth);

            var showButtons = !!cfg.showNavButtons && overflowing;
            this.$navPrev.toggle(showButtons);
            this.$navNext.toggle(showButtons);
            this.$tabsWrapper.toggleClass("qpx-tabview-overflowing", !!overflowing);
        },

        _scrollTabIntoView: function (ref) {
            var el = this.$tabsScroll[0];
            if (!el || !this.config.scrollingEnabled) { return; }
            var vertical = (this.config.tabsPosition === "left" || this.config.tabsPosition === "right");
            var tabEl = ref.$tab[0];

            if (vertical) {
                if (tabEl.offsetTop < el.scrollTop) { el.scrollTop = tabEl.offsetTop; }
                else if (tabEl.offsetTop + tabEl.offsetHeight > el.scrollTop + el.clientHeight) {
                    el.scrollTop = tabEl.offsetTop + tabEl.offsetHeight - el.clientHeight;
                }
            } else {
                if (tabEl.offsetLeft < el.scrollLeft) { el.scrollLeft = tabEl.offsetLeft; }
                else if (tabEl.offsetLeft + tabEl.offsetWidth > el.scrollLeft + el.clientWidth) {
                    el.scrollLeft = tabEl.offsetLeft + tabEl.offsetWidth - el.clientWidth;
                }
            }
        },

        _bindResize: function () {
            var self = this;
            var handler = function () { self._scheduleRelayout(); };

            if (window.ResizeObserver) {
                this._resizeObserver = new ResizeObserver(handler);
                this._resizeObserver.observe(this.getNode());
            } else {
                $(window).on("resize.qpxTabView" + this.id, handler);
            }
        },

        _scheduleRelayout: function () {
            var self = this;
            if (this._layoutRaf) { return; }
            var raf = window.requestAnimationFrame || window.setTimeout;
            this._layoutRaf = raf(function () {
                self._layoutRaf = null;
                self._updateNavVisibility();
                self._moveIndicator(false);
            });
        },

        // ---------------------------------------------------------------
        // Klávesová navigace (WAI-ARIA "tabs" pattern)
        // ---------------------------------------------------------------
        _bindKeyboard: function () {
            var self = this;
            var cfg = this.config;

            this.$tabsList.on("keydown.qpxTabView", ".qpx-tabview-tab", function (e) {
                if (cfg.disabled) { return; }
                var horizontal = !(cfg.tabsPosition === "left" || cfg.tabsPosition === "right");
                var rtl = !!cfg.rtlEnabled;
                var nextKey = horizontal ? (rtl ? "ArrowLeft" : "ArrowRight") : "ArrowDown";
                var prevKey = horizontal ? (rtl ? "ArrowRight" : "ArrowLeft") : "ArrowUp";
                var handled = true;

                if (e.key === nextKey) {
                    var n = self._findSelectableIndex(self._selectedIndex + 1, 1);
                    if (n > -1) { self.option("selectedIndex", n); self._itemRefs[n].$tab.trigger("focus"); }
                } else if (e.key === prevKey) {
                    var p = self._findSelectableIndex(self._selectedIndex - 1, -1);
                    if (p > -1) { self.option("selectedIndex", p); self._itemRefs[p].$tab.trigger("focus"); }
                } else if (e.key === "Home") {
                    var f = self._findSelectableIndex(0, 1);
                    if (f > -1) { self.option("selectedIndex", f); self._itemRefs[f].$tab.trigger("focus"); }
                } else if (e.key === "End") {
                    var l = self._findSelectableIndex(self._itemRefs.length - 1, -1);
                    if (l > -1) { self.option("selectedIndex", l); self._itemRefs[l].$tab.trigger("focus"); }
                } else if (e.key === "Enter" || e.key === " ") {
                    var focusedIndex = self._itemRefs.map(function (r) { return r.$tab[0]; }).indexOf(this);
                    if (focusedIndex > -1) { self.option("selectedIndex", focusedIndex); }
                } else {
                    handled = false;
                }

                if (handled) { e.preventDefault(); }
            });
        },

        // ---------------------------------------------------------------
        // Swipe (dotyková zařízení)
        // ---------------------------------------------------------------
        _bindSwipe: function () {
            var self = this;
            var startX = null, startY = null, tracking = false;

            this.$content.on("touchstart.qpxTabView", function (e) {
                if (self.config.disabled) { return; }
                var t = e.originalEvent.touches[0];
                startX = t.clientX;
                startY = t.clientY;
                tracking = true;
            });

            this.$content.on("touchmove.qpxTabView", function (e) {
                if (!tracking) { return; }
                var t = e.originalEvent.touches[0];
                if (Math.abs(t.clientX - startX) > Math.abs(t.clientY - startY)) {
                    e.preventDefault(); // horizontální swipe = nescrollovat stránku svisle
                }
            });

            this.$content.on("touchend.qpxTabView", function (e) {
                if (!tracking) { return; }
                tracking = false;
                var t = e.originalEvent.changedTouches[0];
                var dx = t.clientX - startX;
                var dy = t.clientY - startY;
                var threshold = 50;

                if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy)) {
                    var rtl = !!self.config.rtlEnabled;
                    var dir = (dx < 0) !== rtl ? 1 : -1; // doleva = další, doprava = předchozí (v LTR)
                    var target = self._findSelectableIndex(self._selectedIndex + dir, dir);
                    if (target > -1) { self.option("selectedIndex", target); }
                }
            });
        },

        // ---------------------------------------------------------------
        // Veřejné API
        // ---------------------------------------------------------------
        option: function (name, value) {
            if (arguments.length === 0) { return this.config; }
            if (qpx.isObject(name)) {
                var self = this;
                $.each(name, function (k, v) { self.option(k, v); });
                return this;
            }
            if (arguments.length === 1) { return this.config[name]; }

            var prev = this.config[name];
            var cfg = this.config;

            switch (name) {
                case "items":
                case "dataSource":
                    cfg.items = value || [];
                    this._rebuildItems();
                    break;

                case "selectedIndex":
                    this._selectIndex(value);
                    break;

                case "selectedItem":
                    var idx = this._indexOfItem(value);
                    if (idx > -1) { this._selectIndex(idx); }
                    break;

                case "disabled":
                    cfg.disabled = !!value;
                    this.$container.toggleClass("qpx-state-disabled", cfg.disabled);
                    break;

                case "visible":
                    cfg.visible = !!value;
                    this.$container.toggleClass("qpx-hidden", !cfg.visible);
                    break;

                case "tabsPosition":
                    this.$container.removeClass("qpx-tabview-pos-" + prev).addClass("qpx-tabview-pos-" + value);
                    cfg.tabsPosition = value;
                    if (value === "bottom") { this.$container.append(this.$tabsWrapper); }
                    else { this.$container.prepend(this.$tabsWrapper); }
                    this._moveIndicator(false);
                    this._updateNavVisibility();
                    break;

                case "stylingMode":
                    this.$container.removeClass("qpx-tabview-styling-" + prev).addClass("qpx-tabview-styling-" + value);
                    cfg.stylingMode = value;
                    break;

                case "iconPosition":
                    this.$container.removeClass("qpx-icon-position-" + prev).addClass("qpx-icon-position-" + value);
                    cfg.iconPosition = value;
                    break;

                case "rtlEnabled":
                    cfg.rtlEnabled = !!value;
                    this.$container.toggleClass("qpx-rtl", cfg.rtlEnabled).attr("dir", cfg.rtlEnabled ? "rtl" : "ltr");
                    this._moveIndicator(false);
                    break;

                case "showNavButtons":
                case "scrollingEnabled":
                    cfg[name] = value;
                    this._updateNavVisibility();
                    break;

                default:
                    cfg[name] = value;
            }

            this.trigger("optionChanged", { name: name, value: value, previousValue: prev, component: this });
            return this;
        },

        selectItem: function (indexOrItem) {
            if (typeof indexOrItem === "number") { this.option("selectedIndex", indexOrItem); }
            else { this.option("selectedItem", indexOrItem); }
            return this;
        },

        getSelectedIndex: function () { return this._selectedIndex; },
        getSelectedItem: function () {
            var ref = this._itemRefs[this._selectedIndex];
            return ref ? ref.config : null;
        },
        getItemElement: function (index) {
            var ref = this._itemRefs[index];
            return ref ? ref.$panel[0] : undefined;
        },
        getTabElement: function (index) {
            var ref = this._itemRefs[index];
            return ref ? ref.$tab[0] : undefined;
        },

        repaint: function () {
            this._updateNavVisibility();
            this._moveIndicator(false);
            return this;
        },

        destroy: function () {
            if (this._resizeObserver) { this._resizeObserver.disconnect(); this._resizeObserver = null; }
            $(window).off(".qpxTabView" + this.id);
            if (this._layoutRaf && window.cancelAnimationFrame) { window.cancelAnimationFrame(this._layoutRaf); }
            this._layoutRaf = null;

            this._itemRefs.forEach(function (ref) {
                if (ref.widget && ref.widget.destroy) { ref.widget.destroy(); }
                ref.$tab.off(".qpxTabView");
            });
            this._itemRefs = [];

            this._super();
        }
    });

    qpx.registerWidget("qpTabView", TabView);
    qpx.qpTabView = TabView;

})(window.qpx, jQuery);

/*!
 * qpx - qpTreeView
 * Stromová struktura inspirovaná DevExtreme dxTreeView.
 *  - items: [{ id, parentId, text, icon, expanded, selected, disabled }]
 *  - selectionMode: "single" | "multiple"
 *  - expandEvent: "click" | "dblclick"
 *  - showCheckBoxesMode: "none" | "normal" | "selectAll"
 *  - dragEnabled: true/false (drag & drop mezi uzly)
 *  - cascadeCheck: true/false (parent → children)
 *  - useIndeterminate: true/false (partial selection)
 *  - události: onItemClick, onSelectionChanged, onItemExpanded, onItemCollapsed,
 *              onOptionChanged, onDragStart, onDragEnter, onDragLeave,
 *              onDragOver, onDrop, onReorder, onMove
 */

(function (qpx, $) {
    "use strict";

    var TreeView = qpx.Widget.extend({

        defaults: {
            items: [],
            keyExpr: "id",
            parentIdExpr: "parentId",
            displayExpr: "text",
            selectionMode: "single",
            expandEvent: "click",
            showCheckBoxesMode: "none", // none | normal | selectAll
            disabled: false,
            visible: true,

            dragEnabled: false,
            cascadeCheck: false,
            useIndeterminate: true,

            onItemClick: null,
            onSelectionChanged: null,
            onItemExpanded: null,
            onItemCollapsed: null,
            onOptionChanged: null,

            onDragStart: null,
            onDragEnter: null,
            onDragLeave: null,
            onDragOver: null,
            onDrop: null,
            onReorder: null,
            onMove: null
        },

        render: function () {
            var cfg = this.config;

            this.$container
                .addClass("qpx-treeview")
                .toggleClass("qpx-hidden", !cfg.visible)
                .toggleClass("qpx-state-disabled", !!cfg.disabled)
                .attr("role", "tree");

            if (cfg.onItemClick) this.on("itemClick", cfg.onItemClick);
            if (cfg.onSelectionChanged) this.on("selectionChanged", cfg.onSelectionChanged);
            if (cfg.onItemExpanded) this.on("itemExpanded", cfg.onItemExpanded);
            if (cfg.onItemCollapsed) this.on("itemCollapsed", cfg.onItemCollapsed);
            if (cfg.onOptionChanged) this.on("optionChanged", cfg.onOptionChanged);

            if (cfg.onDragStart) this.on("dragStart", cfg.onDragStart);
            if (cfg.onDragEnter) this.on("dragEnter", cfg.onDragEnter);
            if (cfg.onDragLeave) this.on("dragLeave", cfg.onDragLeave);
            if (cfg.onDragOver) this.on("dragOver", cfg.onDragOver);
            if (cfg.onDrop) this.on("drop", cfg.onDrop);
            if (cfg.onReorder) this.on("reorder", cfg.onReorder);
            if (cfg.onMove) this.on("move", cfg.onMove);

            this._selectedKeys = [];
            this._expandedKeys = [];

            this._indexItems();
            this._renderTree();

            if (cfg.dragEnabled) {
                this._enableDragDrop();
            }
        },

        _indexItems: function () {
            var cfg = this.config;
            var key = cfg.keyExpr;
            var parent = cfg.parentIdExpr;

            this._map = {};
            this._children = {};
            this._selectedKeys = [];
            this._expandedKeys = [];

            (cfg.items || []).forEach(function (item) {
                var id = item[key];
                var pid = item[parent];

                this._map[id] = item;
                this._children[pid] = this._children[pid] || [];
                this._children[pid].push(item);

                if (item.expanded) this._expandedKeys.push(id);
                if (item.selected) this._selectedKeys.push(id);

            }.bind(this));
        },

        _renderTree: function () {
            this.$container.empty();
            var roots = this._children[null] || this._children[undefined] || [];
            var $ul = $("<ul class='qpx-tree-root'></ul>");
            this._renderNodes($ul, roots);
            this.$container.append($ul);
        },

        _renderNodes: function ($parent, items) {
            var self = this;
            items.forEach(function (item) {
                var id = item[self.config.keyExpr];
                var text = item[self.config.displayExpr];
                var disabled = !!item.disabled;
                var expanded = self._expandedKeys.indexOf(id) !== -1;
                var selected = self._selectedKeys.indexOf(id) !== -1;

                var $li = $("<li class='qpx-tree-item' role='treeitem'></li>")
                    .attr("data-key", id)
                    .toggleClass("qpx-state-disabled", disabled)
                    .toggleClass("qpx-state-selected", selected)
                    .toggleClass("qpx-expanded", expanded);

                var $row = $("<div class='qpx-tree-row'></div>");
                if (self.config.dragEnabled && !disabled) {
                    $row.attr("draggable", "true");
                }

                var hasChildren = !!self._children[id];
                var $toggle = $("<span class='qpx-tree-toggle'></span>")
                    .text(hasChildren ? (expanded ? "▾" : "▸") : "")
                    .toggleClass("qpx-tree-toggle-empty", !hasChildren);

                var $checkbox = null;
                if (self.config.showCheckBoxesMode !== "none") {
                    $checkbox = $("<input type='checkbox' class='qpx-tree-checkbox' />")
                        .prop("checked", selected)
                        .prop("disabled", disabled);
                }

                var $icon = null;
                if (item.icon) {
                    $icon = $("<span class='qpx-tree-icon'></span>");
                    if (String(item.icon).indexOf("css:") === 0)
                        $icon.addClass(String(item.icon).slice(4));
                    else
                        $icon.text(item.icon);
                }

                var $text = $("<span class='qpx-tree-text'></span>").text(text);

                $row.append($toggle);
                if ($checkbox) $row.append($checkbox);
                if ($icon) $row.append($icon);
                $row.append($text);

                $li.append($row);

                $toggle.on(self.config.expandEvent + ".qpxTree", function () {
                    if (disabled || !hasChildren) return;
                    self._toggleExpand(id, $li);
                });

                $row.on("click.qpxTree", function () {
                    if (disabled) return;
                    var checked = !$li.hasClass("qpx-state-selected");
                    self._handleSelection(id, item, $li, checked);
                    if (self.config.cascadeCheck && self.config.showCheckBoxesMode !== "none") {
                        self._cascadeToChildren(id, checked);
                        if (self.config.useIndeterminate) {
                            self._updateParentIndeterminate(id);
                        }
                    }
                    self.trigger("itemClick", { itemData: item, key: id, component: self });
                });

                if ($checkbox) {
                    $checkbox.on("change.qpxTree", function () {
                        if (disabled) return;

                        var checked = $checkbox.prop("checked");

                        self._handleSelection(id, item, $li, checked);

                        if (self.config.cascadeCheck) {
                            self._cascadeToChildren(id, checked);
                        }

                        if (self.config.useIndeterminate) {
                            self._updateParentIndeterminate(id);
                        }
                    });
                }

                if (hasChildren) {
                    var $ul = $("<ul class='qpx-tree-children'></ul>")
                        .toggle(expanded);
                    self._renderNodes($ul, self._children[id]);
                    $li.append($ul);
                }

                $parent.append($li);
            });
        },

        _toggleExpand: function (id, $li) {
            var expanded = $li.hasClass("qpx-expanded");
            $li.toggleClass("qpx-expanded", !expanded);
            $li.children("ul.qpx-tree-children").slideToggle(120);

            if (!expanded) {
                if (this._expandedKeys.indexOf(id) === -1) this._expandedKeys.push(id);
                this.trigger("itemExpanded", { key: id, component: this });
            } else {
                this._expandedKeys = this._expandedKeys.filter(function (k) { return k !== id; });
                this.trigger("itemCollapsed", { key: id, component: this });
            }
        },

        _handleSelection: function (id, item, $li, checked) {
            var mode = this.config.selectionMode;
            var prev = this._selectedKeys.slice();

            if (mode === "single") {
                this._selectedKeys = checked ? [id] : [];
            } else {
                var idx = this._selectedKeys.indexOf(id);
                if (checked && idx === -1) this._selectedKeys.push(id);
                if (!checked && idx !== -1) this._selectedKeys.splice(idx, 1);
            }

            this.$container.find(".qpx-tree-item").removeClass("qpx-state-selected");
            this._selectedKeys.forEach(function (k) {
                this.$container.find("[data-key='" + k + "']").addClass("qpx-state-selected");
            }.bind(this));

            this.trigger("selectionChanged", {
                selectedItemKeys: this._selectedKeys.slice(),
                previousItemKeys: prev,
                component: this
            });
        },

        _cascadeToChildren: function (id, checked) {
            var self = this;
            var children = this._children[id];
            if (!children) return;

            children.forEach(function (child) {
                var childId = child[self.config.keyExpr];

                var idx = self._selectedKeys.indexOf(childId);
                if (checked && idx === -1) self._selectedKeys.push(childId);
                if (!checked && idx !== -1) self._selectedKeys.splice(idx, 1);

                var $childItem = self.$container.find("[data-key='" + childId + "']");
                var $checkbox = $childItem.find(".qpx-tree-checkbox");
                if ($checkbox.length) {
                    $checkbox.prop("checked", checked);
                    $checkbox.prop("indeterminate", false);
                }

                self._cascadeToChildren(childId, checked);
            });

            this.$container.find(".qpx-tree-item").removeClass("qpx-state-selected");
            this._selectedKeys.forEach(function (k) {
                this.$container.find("[data-key='" + k + "']").addClass("qpx-state-selected");
            }.bind(this));
        },

        _updateParentIndeterminate: function (id) {
            var parentId = this._map[id][this.config.parentIdExpr];
            if (parentId === null || parentId === undefined) return;

            var children = this._children[parentId];
            if (!children) return;

            var selectedCount = 0;
            var childCount = children.length;

            children.forEach(function (child) {
                var childId = child[this.config.keyExpr];
                if (this._selectedKeys.indexOf(childId) !== -1) {
                    selectedCount++;
                }
            }.bind(this));

            var $parentItem = this.$container.find("[data-key='" + parentId + "']");
            var $checkbox = $parentItem.find(".qpx-tree-checkbox");

            if (!$checkbox.length) return;

            if (selectedCount === 0) {
                $checkbox.prop("checked", false);
                $checkbox.prop("indeterminate", false);
            } else if (selectedCount === childCount) {
                $checkbox.prop("checked", true);
                $checkbox.prop("indeterminate", false);
            } else {
                $checkbox.prop("checked", false);
                $checkbox.prop("indeterminate", true);
            }

            this._updateParentIndeterminate(parentId);
        },

        _enableDragDrop: function () {
            var self = this;

            this.$container.on("dragstart.qpxTree", ".qpx-tree-row", function (e) {
                var $row = $(this);
                var $item = $row.closest(".qpx-tree-item");
                var key = $item.data("key");

                e.originalEvent.dataTransfer.effectAllowed = "move";
                e.originalEvent.dataTransfer.setData("text/plain", key);

                $item.addClass("qpx-tree-dragging");

                self.trigger("dragStart", { key, item: self._map[key], component: self });
            });

            this.$container.on("dragend.qpxTree", ".qpx-tree-row", function () {
                self.$container.find(".qpx-tree-dragging").removeClass("qpx-tree-dragging");
                self.$container.find(".qpx-tree-drop-target")
                    .removeClass("qpx-tree-drop-target qpx-tree-drop-above qpx-tree-drop-below qpx-tree-drop-inside");
            });

            this.$container.on("dragenter.qpxTree", ".qpx-tree-row", function (e) {
                e.preventDefault();
                var $row = $(this);
                var $item = $row.closest(".qpx-tree-item");
                $item.addClass("qpx-tree-drop-target");

                var key = $item.data("key");
                self.trigger("dragEnter", { key, item: self._map[key], component: self });
            });

            this.$container.on("dragleave.qpxTree", ".qpx-tree-row", function () {
                var $item = $(this).closest(".qpx-tree-item");
                $item.removeClass("qpx-tree-drop-target qpx-tree-drop-above qpx-tree-drop-below qpx-tree-drop-inside");

                var key = $item.data("key");
                self.trigger("dragLeave", { key, item: self._map[key], component: self });
            });

            this.$container.on("dragover.qpxTree", ".qpx-tree-row", function (e) {
                e.preventDefault();

                var $row = $(this);
                var $item = $row.closest(".qpx-tree-item");
                var offset = $row.offset();
                var y = e.originalEvent.clientY - offset.top;

                $item.removeClass("qpx-tree-drop-above qpx-tree-drop-below qpx-tree-drop-inside");

                if (y < 8) {
                    $item.addClass("qpx-tree-drop-above");
                } else if (y > $row.outerHeight() - 8) {
                    $item.addClass("qpx-tree-drop-below");
                } else {
                    $item.addClass("qpx-tree-drop-inside");
                }

                var key = $item.data("key");
                self.trigger("dragOver", { key, item: self._map[key], component: self });
            });

            this.$container.on("drop.qpxTree", ".qpx-tree-row", function (e) {
                e.preventDefault();

                var $targetRow = $(this);
                var $targetItem = $targetRow.closest(".qpx-tree-item");
                var targetKey = $targetItem.data("key");

                var sourceKey = e.originalEvent.dataTransfer.getData("text/plain");
                var sourceItem = self._map[sourceKey];
                var targetItem = self._map[targetKey];

                var dropType = $targetItem.hasClass("qpx-tree-drop-above") ? "above"
                    : $targetItem.hasClass("qpx-tree-drop-below") ? "below"
                    : "inside";

                self._performDrop(sourceKey, targetKey, dropType);

                self.trigger("drop", {
                    sourceKey,
                    targetKey,
                    dropType,
                    sourceItem,
                    targetItem,
                    component: self
                });
            });
        },

        _performDrop: function (sourceKey, targetKey, dropType) {
            var cfg = this.config;
            var keyExpr = cfg.keyExpr;
            var parentExpr = cfg.parentIdExpr;

            var source = this._map[sourceKey];
            var target = this._map[targetKey];

            if (!source || !target) return;

            var oldParent = source[parentExpr];

            if (dropType === "inside") {
                source[parentExpr] = target[keyExpr];

                this.trigger("move", {
                    sourceKey,
                    targetKey,
                    newParent: target[keyExpr],
                    oldParent,
                    component: this
                });
            } else {
                var siblings = this._children[target[parentExpr]] || [];
                var targetIndex = siblings.indexOf(target);

                var sourceSiblings = this._children[source[parentExpr]];
                if (sourceSiblings) {
                    var idx = sourceSiblings.indexOf(source);
                    if (idx !== -1) sourceSiblings.splice(idx, 1);
                }

                source[parentExpr] = target[parentExpr];

                siblings = this._children[target[parentExpr]] || [];
                if (dropType === "above") {
                    siblings.splice(targetIndex, 0, source);
                } else {
                    siblings.splice(targetIndex + 1, 0, source);
                }

                this.trigger("reorder", {
                    sourceKey,
                    targetKey,
                    dropType,
                    newParent: target[parentExpr],
                    oldParent,
                    component: this
                });
            }

            this._indexItems();
            this._renderTree();
            if (this.config.dragEnabled) this._enableDragDrop();
        },

        option: function (name, value) {
            if (arguments.length === 0) return this.config;
            if (qpx.isObject(name)) {
                var self = this;
                $.each(name, function (k, v) { self.option(k, v); });
                return this;
            }
            if (arguments.length === 1) return this.config[name];

            var prev = this.config[name];
            if (prev === value) return this;

            this.config[name] = value;

            if (name === "items") {
                this._indexItems();
                this._renderTree();
                if (this.config.dragEnabled) this._enableDragDrop();
            } else if (name === "visible") {
                this.$container.toggleClass("qpx-hidden", !value);
            } else if (name === "disabled") {
                this.$container.toggleClass("qpx-state-disabled", !!value);
            } else if (name === "dragEnabled") {
                this.$container.off(".qpxTree");
                this._renderTree();
                if (value) this._enableDragDrop();
            }

            this.trigger("optionChanged", { name, value, previousValue: prev });
            return this;
        },

        destroy: function () {
            this.$container.off(".qpxTree");
            this._super();
        }
    });

    qpx.registerWidget("qpTreeView", TreeView);
    qpx.qpTreeView = TreeView;

})(window.qpx, jQuery);

/*!
 * qpx - qpDataGrid
 * Tabulková komponenta co nejvíce přiblížená DevExtreme dxDataGrid
 * (options / events / methods i vzhled), postavená nad původní
 * implementací qpDataGrid — původní funkcionalita (adaptivní sloupce
 * s akordeon detailem pod řádkem, klávesová navigace, řazení, výběr
 * řádků, onRowClick/onCellClick) je zachována beze změny chování.
 *
 * Nově doplněno (analogie k dxDataGrid):
 *  - selection: { mode: "none"|"single"|"multiple", showCheckBoxesMode }
 *               (selectionMode jako string zůstává funkční, mapuje se do selection.mode)
 *  - paging: { enabled, pageSize } + pager: { visible, allowedPageSizes,
 *             showPageSizeSelector, showInfo, showNavigationButtons }
 *  - filterRow: { visible }  — textový filtr pod hlavičkou, sloupec od sloupce
 *  - searchPanel: { visible, placeholder, width } — globální hledání nad gridem
 *  - editing: { mode:"row", allowUpdating, allowAdding, allowDeleting, confirmDelete }
 *  - sorting.mode "multiple" + shift-klik na hlavičku (číslo pořadí řazení)
 *  - allowColumnResizing — tažení za okraj hlavičky sloupce
 *  - showBorders / showRowLines / showColumnLines / rowAlternationEnabled / wordWrapEnabled
 *  - columns: navíc dataType, alignment, allowSorting, allowFiltering,
 *             allowResizing, format (string preset i funkce), cellTemplate,
 *             calculateCellValue
 *
 * Events: onInitialized, onContentReady, onRowClick, onCellClick,
 *         onSelectionChanged, onOptionChanged, onRowInserted, onRowUpdated,
 *         onRowRemoved, onEditingStart, onRowPrepared, onDisposing
 *
 * Methods: option(name[, value]) — vč. tečkové cesty "paging.pageSize",
 *          refresh()/repaint(), columnOption(field, name[, value]),
 *          getSelectedRowKeys(), getSelectedRowsData(), selectRows(keys),
 *          deselectRows(keys), clearSelection(), getDataSource(),
 *          addRow(), editRow(key), deleteRow(key), saveEditData(),
 *          cancelEditData(), hasEditData(), pageIndex([i]), pageSize([n]),
 *          pageCount(), searchByText(text), clearFilter(),
 *          getRowElement(key), destroy()
 */
(function (qpx, $) {
    "use strict";

    var DataGrid = qpx.Widget.extend({

        defaults: {
            dataSource: [],
            columns: [],
            keyExpr: "id",

            selection: {
                mode: "none",              // none | single | multiple
                showCheckBoxesMode: "onClick" // none | onClick | always
            },
            selectionMode: undefined,      // DEPRECATED zpětná kompatibilita, viz selection.mode

            sorting: {
                mode: "single" // none | single | multiple
            },

            paging: {
                enabled: false,
                pageSize: 10
            },
            pager: {
                visible: "auto",           // auto | true | false
                allowedPageSizes: [5, 10, 20, 50],
                showPageSizeSelector: true,
                showInfo: true,
                showNavigationButtons: true
            },

            filterRow: { visible: false },
            searchPanel: { visible: false, placeholder: "Hledat...", width: 220 },

            editing: {
                mode: "row",        // zatím jediný podporovaný mód
                allowUpdating: false,
                allowAdding: false,
                allowDeleting: false,
                confirmDelete: true
            },

            showBorders: true,
            showRowLines: true,
            showColumnLines: true,
            rowAlternationEnabled: false,
            wordWrapEnabled: false,
            allowColumnResizing: false,
            noDataText: "Žádná data k zobrazení",

            visible: true,
            disabled: false,
            responsive: true,

            onInitialized: null,
            onContentReady: null,
            onRowClick: null,
            onCellClick: null,
            onSelectionChanged: null,
            onOptionChanged: null,
            onRowInserted: null,
            onRowUpdated: null,
            onRowRemoved: null,
            onEditingStart: null,
            onRowPrepared: null,
            onDisposing: null
        },

        // ---------------------------------------------------------------
        render: function () {
            var self = this;
            var cfg = this.config;

            // zpětná kompatibilita: staré "selectionMode: 'multiple'" -> selection.mode
            if (cfg.selectionMode && cfg.selection.mode === "none") {
                cfg.selection.mode = cfg.selectionMode;
            }
            cfg.selectionMode = cfg.selection.mode;

            this.$container
                .addClass("qpx-datagrid")
                .toggleClass("qpx-hidden", !cfg.visible)
                .toggleClass("qpx-state-disabled", !!cfg.disabled)
                .toggleClass("qpx-datagrid-no-borders", !cfg.showBorders)
                .toggleClass("qpx-datagrid-no-row-lines", !cfg.showRowLines)
                .toggleClass("qpx-datagrid-no-column-lines", !cfg.showColumnLines)
                .toggleClass("qpx-datagrid-alternation", !!cfg.rowAlternationEnabled)
                .toggleClass("qpx-datagrid-wordwrap", !!cfg.wordWrapEnabled);

            if (cfg.onInitialized) { this.on("ready", cfg.onInitialized); }
            if (cfg.onContentReady) { this.on("contentReady", cfg.onContentReady); }
            if (cfg.onRowClick) { this.on("rowClick", cfg.onRowClick); }
            if (cfg.onCellClick) { this.on("cellClick", cfg.onCellClick); }
            if (cfg.onSelectionChanged) { this.on("selectionChanged", cfg.onSelectionChanged); }
            if (cfg.onOptionChanged) { this.on("optionChanged", cfg.onOptionChanged); }
            if (cfg.onRowInserted) { this.on("rowInserted", cfg.onRowInserted); }
            if (cfg.onRowUpdated) { this.on("rowUpdated", cfg.onRowUpdated); }
            if (cfg.onRowRemoved) { this.on("rowRemoved", cfg.onRowRemoved); }
            if (cfg.onEditingStart) { this.on("editingStart", cfg.onEditingStart); }
            if (cfg.onRowPrepared) { this.on("rowPrepared", cfg.onRowPrepared); }
            if (cfg.onDisposing) { this.on("destroy", cfg.onDisposing); }

            this._selectedKeys = [];
            this._sortState = [];           // [{ dataField, desc }]
            this._adaptiveOpenRowKey = null;
            this._pageIndex = 0;
            this._searchText = "";
            this._filterValues = {};        // { dataField: text }
            this._editRowKey = null;
            this._editRowData = null;
            this._isNewRow = false;

            this._buildStructure();
            this._bindResize();
            this._bindKeyboard();
            this._renderAll();

            setTimeout(function () { self.trigger("contentReady", { component: self }); }, 0);
        },

        // ---------------------------------------------------------------
        // Kostra DOM: toolbar (search), scroll wrapper + tabulka, pager
        // ---------------------------------------------------------------
        _buildStructure: function () {
            var self = this;
            var cfg = this.config;

            this.$toolbar = $("<div class='qpx-datagrid-toolbar'></div>");

            this.$searchWrap = $("<div class='qpx-datagrid-search'></div>");
            this.$searchInput = $("<input type='text' class='qpx-datagrid-search-input'>")
                .attr("placeholder", cfg.searchPanel.placeholder || "Hledat...");
            if (cfg.searchPanel.width) { this.$searchWrap.css("width", qpx.toPx(cfg.searchPanel.width)); }
            this.$searchWrap.append($("<span class='qpx-icon qpx-datagrid-search-icon'></span>"), this.$searchInput);
            this.$toolbar.append(this.$searchWrap);

            var searchTimer = null;
            this.$searchInput.on("input.qpxDataGrid", function () {
                var val = this.value;
                clearTimeout(searchTimer);
                searchTimer = setTimeout(function () {
                    self._searchText = val;
                    self._pageIndex = 0;
                    self._renderBody();
                    self._renderPager();
                }, 200);
            });

            this.$scroll = $("<div class='qpx-datagrid-scroll'></div>");
            this.$table = $("<table class='qpx-datagrid-table'></table>");
            this.$colgroup = $("<colgroup></colgroup>");
            this.$thead = $("<thead></thead>");
            this.$tbody = $("<tbody></tbody>");
            this.$table.append(this.$colgroup, this.$thead, this.$tbody);
            this.$scroll.append(this.$table);

            this.$pager = $("<div class='qpx-datagrid-pager'></div>");

            this.$container.empty().append(this.$toolbar, this.$scroll, this.$pager);
        },

        _renderAll: function () {
            this._computeAdaptiveLayout();
            this._renderHeader();
            this._renderBody();
            this._renderPager();
            this.$toolbar.toggle(!!this.config.searchPanel.visible);
        },

        // znovu-vykreslení "na povel" (dx: refresh()/repaint())
        refresh: function () { this._renderAll(); return this; },
        repaint: function () { this._renderAll(); return this; },

        _bindResize: function () {
            var self = this;
            this._onWinResize = function () { self._scheduleAdaptiveLayout(); };

            if (window.ResizeObserver) {
                this._resizeObserver = new ResizeObserver(function () { self._scheduleAdaptiveLayout(); });
                this._resizeObserver.observe(this.getNode());
            } else {
                $(window).on("resize.qpxDataGrid" + this.id, this._onWinResize);
            }
        },

        _scheduleAdaptiveLayout: function () {
            var self = this;
            if (this._adaptiveRaf) { return; }
            this._adaptiveRaf = (window.requestAnimationFrame || window.setTimeout)(function () {
                self._adaptiveRaf = null;
                self._refreshAdaptiveLayout();
            });
        },

        // přepočítá adaptivní sloupce a — pokud se skutečně změnily — znovu
        // vykreslí hlavičku a tělo (tzn. správně přepočítá i <colgroup>,
        // místo pouhého skrývání buněk přes CSS)
        _refreshAdaptiveLayout: function () {
            if (!this.config.responsive) { return; }
            var before = this._adaptiveSignature();
            this._computeAdaptiveLayout();
            var after = this._adaptiveSignature();
            if (before !== after) {
                this._renderHeader();
                this._renderBody();
            }
        },

        _adaptiveSignature: function () {
            return this._configuredColumns().map(function (c) {
                return c.dataField + ":" + (c.adaptiveHidden ? 1 : 0);
            }).join("|");
        },

        // ---------------------------------------------------------------
        // Klávesová navigace (zachováno z původní implementace + ochrana
        // proti zachytávání kláves při psaní do editačních inputů)
        // ---------------------------------------------------------------
        _bindKeyboard: function () {
            var self = this;

            this.$container.attr("tabindex", "0");

            this.$container.on("keydown.qpxDataGrid", function (e) {
                if ($(e.target).is("input, select, textarea")) { return; }

                var rows = self.$tbody.find(".qpx-datagrid-row");
                if (!rows.length) { return; }

                var selectedKey = self._selectedKeys[0];
                var index = selectedKey ? rows.index(self.$tbody.find("[data-key='" + selectedKey + "']")) : -1;

                function selectRowByIndex(i) {
                    if (i < 0) { i = 0; }
                    if (i >= rows.length) { i = rows.length - 1; }
                    var $row = $(rows[i]);
                    var key = $row.data("key");
                    self._selectedKeys = [key];
                    rows.removeClass("qpx-state-selected");
                    $row.addClass("qpx-state-selected");
                    self.$tbody.find(".qpx-datagrid-select-checkbox").prop("checked", false);
                    $row.find(".qpx-datagrid-select-checkbox").prop("checked", true);
                    self.trigger("selectionChanged", {
                        selectedRowKeys: self._selectedKeys.slice(),
                        previousRowKeys: [],
                        component: self
                    });
                    $row[0].scrollIntoView({ block: "nearest" });
                }

                switch (e.key) {
                    case "ArrowDown": e.preventDefault(); selectRowByIndex(index + 1); break;
                    case "ArrowUp": e.preventDefault(); selectRowByIndex(index - 1); break;
                    case "Home": e.preventDefault(); selectRowByIndex(0); break;
                    case "End": e.preventDefault(); selectRowByIndex(rows.length - 1); break;
                    case "PageDown": e.preventDefault(); selectRowByIndex(index + 10); break;
                    case "PageUp": e.preventDefault(); selectRowByIndex(index - 10); break;

                    case "Enter":
                        e.preventDefault();
                        if (index >= 0) {
                            var $row = $(rows[index]);
                            var key = $row.data("key");
                            var rowData = self.config.dataSource.filter(function (r) { return r[self.config.keyExpr] === key; })[0];
                            self.trigger("rowClick", { key: key, data: rowData, component: self, rowElement: $row[0] });
                        }
                        break;

                    case "Escape":
                        e.preventDefault();
                        self._closeAdaptiveAccordion();
                        break;
                }
            });
        },

        // ---------------------------------------------------------------
        // Sloupce
        // ---------------------------------------------------------------
        // sloupce, které se skutečně mají vykreslit jako <th>/<td> v tabulce
        // (bez sloupců schovaných uživatelem i bez těch dočasně skrytých
        // adaptivním layoutem)
        _visibleColumns: function () {
            return (this.config.columns || []).filter(function (c) {
                return c.visible !== false && !c.adaptiveHidden;
            });
        },

        // všechny nakonfigurované (uživatelsky neskryté) sloupce — používá
        // se pro výpočet adaptivního layoutu, globální hledání a obsah
        // akordeonu, kde potřebujeme počítat i se sloupci, které jsou
        // aktuálně mimo tabulku kvůli adaptivnímu zalamování
        _configuredColumns: function () {
            return (this.config.columns || []).filter(function (c) { return c.visible !== false; });
        },

        _columnAlign: function (col) {
            if (col.alignment) { return col.alignment; }
            return (col.dataType === "number") ? "right" : "left";
        },

        _isMultipleSelection: function () { return this.config.selection.mode === "multiple"; },
        _isSingleSelection: function () { return this.config.selection.mode === "single"; },
        _showCheckBoxes: function () { return this.config.selection.showCheckBoxesMode !== "none"; },
        _editingEnabled: function () {
            var e = this.config.editing;
            return !!(e && (e.allowUpdating || e.allowAdding || e.allowDeleting));
        },

        // ---------------------------------------------------------------
        // Hlavička (+ volitelný filter row)
        // ---------------------------------------------------------------
        _renderHeader: function () {
            var self = this;
            var cfg = this.config;
            this.$thead.empty();
            this.$colgroup.empty();

            var $tr = $("<tr class='qpx-datagrid-header-row'></tr>");

            if (this._isMultipleSelection() && this._showCheckBoxes()) {
                var $thSel = $("<th class='qpx-datagrid-header-cell qpx-datagrid-cell-select'></th>");
                var $selectAll = $("<input type='checkbox' class='qpx-datagrid-select-all'>");
                $selectAll.on("change.qpxDataGrid", function () { self._handleSelectAll(this.checked); });
                $thSel.append($selectAll);
                $tr.append($thSel);
                this.$colgroup.append("<col class='qpx-datagrid-col-select'>");
                this._$selectAllCheckbox = $selectAll;
            }

            this._visibleColumns().forEach(function (col) {
                var $th = $("<th class='qpx-datagrid-header-cell'></th>")
                    .attr("data-field", col.dataField)
                    .css("text-align", self._columnAlign(col));

                $th.append($("<span class='qpx-datagrid-header-caption'></span>").text(col.caption || col.dataField));

                var allowSort = (col.allowSorting !== false) && cfg.sorting && cfg.sorting.mode !== "none";
                if (allowSort) {
                    $th.addClass("qpx-datagrid-sortable");
                    var info = self._sortInfo(col.dataField);
                    if (info) {
                        $th.addClass("qpx-datagrid-sort-" + (info.desc ? "desc" : "asc"));
                        $th.append("<span class='qpx-datagrid-sort-indicator'></span>");
                        if (cfg.sorting.mode === "multiple" && self._sortState.length > 1) {
                            $th.append($("<span class='qpx-datagrid-sort-order'></span>").text(info.order + 1));
                        }
                    }
                    $th.on("click.qpxDataGrid", function (e) {
                        self._toggleSort(col.dataField, e.shiftKey);
                    });
                }

                if (col.width) { $th.css("width", qpx.toPx(col.width)); }
                $tr.append($th);

                var $col = $("<col>");
                if (col.width) { $col.css("width", qpx.toPx(col.width)); }
                self.$colgroup.append($col);

                if (cfg.allowColumnResizing && col.allowResizing !== false) {
                    var $handle = $("<span class='qpx-datagrid-resize-handle'></span>");
                    $th.append($handle);
                    self._bindColumnResize($handle, col, $th);
                }
            });

            this.$container.toggleClass("qpx-datagrid-adaptive", !!this._adaptiveActive);

            if (this._adaptiveActive) {
                $tr.append("<th class='qpx-datagrid-header-cell qpx-datagrid-cell-adaptive'></th>");
                this.$colgroup.append("<col class='qpx-datagrid-col-adaptive'>");
            }

            if (this._editingEnabled()) {
                var $thCmd = $("<th class='qpx-datagrid-header-cell qpx-datagrid-cell-command'></th>");
                if (cfg.editing.allowAdding) {
                    var $addBtn = $("<span class='qpx-datagrid-cmd-btn qpx-datagrid-add-btn' tabindex='0' role='button' title='Přidat řádek'>+</span>");
                    $addBtn.on("click.qpxDataGrid", function () { self.addRow(); });
                    $thCmd.append($addBtn);
                }
                $tr.append($thCmd);
                this.$colgroup.append("<col class='qpx-datagrid-col-command'>");
            }

            this.$thead.append($tr);

            if (cfg.filterRow && cfg.filterRow.visible) { this._renderFilterRow(); }
        },

        _renderFilterRow: function () {
            var self = this;
            var cfg = this.config;
            var $tr = $("<tr class='qpx-datagrid-filter-row'></tr>");

            if (this._isMultipleSelection() && this._showCheckBoxes()) {
                $tr.append("<th class='qpx-datagrid-header-cell qpx-datagrid-cell-select'></th>");
            }

            this._visibleColumns().forEach(function (col) {
                var $th = $("<th class='qpx-datagrid-header-cell'></th>");
                if (col.allowFiltering !== false) {
                    var $input = $("<input type='text' class='qpx-datagrid-filter-input'>")
                        .attr("placeholder", "Filtr...")
                        .val(self._filterValues[col.dataField] || "");

                    var timer = null;
                    $input.on("input.qpxDataGrid", function () {
                        var val = this.value;
                        clearTimeout(timer);
                        timer = setTimeout(function () {
                            self._filterValues[col.dataField] = val;
                            self._pageIndex = 0;
                            self._renderBody();
                            self._renderPager();
                        }, 200);
                    });
                    $th.append($input);
                }
                $tr.append($th);
            });

            if (this._adaptiveActive) { $tr.append("<th class='qpx-datagrid-header-cell qpx-datagrid-cell-adaptive'></th>"); }
            if (this._editingEnabled()) { $tr.append("<th class='qpx-datagrid-header-cell qpx-datagrid-cell-command'></th>"); }

            this.$thead.append($tr);
        },

        _bindColumnResize: function ($handle, col, $th) {
            var self = this;
            $handle.on("mousedown.qpxDataGrid", function (e) {
                e.preventDefault();
                e.stopPropagation();
                var startX = e.pageX;
                var startWidth = $th.outerWidth();

                function onMove(ev) {
                    var newWidth = Math.max(30, startWidth + (ev.pageX - startX));
                    $th.css("width", newWidth + "px");
                    col.width = newWidth;
                }
                function onUp() {
                    $(document).off(".qpxDataGridResize");
                    self._computeAdaptiveLayout();
                    self._renderHeader();
                    self._renderBody();
                }

                $(document).on("mousemove.qpxDataGridResize", onMove);
                $(document).on("mouseup.qpxDataGridResize", onUp);
            });
        },

        // ---------------------------------------------------------------
        // Tělo tabulky
        // ---------------------------------------------------------------
        _renderBody: function () {
            var self = this;
            var cfg = this.config;
            this.$tbody.empty();
            this._closeAdaptiveAccordion();

            var pageData = this._getPagedData();

            if (this._isNewRow) {
                this._renderRow(this._editRowData, true, -1);
            }

            if (!pageData.length && !this._isNewRow) {
                var colCount = this.$thead.find("tr").first().find("th").length || 1;
                this.$tbody.append(
                    $("<tr class='qpx-datagrid-no-data-row'></tr>").append(
                        $("<td class='qpx-datagrid-no-data-cell'></td>")
                            .attr("colspan", colCount)
                            .text(cfg.noDataText)
                    )
                );
                return;
            }

            pageData.forEach(function (row, idx) {
                self._renderRow(row, false, idx);
            });
        },

        _renderRow: function (row, isEditBuffer, rowIndex) {
            var self = this;
            var cfg = this.config;
            var key = row[cfg.keyExpr];
            var isEditing = isEditBuffer || (key === this._editRowKey);
            var selected = !isEditBuffer && this._selectedKeys.indexOf(key) !== -1;

            var $tr = $("<tr class='qpx-datagrid-row'></tr>")
                .attr("data-key", key)
                .toggleClass("qpx-state-selected", selected)
                .toggleClass("qpx-datagrid-row-edit", isEditing)
                .toggleClass("qpx-datagrid-row-alt", cfg.rowAlternationEnabled && rowIndex >= 0 && rowIndex % 2 === 1);

            if (this._isMultipleSelection() && this._showCheckBoxes() && !isEditBuffer) {
                var $tdSel = $("<td class='qpx-datagrid-cell qpx-datagrid-cell-select'></td>");
                var $cb = $("<input type='checkbox' class='qpx-datagrid-select-checkbox'>").prop("checked", selected);
                $cb.on("click.qpxDataGrid", function (e) {
                    e.stopPropagation();
                    self._handleRowClick(row, $tr);
                });
                $tdSel.append($cb);
                $tr.append($tdSel);
            } else if (this._isMultipleSelection() && this._showCheckBoxes() && isEditBuffer) {
                $tr.append("<td class='qpx-datagrid-cell qpx-datagrid-cell-select'></td>");
            }

            this._visibleColumns().forEach(function (col) {
                var $td = $("<td class='qpx-datagrid-cell'></td>")
                    .attr("data-field", col.dataField)
                    .css("text-align", self._columnAlign(col));

                if (isEditing) {
                    self._renderEditCell($td, col, row);
                } else {
                    var rawValue = qpx.isFunction(col.calculateCellValue) ? col.calculateCellValue(row) : row[col.dataField];

                    if (qpx.isFunction(col.cellTemplate)) {
                        var result = col.cellTemplate.call(self, $td[0], { value: rawValue, data: row, column: col, rowIndex: rowIndex });
                        if (result !== undefined && result !== null) { $td.append(result); }
                    } else {
                        $td.text(self._formatCellValue(rawValue, col));
                    }

                    $td.on("click.qpxDataGrid", function () {
                        self._handleCellClick(row, col, $td);
                    });
                }

                $tr.append($td);
            });

            // adaptivní "⋯" sloupec
            if (this._adaptiveActive) {
                var $adaptiveCell = $("<td class='qpx-datagrid-cell qpx-datagrid-cell-adaptive'></td>");
                if (!isEditing) {
                    var $btn = $("<span class='qpx-datagrid-adaptive-btn' tabindex='0' role='button'>⋯</span>");
                    $btn.on("click.qpxDataGrid", function (e) {
                        e.stopPropagation();
                        self._toggleAdaptiveAccordion(key, row, $tr);
                    });
                    $adaptiveCell.append($btn);
                }
                $tr.append($adaptiveCell);
            }

            // editační příkazový sloupec
            if (this._editingEnabled()) {
                $tr.append(this._buildCommandCell(row, key, isEditing, isEditBuffer));
            }

            if (!isEditing) {
                $tr.on("click.qpxDataGrid", function () {
                    self._handleRowClick(row, $tr);
                });
            }

            this.$tbody.append($tr);
            this.trigger("rowPrepared", { rowElement: $tr[0], key: key, data: row, rowIndex: rowIndex, component: this });
        },

        _renderEditCell: function ($td, col, row) {
            var self = this;
            var value = this._editRowData[col.dataField];
            var $input;

            if (col.dataType === "boolean") {
                $input = $("<input type='checkbox' class='qpx-datagrid-edit-input'>").prop("checked", !!value);
                $input.on("change.qpxDataGrid", function () { self._editRowData[col.dataField] = this.checked; });
            } else if (col.dataType === "number") {
                $input = $("<input type='number' class='qpx-datagrid-edit-input'>").val(value == null ? "" : value);
                $input.on("input.qpxDataGrid", function () { self._editRowData[col.dataField] = this.value === "" ? null : Number(this.value); });
            } else if (col.dataType === "date") {
                var dv = value instanceof Date ? value.toISOString().slice(0, 10) : (value || "");
                $input = $("<input type='date' class='qpx-datagrid-edit-input'>").val(dv);
                $input.on("input.qpxDataGrid", function () { self._editRowData[col.dataField] = this.value; });
            } else {
                $input = $("<input type='text' class='qpx-datagrid-edit-input'>").val(value == null ? "" : value);
                $input.on("input.qpxDataGrid", function () { self._editRowData[col.dataField] = this.value; });
            }

            $input.on("click.qpxDataGrid", function (e) { e.stopPropagation(); });
            $td.append($input);
        },

        _buildCommandCell: function (row, key, isEditing, isEditBuffer) {
            var self = this;
            var cfg = this.config;
            var $td = $("<td class='qpx-datagrid-cell qpx-datagrid-cell-command'></td>");

            if (isEditing) {
                var $save = $("<span class='qpx-datagrid-cmd-btn qpx-datagrid-save-btn' tabindex='0' role='button' title='Uložit'>✓</span>");
                var $cancel = $("<span class='qpx-datagrid-cmd-btn qpx-datagrid-cancel-btn' tabindex='0' role='button' title='Zrušit'>✕</span>");
                $save.on("click.qpxDataGrid", function (e) { e.stopPropagation(); self.saveEditData(); });
                $cancel.on("click.qpxDataGrid", function (e) { e.stopPropagation(); self.cancelEditData(); });
                $td.append($save, $cancel);
            } else {
                if (cfg.editing.allowUpdating) {
                    var $edit = $("<span class='qpx-datagrid-cmd-btn qpx-datagrid-edit-btn' tabindex='0' role='button' title='Upravit'>✎</span>");
                    $edit.on("click.qpxDataGrid", function (e) { e.stopPropagation(); self.editRow(key); });
                    $td.append($edit);
                }
                if (cfg.editing.allowDeleting) {
                    var $del = $("<span class='qpx-datagrid-cmd-btn qpx-datagrid-delete-btn' tabindex='0' role='button' title='Smazat'>🗑</span>");
                    $del.on("click.qpxDataGrid", function (e) { e.stopPropagation(); self.deleteRow(key); });
                    $td.append($del);
                }
            }

            return $td;
        },

        _formatCellValue: function (value, col) {
            col = col || {};
            if (value === null || value === undefined) { return ""; }
            if (qpx.isFunction(col.format)) { return col.format(value); }

            if (col.format === "date" || col.format === "shortDate" || col.dataType === "date") {
                var d = (value instanceof Date) ? value : new Date(value);
                return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
            }
            if (col.format === "fixedPoint" || col.dataType === "number") {
                var n = Number(value);
                if (isNaN(n)) { return String(value); }
                return col.precision !== undefined ? n.toFixed(col.precision) : String(n);
            }
            if (col.format === "percent") {
                var p = Number(value);
                if (isNaN(p)) { return String(value); }
                return (p * 100).toFixed(col.precision !== undefined ? col.precision : 0) + "%";
            }
            if (col.format === "currency") {
                var c = Number(value);
                if (isNaN(c)) { return String(value); }
                return c.toLocaleString(undefined, { style: "currency", currency: col.currency || "CZK" });
            }
            if (col.dataType === "boolean") { return value ? "✓" : "✗"; }

            return String(value);
        },

        // ---------------------------------------------------------------
        // Filtrování / hledání / řazení / stránkování
        // ---------------------------------------------------------------
        _rowMatchesFilters: function (row) {
            var self = this;
            var cfg = this.config;

            for (var field in this._filterValues) {
                var needle = (this._filterValues[field] || "").toLowerCase();
                if (!needle) { continue; }
                var col = cfg.columns.filter(function (c) { return c.dataField === field; })[0] || {};
                var val = qpx.isFunction(col.calculateCellValue) ? col.calculateCellValue(row) : row[field];
                var text = self._formatCellValue(val, col).toLowerCase();
                if (text.indexOf(needle) === -1) { return false; }
            }

            if (this._searchText) {
                var needle2 = this._searchText.toLowerCase();
                var found = this._configuredColumns().some(function (col) {
                    var val2 = qpx.isFunction(col.calculateCellValue) ? col.calculateCellValue(row) : row[col.dataField];
                    var text2 = self._formatCellValue(val2, col).toLowerCase();
                    return text2.indexOf(needle2) !== -1;
                });
                if (!found) { return false; }
            }

            return true;
        },

        _getFilteredData: function () {
            var self = this;
            return (this.config.dataSource || []).filter(function (row) { return self._rowMatchesFilters(row); });
        },

        _getSortedData: function () {
            var data = this._getFilteredData();
            var sortState = this._sortState.slice();
            if (!sortState.length) { return data; }

            data.sort(function (a, b) {
                for (var i = 0; i < sortState.length; i++) {
                    var s = sortState[i];
                    var av = a[s.dataField];
                    var bv = b[s.dataField];

                    if (av == null && bv != null) { return s.desc ? 1 : -1; }
                    if (av != null && bv == null) { return s.desc ? -1 : 1; }
                    if (av < bv) { return s.desc ? 1 : -1; }
                    if (av > bv) { return s.desc ? -1 : 1; }
                }
                return 0;
            });

            return data;
        },

        _getPagedData: function () {
            var data = this._getSortedData();
            var cfg = this.config;
            if (!cfg.paging || !cfg.paging.enabled) { return data; }

            var size = cfg.paging.pageSize || data.length || 1;
            var count = Math.max(1, Math.ceil(data.length / size));
            if (this._pageIndex >= count) { this._pageIndex = count - 1; }
            if (this._pageIndex < 0) { this._pageIndex = 0; }

            var start = this._pageIndex * size;
            return data.slice(start, start + size);
        },

        _sortInfo: function (dataField) {
            for (var i = 0; i < this._sortState.length; i++) {
                if (this._sortState[i].dataField === dataField) { return { desc: this._sortState[i].desc, order: i }; }
            }
            return null;
        },

        _toggleSort: function (dataField, appendMode) {
            var mode = this.config.sorting && this.config.sorting.mode;
            if (!mode || mode === "none") { return; }

            var multiple = (mode === "multiple") && appendMode;
            var existing = this._sortState.filter(function (s) { return s.dataField === dataField; })[0];

            if (!multiple) {
                this._sortState = existing ? [existing] : [];
            }

            if (!existing) {
                this._sortState.push({ dataField: dataField, desc: false });
            } else if (!existing.desc) {
                existing.desc = true;
            } else {
                this._sortState = this._sortState.filter(function (s) { return s.dataField !== dataField; });
            }

            this._pageIndex = 0;
            this._computeAdaptiveLayout();
            this._renderHeader();
            this._renderBody();
            this._renderPager();
        },

        // ---------------------------------------------------------------
        // Pager
        // ---------------------------------------------------------------
        _renderPager: function () {
            var self = this;
            var cfg = this.config;
            this.$pager.empty();

            var shouldShow = cfg.paging.enabled &&
                (cfg.pager.visible === true || (cfg.pager.visible === "auto" && this._getFilteredData().length > cfg.paging.pageSize));

            this.$pager.toggle(!!shouldShow);
            if (!shouldShow) { return; }

            var total = this._getFilteredData().length;
            var count = this.pageCount();

            if (cfg.pager.showPageSizeSelector && cfg.pager.allowedPageSizes && cfg.pager.allowedPageSizes.length) {
                var $sizes = $("<div class='qpx-datagrid-pager-sizes'></div>");
                cfg.pager.allowedPageSizes.forEach(function (size) {
                    var $btn = $("<span class='qpx-datagrid-pager-size'></span>")
                        .text(size)
                        .toggleClass("qpx-state-selected", size === cfg.paging.pageSize)
                        .on("click.qpxDataGrid", function () { self.pageSize(size); });
                    $sizes.append($btn);
                });
                this.$pager.append($sizes);
            }

            if (cfg.pager.showNavigationButtons) {
                var $nav = $("<div class='qpx-datagrid-pager-nav'></div>");
                var mkBtn = function (label, title, disabled, handler) {
                    var $b = $("<span class='qpx-datagrid-pager-btn'></span>")
                        .text(label).attr("title", title)
                        .toggleClass("qpx-state-disabled", disabled);
                    if (!disabled) { $b.on("click.qpxDataGrid", handler); }
                    return $b;
                };

                $nav.append(mkBtn("«", "První", this._pageIndex === 0, function () { self.pageIndex(0); }));
                $nav.append(mkBtn("‹", "Předchozí", this._pageIndex === 0, function () { self.pageIndex(self._pageIndex - 1); }));

                var $pages = $("<span class='qpx-datagrid-pager-pages'></span>");
                for (var i = 0; i < count; i++) {
                    (function (pageIdx) {
                        $pages.append(
                            $("<span class='qpx-datagrid-pager-page'></span>")
                                .text(pageIdx + 1)
                                .toggleClass("qpx-state-selected", pageIdx === self._pageIndex)
                                .on("click.qpxDataGrid", function () { self.pageIndex(pageIdx); })
                        );
                    })(i);
                }
                $nav.append($pages);

                $nav.append(mkBtn("›", "Další", this._pageIndex >= count - 1, function () { self.pageIndex(self._pageIndex + 1); }));
                $nav.append(mkBtn("»", "Poslední", this._pageIndex >= count - 1, function () { self.pageIndex(count - 1); }));

                this.$pager.append($nav);
            }

            if (cfg.pager.showInfo) {
                var from = total === 0 ? 0 : this._pageIndex * cfg.paging.pageSize + 1;
                var to = Math.min(total, (this._pageIndex + 1) * cfg.paging.pageSize);
                this.$pager.append($("<div class='qpx-datagrid-pager-info'></div>").text(from + "-" + to + " z " + total));
            }
        },

        // ---------------------------------------------------------------
        // Výběr řádků
        // ---------------------------------------------------------------
        _handleSelectAll: function (checked) {
            var self = this;
            var prev = this._selectedKeys.slice();

            if (checked) {
                this._selectedKeys = this._getFilteredData().map(function (r) { return r[self.config.keyExpr]; });
            } else {
                this._selectedKeys = [];
            }

            this._renderBody();
            this.trigger("selectionChanged", {
                selectedRowKeys: this._selectedKeys.slice(),
                previousRowKeys: prev,
                component: this
            });
        },

        _handleRowClick: function (row, $tr) {
            var cfg = this.config;
            var key = row[cfg.keyExpr];
            var prev = this._selectedKeys.slice();

            if (cfg.selection.mode === "single") {
                this._selectedKeys = [key];
            } else if (cfg.selection.mode === "multiple") {
                var idx = this._selectedKeys.indexOf(key);
                if (idx === -1) { this._selectedKeys.push(key); }
                else { this._selectedKeys.splice(idx, 1); }
            }

            this.$tbody.find(".qpx-datagrid-row").removeClass("qpx-state-selected");
            this.$tbody.find(".qpx-datagrid-select-checkbox").prop("checked", false);
            this._selectedKeys.forEach(function (k) {
                var $row = this.$tbody.find("[data-key='" + k + "']");
                $row.addClass("qpx-state-selected");
                $row.find(".qpx-datagrid-select-checkbox").prop("checked", true);
            }.bind(this));

            if (this._$selectAllCheckbox) {
                var allKeys = this._getFilteredData().map(function (r) { return r[cfg.keyExpr]; });
                var allSelected = allKeys.length > 0 && allKeys.every(function (k) { return this._selectedKeys.indexOf(k) !== -1; }.bind(this));
                this._$selectAllCheckbox.prop("checked", allSelected);
            }

            this.trigger("rowClick", { data: row, key: key, component: this, rowElement: $tr[0] });

            if (cfg.selection.mode !== "none") {
                this.trigger("selectionChanged", {
                    selectedRowKeys: this._selectedKeys.slice(),
                    previousRowKeys: prev,
                    component: this
                });
            }
        },

        _handleCellClick: function (row, col, $td) {
            var key = row[this.config.keyExpr];
            this.trigger("cellClick", {
                data: row, key: key, column: col, field: col.dataField,
                cellElement: $td[0], component: this
            });
        },

        getSelectedRowKeys: function () { return this._selectedKeys.slice(); },
        getSelectedRowsData: function () {
            var cfg = this.config;
            return cfg.dataSource.filter(function (r) { return this._selectedKeys.indexOf(r[cfg.keyExpr]) !== -1; }.bind(this));
        },
        selectRows: function (keys, preserve) {
            this._selectedKeys = preserve ? this._selectedKeys.concat(keys) : keys.slice();
            this._renderBody();
            this.trigger("selectionChanged", { selectedRowKeys: this._selectedKeys.slice(), previousRowKeys: [], component: this });
            return this;
        },
        deselectRows: function (keys) {
            this._selectedKeys = this._selectedKeys.filter(function (k) { return keys.indexOf(k) === -1; });
            this._renderBody();
            this.trigger("selectionChanged", { selectedRowKeys: this._selectedKeys.slice(), previousRowKeys: [], component: this });
            return this;
        },
        clearSelection: function () { return this.selectRows([]); },

        // ---------------------------------------------------------------
        // Adaptivní (responzivní) sloupce — akordeon detail pod řádkem
        // ---------------------------------------------------------------
        // Spočítá, které sloupce se při aktuální šířce kontejneru nevejdou
        // a musí se schovat do akordeonu pod řádkem. Sloupce, které se
        // rozhodneme skrýt, se NEVYKRESLUJÍ (viz _visibleColumns) —
        // tabulka má table-layout:fixed a pevný počet <col> v <colgroup>,
        // takže pouhé schování <th>/<td> přes display:none (jak to dělala
        // původní verze) rozhodí přiřazení <col> šířek ke zbývajícím
        // buňkám a layout se rozsype. Proto se místo skrývání buněk
        // sloupec z DOM úplně vynechá a zbylé sloupce se korektně
        // roztáhnou přes celou šířku (stejně jako u dxDataGrid).
        _computeAdaptiveLayout: function () {
            var cfg = this.config;
            var cols = this._configuredColumns();

            cols.forEach(function (col) { col.adaptiveHidden = false; });
            this._adaptiveActive = false;

            if (!cfg.responsive || !this.$table || !this.$table.length) {
                return;
            }

            var availableWidth = this.$table.parent().width();
            if (!availableWidth) { return; }

            // Pro odhad SKUTEČNĚ obsazené šířky musí mít přednost reálná
            // vykreslená šířka sloupce (col.width) — tabulka je
            // table-layout:fixed, takže se sloupec vždy vykreslí přesně
            // na tuto šířku (na rozdíl od minWidth, které je jen pomocná
            // hranice pro rozhodování, které sloupce schovat dřív/později).
            // Použití minWidth jako prioritního odhadu způsobovalo, že se
            // adaptivní skrývání spustilo pozdě a tabulka mezitím reálně
            // přetékala (dole se objevil vodorovný scrollbar).
            function colWidth(col) { return col.width || col.minWidth || 80; }

            // rezervovaná šířka sloupců, které nejsou v `cols` (výběr,
            // editační příkazy, "⋯" pro akordeon) — musí se také vejít
            var reservedWidth = 0;
            if (this._isMultipleSelection() && this._showCheckBoxes()) { reservedWidth += 36; }
            if (this._editingEnabled()) { reservedWidth += 76; }
            reservedWidth += 40; // sloupec "⋯", se kterým je nutno počítat i než se zjistí, že je potřeba

            var totalWidth = reservedWidth;
            cols.forEach(function (col) { totalWidth += colWidth(col); });

            var needAdaptive = totalWidth > availableWidth;
            if (!needAdaptive) { return; }

            var remaining = totalWidth;
            cols.slice().reverse().forEach(function (col) {
                if (remaining <= availableWidth) { return; }
                col.adaptiveHidden = true;
                remaining -= colWidth(col);
            });

            this._adaptiveActive = cols.some(function (c) { return c.adaptiveHidden; });
        },

        _openAdaptiveAccordion: function (key, row, $row) {
            var self = this;
            this._closeAdaptiveAccordion();

            var cols = this.config.columns.filter(function (c) { return c.visible !== false && c.adaptiveHidden; });
            if (!cols.length) { return; }

            var colspan = this.$thead.find("tr").first().find("th").length;

            var $detail = $("<tr class='qpx-datagrid-detail-row'></tr>");
            var $td = $("<td class='qpx-datagrid-detail-cell'></td>").attr("colspan", colspan);
            var $acc = $("<div class='qpx-datagrid-accordion'></div>");

            cols.forEach(function (col) {
                var rawValue = qpx.isFunction(col.calculateCellValue) ? col.calculateCellValue(row) : row[col.dataField];

                var $item = $("<div class='qpx-datagrid-accordion-item'></div>");
                var $header = $("<div class='qpx-datagrid-accordion-header'></div>").text(col.caption || col.dataField);
                // hodnota se zobrazuje rovnou, ne až po dalším kliku
                var $content = $("<div class='qpx-datagrid-accordion-content'></div>");

                if (qpx.isFunction(col.cellTemplate)) {
                    var result = col.cellTemplate.call(self, $content[0], { value: rawValue, data: row, column: col });
                    if (result !== undefined && result !== null) { $content.append(result); }
                } else {
                    $content.text(self._formatCellValue(rawValue, col));
                }

                $item.append($header, $content);
                $acc.append($item);
            });

            $td.append($acc);
            $detail.append($td);
            $row.after($detail);
            this._adaptiveOpenRowKey = key;
        },

        _closeAdaptiveAccordion: function () {
            this.$tbody.find(".qpx-datagrid-detail-row").remove();
            this._adaptiveOpenRowKey = null;
        },

        _toggleAdaptiveAccordion: function (key, row, $row) {
            if (this._adaptiveOpenRowKey === key) { this._closeAdaptiveAccordion(); return; }
            this._openAdaptiveAccordion(key, row, $row);
        },

        // ---------------------------------------------------------------
        // Editace (row mode) — add / edit / delete
        // ---------------------------------------------------------------
        addRow: function () {
            var cfg = this.config;
            var data = {};
            cfg.columns.forEach(function (c) { data[c.dataField] = (c.dataType === "boolean") ? false : ""; });
            data[cfg.keyExpr] = qpx.uid("new");

            this._editRowData = data;
            this._editRowKey = data[cfg.keyExpr];
            this._isNewRow = true;

            this.trigger("editingStart", { data: data, key: this._editRowKey, isNewRow: true, component: this });
            this._renderBody();
            return this;
        },

        editRow: function (key) {
            var cfg = this.config;
            var row = cfg.dataSource.filter(function (r) { return r[cfg.keyExpr] === key; })[0];
            if (!row) { return this; }

            this._editRowData = $.extend({}, row);
            this._editRowKey = key;
            this._isNewRow = false;

            this.trigger("editingStart", { data: row, key: key, isNewRow: false, component: this });
            this._renderBody();
            return this;
        },

        deleteRow: function (key) {
            var cfg = this.config;
            if (cfg.editing.confirmDelete && !window.confirm("Opravdu smazat tento záznam?")) { return this; }

            var row = cfg.dataSource.filter(function (r) { return r[cfg.keyExpr] === key; })[0];
            cfg.dataSource = cfg.dataSource.filter(function (r) { return r[cfg.keyExpr] !== key; });
            this.config.dataSource = cfg.dataSource;

            this._selectedKeys = this._selectedKeys.filter(function (k) { return k !== key; });

            this.trigger("rowRemoved", { data: row, key: key, component: this });
            this._pageIndex = Math.min(this._pageIndex, Math.max(0, this.pageCount() - 1));
            this._renderAll();
            return this;
        },

        saveEditData: function () {
            var cfg = this.config;
            if (!this._editRowData) { return this; }

            if (this._isNewRow) {
                cfg.dataSource.push($.extend({}, this._editRowData));
                this.trigger("rowInserted", { data: this._editRowData, key: this._editRowKey, component: this });
            } else {
                var idx = -1;
                for (var i = 0; i < cfg.dataSource.length; i++) {
                    if (cfg.dataSource[i][cfg.keyExpr] === this._editRowKey) { idx = i; break; }
                }
                if (idx > -1) {
                    $.extend(cfg.dataSource[idx], this._editRowData);
                    this.trigger("rowUpdated", { data: cfg.dataSource[idx], key: this._editRowKey, component: this });
                }
            }

            this._editRowKey = null;
            this._editRowData = null;
            this._isNewRow = false;

            this._renderAll();
            return this;
        },

        cancelEditData: function () {
            this._editRowKey = null;
            this._editRowData = null;
            this._isNewRow = false;
            this._renderBody();
            return this;
        },

        hasEditData: function () { return this._editRowData !== null; },

        // ---------------------------------------------------------------
        // Stránkování / hledání / filtr — veřejné API
        // ---------------------------------------------------------------
        pageIndex: function (idx) {
            if (idx === undefined) { return this._pageIndex; }
            var count = this.pageCount();
            this._pageIndex = Math.max(0, Math.min(idx, count - 1));
            this._renderBody();
            this._renderPager();
            return this;
        },

        pageSize: function (size) {
            if (size === undefined) { return this.config.paging.pageSize; }
            this.config.paging.pageSize = size;
            this._pageIndex = 0;
            this._renderBody();
            this._renderPager();
            return this;
        },

        pageCount: function () {
            var total = this._getFilteredData().length;
            var size = this.config.paging.pageSize || total || 1;
            return Math.max(1, Math.ceil(total / size));
        },

        searchByText: function (text) {
            this._searchText = text || "";
            this.$searchInput.val(this._searchText);
            this._pageIndex = 0;
            this._renderBody();
            this._renderPager();
            return this;
        },

        clearFilter: function () {
            this._filterValues = {};
            this._searchText = "";
            this.$searchInput.val("");
            this.$thead.find(".qpx-datagrid-filter-input").val("");
            this._pageIndex = 0;
            this._renderBody();
            this._renderPager();
            return this;
        },

        // ---------------------------------------------------------------
        // Ostatní veřejné API
        // ---------------------------------------------------------------
        getDataSource: function () { return this.config.dataSource; },

        getRowElement: function (key) {
            var el = this.$tbody.find("[data-key='" + key + "']");
            return el.length ? el[0] : undefined;
        },

        columnOption: function (dataField, optionName, value) {
            var col = this.config.columns.filter(function (c) { return c.dataField === dataField; })[0];
            if (!col) { return undefined; }
            if (value === undefined) { return col[optionName]; }
            col[optionName] = value;
            this._renderAll();
            return this;
        },

        // ---------------------------------------------------------------
        // option() — vč. podpory tečkové cesty, např. "paging.pageSize"
        // ---------------------------------------------------------------
        option: function (name, value) {
            if (arguments.length === 0) { return this.config; }
            if (qpx.isObject(name)) {
                var self = this;
                $.each(name, function (k, v) { self.option(k, v); });
                return this;
            }
            if (arguments.length === 1) { return qpx.resolve(this.config, name); }

            var rootName = String(name).split(".")[0];

            if (name.indexOf(".") > -1) {
                var parts = name.split(".");
                var obj = this.config;
                for (var i = 0; i < parts.length - 1; i++) {
                    obj[parts[i]] = obj[parts[i]] || {};
                    obj = obj[parts[i]];
                }
                obj[parts[parts.length - 1]] = value;
            } else {
                if (this.config[name] === value) { return this; }
                this.config[name] = value;
            }

            this._applyOption(rootName);
            this.trigger("optionChanged", { name: name, value: value, component: this });
            return this;
        },

        _applyOption: function (rootName) {
            var cfg = this.config;

            switch (rootName) {
                case "dataSource":
                case "columns":
                    this._pageIndex = 0;
                    this._renderAll();
                    break;

                case "selectionMode":
                    cfg.selection.mode = cfg.selectionMode;
                    this._selectedKeys = [];
                    this._renderAll();
                    break;

                case "selection":
                case "sorting":
                case "paging":
                case "pager":
                case "filterRow":
                case "searchPanel":
                case "editing":
                case "responsive":
                case "noDataText":
                    this._renderAll();
                    break;

                case "visible":
                    this.$container.toggleClass("qpx-hidden", !cfg.visible);
                    break;
                case "disabled":
                    this.$container.toggleClass("qpx-state-disabled", !!cfg.disabled);
                    break;
                case "rowAlternationEnabled":
                    this.$container.toggleClass("qpx-datagrid-alternation", !!cfg.rowAlternationEnabled);
                    this._renderBody();
                    break;
                case "showBorders":
                    this.$container.toggleClass("qpx-datagrid-no-borders", !cfg.showBorders);
                    break;
                case "showRowLines":
                    this.$container.toggleClass("qpx-datagrid-no-row-lines", !cfg.showRowLines);
                    break;
                case "showColumnLines":
                    this.$container.toggleClass("qpx-datagrid-no-column-lines", !cfg.showColumnLines);
                    break;
                case "wordWrapEnabled":
                    this.$container.toggleClass("qpx-datagrid-wordwrap", !!cfg.wordWrapEnabled);
                    break;
                case "allowColumnResizing":
                    this._renderHeader();
                    break;
            }
        },

        destroy: function () {
            if (this._resizeObserver) { this._resizeObserver.disconnect(); this._resizeObserver = null; }
            $(window).off(".qpxDataGrid" + this.id);
            $(document).off(".qpxDataGridResize");
            this.$container.off(".qpxDataGrid");
            this._super();
        }
    });

    qpx.registerWidget("qpDataGrid", DataGrid);
    qpx.qpDataGrid = DataGrid;

})(window.qpx, jQuery);

/*!
 * qpx - parser
 * Umožňuje definovat komponenty třemi způsoby:
 *
 *  1) JSON skládání (viz qpx.ui/qpx.Layout):
 *       qpx.ui({ rows: [ {view:"template", template:"Ahoj"} ] }, "#app");
 *
 *  2) Napojení na konkrétní HTML element (jako kendoUI / easyUI):
 *       $("#box").qpx("template", { template: "Ahoj #name#" });
 *       // nebo:
 *       $("#box").qpx({ view: "template", template: "Ahoj" });
 *
 *  3) Deklarativně přes data-qpx-* atributy přímo v HTML (jako metro UI CSS):
 *       <div data-qpx-view="template" data-qpx-template="Ahoj #name#"></div>
 *       qpx.parse(); // proskenuje dokument a vše inicializuje
 */
(function (qpx, $) {
    "use strict";

    // převede "data-qpx-auto-height" -> "autoHeight"
    function toCamelCase(str) {
        return str.replace(/-([a-z0-9])/g, function (_, c) { return c.toUpperCase(); });
    }

    // načte všechny data-qpx-* atributy jednoho elementu do konfiguračního objektu.
    // Hodnoty se pokusí naparsovat jako JSON (čísla, booleany, objekty, pole),
    // pokud to nejde, použije se jako obyčejný string.
    qpx.parseAttrs = function (el) {
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
    qpx.parse = function (root) {
        var $scope = root ? $(root) : $(document);
        var $found = $scope.find("[data-qpx-view]");
        if ($scope.is && $scope.is("[data-qpx-view]")) { $found = $found.add($scope); }

        $found.each(function () {
            if ($(this).data("qpx-widget")) { return; } // už inicializováno
            var cfg = qpx.parseAttrs(this);
            qpx.ui(cfg, this);
        });
        return qpx;
    };

    // vrátí instanci komponenty napojenou na daný element (nebo undefined)
    qpx.$find = function (el) {
        return $(el).data("qpx-widget");
    };

    // -----------------------------------------------------------------
    // jQuery plugin — napojení komponenty přímo na konkrétní element(y)
    // -----------------------------------------------------------------
    $.fn.qpx = function (view, config) {
        var cfg;
        if (qpx.isString(view)) {
            cfg = $.extend({ view: view }, config || {});
        } else {
            cfg = view || {};
        }

        var result = this;
        this.each(function () {
            var widget = qpx.ui(cfg, this);
            $(this).data("qpx-widget", widget);
        });
        return result;
    };

    // po načtení DOM automaticky zpracuje deklarativně zapsané komponenty,
    // pokud si to vývojář výslovně nevypne (qpx.autoParse = false;)
    $(function () {
        if (qpx.autoParse !== false) {
            qpx.parse(document);
        }
    });

})(window.qpx, jQuery);
