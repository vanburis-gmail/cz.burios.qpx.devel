/*!
 * uqp - button
 * Tlačítko se stejnou koncepcí jako DevExtreme dxButton:
 *  - options: text, icon, type, stylingMode, disabled, visible, hint, template
 *  - metody: option(), enable(), disable(), focus()
 *  - události: onClick, onOptionChanged
 */
(function (uqp, $) {
    "use strict";

    var Button = uqp.Widget.extend({

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
                .addClass("uqp-button")
                .attr("tabindex", cfg.disabled ? "-1" : "0")
                .attr("role", "button");

            if (cfg.onClick) { this.on("click", cfg.onClick); }
            if (cfg.onOptionChanged) { this.on("optionChanged", cfg.onOptionChanged); }

            this._renderContent();
            this._applyState();

            var self = this;
            this.$container.on("click.uqpButton", function (e) {
                if (self.config.disabled) { return; }
                self.trigger("click", { event: e, component: self, element: self.getNode() });
            });
            this.$container.on("keydown.uqpButton", function (e) {
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

            if (uqp.isFunction(cfg.template)) {
                cfg.template(cfg, this.$container);
                return;
            }

            if (cfg.icon) {
                var $icon = $("<span class='uqp-icon'></span>");
                if (String(cfg.icon).indexOf("css:") === 0) {
                    $icon.addClass(String(cfg.icon).slice(4));
                } else {
                    $icon.text(cfg.icon);
                }
                this.$container.append($icon);
            }
            if (cfg.text) {
                this.$container.append($("<span class='uqp-button-text'></span>").text(cfg.text));
            }
            if (cfg.hint) { this.$container.attr("title", cfg.hint); }
        },

        _applyState: function () {
            var cfg = this.config;
            this.$container
                .removeClass("uqp-button-normal uqp-button-default uqp-button-success uqp-button-danger uqp-button-warning")
                .addClass("uqp-button-" + cfg.type)
                .removeClass("uqp-button-mode-contained uqp-button-mode-outlined uqp-button-mode-text")
                .addClass("uqp-button-mode-" + cfg.stylingMode)
                .toggleClass("uqp-state-disabled", !!cfg.disabled)
                .toggleClass("uqp-hidden", !cfg.visible)
                .attr("aria-disabled", !!cfg.disabled)
                .attr("tabindex", cfg.disabled ? "-1" : "0");
        },

        // option("text") -> čtení; option("text","Nový text") -> zápis; option({text:.., icon:..}) -> hromadně
        option: function (name, value) {
            if (arguments.length === 0) { return this.config; }
            if (uqp.isObject(name)) {
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
            this.$container.off(".uqpButton");
            this._super();
        }
    });

    uqp.registerWidget("button", Button);
    uqp.Button = Button;

})(window.uqp, jQuery);
