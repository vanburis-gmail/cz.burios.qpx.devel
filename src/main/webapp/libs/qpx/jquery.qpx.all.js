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
 * Tabulková komponenta inspirovaná DevExtreme dxDataGrid.
 *  - dataSource: array of objects
 *  - columns: [{ dataField, caption, width, minWidth, visible, dataType, format, adaptiveHidden }]
 *  - keyExpr: "id"
 *  - selectionMode: "none" | "single" | "multiple"
 *  - sorting: mode: "none" | "single" | "multiple"
 *  - responsive: adaptive columns do akordeon detailu pod řádkem
 *  - události: onRowClick, onCellClick, onSelectionChanged, onOptionChanged
 */

(function (qpx, $) {
    "use strict";

    var DataGrid = qpx.Widget.extend({

        defaults: {
            dataSource: [],
            columns: [],
            keyExpr: "id",
            selectionMode: "none", // none | single | multiple
            sorting: {
                mode: "single" // none | single | multiple
            },
            visible: true,
            disabled: false,
            responsive: true,

            onRowClick: null,
            onCellClick: null,
            onSelectionChanged: null,
            onOptionChanged: null
        },

        render: function () {
            var cfg = this.config;

            this.$container
                .addClass("qpx-datagrid")
                .toggleClass("qpx-hidden", !cfg.visible)
                .toggleClass("qpx-state-disabled", !!cfg.disabled);

            if (cfg.onRowClick) this.on("rowClick", cfg.onRowClick);
            if (cfg.onCellClick) this.on("cellClick", cfg.onCellClick);
            if (cfg.onSelectionChanged) this.on("selectionChanged", cfg.onSelectionChanged);
            if (cfg.onOptionChanged) this.on("optionChanged", cfg.onOptionChanged);

            this._selectedKeys = [];
            this._sortState = []; // [{ dataField, desc }]
            this._adaptiveOpenRowKey = null;

            this._buildStructure();
            this._bindResize();
            this._bindKeyboard();
            this._renderHeader();
            this._renderBody();
            this._doAdaptiveLayout();
        },

        _buildStructure: function () {
            this.$table = $("<table class='qpx-datagrid-table'></table>");
            this.$thead = $("<thead></thead>");
            this.$tbody = $("<tbody></tbody>");
            this.$table.append(this.$thead, this.$tbody);
            this.$container.empty().append(this.$table);
        },

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
            if (this._adaptiveRaf) return;
            this._adaptiveRaf = (window.requestAnimationFrame || window.setTimeout)(function () {
                self._adaptiveRaf = null;
                self._doAdaptiveLayout();
            });
        },

        _bindKeyboard: function () {
            var self = this;

            this.$container.attr("tabindex", "0");

            this.$container.on("keydown.qpxDataGrid", function (e) {
                var rows = self.$tbody.find(".qpx-datagrid-row");
                if (!rows.length) return;

                var selectedKey = self._selectedKeys[0];
                var index = selectedKey ? rows.index(self.$tbody.find("[data-key='" + selectedKey + "']")) : -1;

                function selectRowByIndex(i) {
                    if (i < 0) i = 0;
                    if (i >= rows.length) i = rows.length - 1;
                    var $row = $(rows[i]);
                    var key = $row.data("key");
                    self._selectedKeys = [key];
                    rows.removeClass("qpx-state-selected");
                    $row.addClass("qpx-state-selected");
                    self.trigger("selectionChanged", {
                        selectedRowKeys: self._selectedKeys.slice(),
                        previousRowKeys: [],
                        component: self
                    });
                    $row[0].scrollIntoView({ block: "nearest" });
                }

                switch (e.key) {
                    case "ArrowDown":
                        e.preventDefault();
                        selectRowByIndex(index + 1);
                        break;

                    case "ArrowUp":
                        e.preventDefault();
                        selectRowByIndex(index - 1);
                        break;

                    case "Home":
                        e.preventDefault();
                        selectRowByIndex(0);
                        break;

                    case "End":
                        e.preventDefault();
                        selectRowByIndex(rows.length - 1);
                        break;

                    case "PageDown":
                        e.preventDefault();
                        selectRowByIndex(index + 10);
                        break;

                    case "PageUp":
                        e.preventDefault();
                        selectRowByIndex(index - 10);
                        break;

                    case "Enter":
                        e.preventDefault();
                        if (index >= 0) {
                            var $row = $(rows[index]);
                            var key = $row.data("key");
                            var rowData = self.config.dataSource.filter(function (r) { return r[self.config.keyExpr] === key; })[0];
                            self.trigger("rowClick", { key: key, data: rowData, component: self });
                        }
                        break;
					case "Escape":
					    e.preventDefault();
					    self._closeAdaptiveAccordion();
					    break;

                }
            });
        },

        _renderHeader: function () {
            var self = this;
            var cfg = this.config;
            this.$thead.empty();

            var $tr = $("<tr class='qpx-datagrid-header-row'></tr>");

            cfg.columns.forEach(function (col) {
                if (col.visible === false) return;

                var $th = $("<th class='qpx-datagrid-header-cell'></th>")
                    .attr("data-field", col.dataField)
                    .text(col.caption || col.dataField);

                if (col.width) {
                    $th.css("width", qpx.toPx(col.width));
                }

                if (cfg.sorting && cfg.sorting.mode !== "none") {
                    $th.addClass("qpx-datagrid-sortable");
                    $th.on("click.qpxDataGrid", function () {
                        self._toggleSort(col.dataField);
                    });
                }

                $tr.append($th);
            });

            this.$thead.append($tr);
        },

        _renderBody: function () {
            var self = this;
            var cfg = this.config;
            this.$tbody.empty();
            this._closeAdaptiveAccordion();

            var data = this._getSortedData();

            data.forEach(function (row) {
                var key = row[cfg.keyExpr];
                var selected = self._selectedKeys.indexOf(key) !== -1;

                var $tr = $("<tr class='qpx-datagrid-row'></tr>")
                    .attr("data-key", key)
                    .toggleClass("qpx-state-selected", selected);

                cfg.columns.forEach(function (col) {
                    if (col.visible === false) return;

                    var value = row[col.dataField];
                    var text = self._formatCellValue(value, col);

                    var $td = $("<td class='qpx-datagrid-cell'></td>")
                        .attr("data-field", col.dataField)
                        .text(text);

                    $td.on("click.qpxDataGrid", function () {
                        self._handleCellClick(row, col, $td);
                    });

                    $tr.append($td);
                });
				// Adaptive button cell (always visible when responsive)
				if (self.config.responsive) {
				    var $adaptiveCell = $("<td class='qpx-datagrid-cell qpx-datagrid-cell-adaptive'></td>");
				    var $btn = $("<span class='qpx-datagrid-adaptive-btn' tabindex='0' role='button'>⋯</span>");

				    $btn.on("click.qpxDataGrid", function (e) {
				        e.stopPropagation();
				        self._toggleAdaptiveAccordion(key, row, $tr);
				    });

				    $adaptiveCell.append($btn);
				    $tr.append($adaptiveCell);
				}

                $tr.on("click.qpxDataGrid", function () {
                    self._handleRowClick(row, $tr);
                });

                self.$tbody.append($tr);
            });
        },

        _getSortedData: function () {
            var data = (this.config.dataSource || []).slice();
            var sortState = this._sortState.slice();

            if (!sortState.length) return data;

            data.sort(function (a, b) {
                for (var i = 0; i < sortState.length; i++) {
                    var s = sortState[i];
                    var av = a[s.dataField];
                    var bv = b[s.dataField];

                    if (av == null && bv != null) return s.desc ? 1 : -1;
                    if (av != null && bv == null) return s.desc ? -1 : 1;
                    if (av < bv) return s.desc ? 1 : -1;
                    if (av > bv) return s.desc ? -1 : 1;
                }
                return 0;
            });

            return data;
        },

        _toggleSort: function (dataField) {
            var mode = this.config.sorting && this.config.sorting.mode;
            if (!mode || mode === "none") return;

            var existing = this._sortState.filter(function (s) { return s.dataField === dataField; })[0];

            if (!existing) {
                if (mode === "single") this._sortState = [];
                this._sortState.push({ dataField: dataField, desc: false });
            } else if (!existing.desc) {
                existing.desc = true;
            } else {
                this._sortState = this._sortState.filter(function (s) { return s.dataField !== dataField; });
            }

            this._renderHeader();
            this._renderBody();
            this._doAdaptiveLayout();
        },
		_toggleAdaptiveAccordion: function (key, row, $row) {
		    if (this._adaptiveOpenRowKey === key) {
		        this._closeAdaptiveAccordion();
		        return;
		    }
		    this._openAdaptiveAccordion(key, row, $row);
		},

        _formatCellValue: function (value, col) {
            if (value == null) return "";
            if (col.format && qpx.isFunction(col.format)) {
                return col.format(value);
            }
            return String(value);
        },

        _handleRowClick: function (row, $tr) {
            var cfg = this.config;
            var key = row[cfg.keyExpr];
            var prev = this._selectedKeys.slice();

            if (cfg.selectionMode === "single") {
                this._selectedKeys = [key];
            } else if (cfg.selectionMode === "multiple") {
                var idx = this._selectedKeys.indexOf(key);
                if (idx === -1) this._selectedKeys.push(key);
                else this._selectedKeys.splice(idx, 1);
            }

            this.$tbody.find(".qpx-datagrid-row").removeClass("qpx-state-selected");
            this._selectedKeys.forEach(function (k) {
                this.$tbody.find("[data-key='" + k + "']").addClass("qpx-state-selected");
            }.bind(this));

            this.trigger("rowClick", {
                data: row,
                key: key,
                component: this,
                rowElement: $tr[0]
            });

            if (cfg.selectionMode !== "none") {
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
                data: row,
                key: key,
                column: col,
                field: col.dataField,
                cellElement: $td[0],
                component: this
            });
        },

        _doAdaptiveLayout: function () {
            if (!this.config.responsive) return;
            if (!this.$table || !this.$table.length) return;

            var availableWidth = this.$table.parent().width();
            if (!availableWidth) return;

            var cols = this.config.columns;
            var totalMinWidth = 0;

            cols.forEach(function (col) {
                if (col.visible === false) return;
                var mw = col.minWidth || col.width || 80;
                totalMinWidth += mw;
            });

            var needAdaptive = totalMinWidth > availableWidth;

            this.$container.toggleClass("qpx-datagrid-adaptive", needAdaptive);

            cols.forEach(function (col) {
                col.adaptiveHidden = false;
            });

            if (!needAdaptive) {
                this.$thead.find("th").show();
                this.$tbody.find("td").show();
                this._closeAdaptiveAccordion();
                return;
            }

            var remaining = totalMinWidth;
            cols.slice().reverse().forEach(function (col) {
                if (remaining <= availableWidth) return;
                if (col.visible === false) return;

                col.adaptiveHidden = true;
                remaining -= (col.minWidth || col.width || 80);
            });

            this.$thead.find(".qpx-datagrid-header-cell").each(function () {
                var field = $(this).attr("data-field");
                if (!field) return;
                var col = cols.filter(function (c) { return c.dataField === field; })[0];
                if (!col) return;
                $(this).toggle(!col.adaptiveHidden);
            });

            this.$tbody.find(".qpx-datagrid-row").each(function () {
                var $row = $(this);
                $row.find(".qpx-datagrid-cell").each(function () {
                    var field = $(this).attr("data-field");
                    if (!field) return;
                    var col = cols.filter(function (c) { return c.dataField === field; })[0];
                    if (!col) return;
                    $(this).toggle(!col.adaptiveHidden);
                });
            });
        },

        _openAdaptiveAccordion: function (key, row, $row) {
            this._closeAdaptiveAccordion();

            var cols = this.config.columns.filter(function (c) {
                return c.visible !== false && c.adaptiveHidden;
            });

            if (!cols.length) return;

            var colspan = this.config.columns.filter(function (c) { return c.visible !== false; }).length;

            var $detail = $("<tr class='qpx-datagrid-detail-row'></tr>");
            var $td = $("<td class='qpx-datagrid-detail-cell' colspan='" + colspan + "'></td>");

            var $acc = $("<div class='qpx-datagrid-accordion'></div>");

            cols.forEach(function (col) {
                var value = row[col.dataField];
                var text = (value == null ? "" : value);

                var $item = $("<div class='qpx-datagrid-accordion-item'></div>");
                var $header = $("<div class='qpx-datagrid-accordion-header'></div>").text(col.caption || col.dataField);
                var $content = $("<div class='qpx-datagrid-accordion-content'></div>").text(text);

                $header.on("click", function () {
                    $content.slideToggle(120);
                });

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

            if (name === "dataSource" || name === "columns") {
                this._renderHeader();
                this._renderBody();
                this._doAdaptiveLayout();
            } else if (name === "visible") {
                this.$container.toggleClass("qpx-hidden", !value);
            } else if (name === "disabled") {
                this.$container.toggleClass("qpx-state-disabled", !!value);
            }

            this.trigger("optionChanged", { name: name, value: value, previousValue: prev });
            return this;
        },

        destroy: function () {
            if (this._resizeObserver) this._resizeObserver.disconnect();
            $(window).off(".qpxDataGrid" + this.id);
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
