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
