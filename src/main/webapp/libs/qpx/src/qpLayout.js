/*!
 * uqp - layout
 * Responzivní layout komponenta umožňující libovolně vnořovat "rows" a "cols",
 * podobně jako ve webixu. Interně staví na flexboxu.
 */
(function (uqp, $) {
    "use strict";

    var Layout = uqp.Widget.extend({

        defaults: {
            type: "clean",     // clean | space (mezery mezi buňkami) | line (oddělovací čáry)
            responsive: false, // na úzké obrazovce přepne "cols" na "rows"
            gap: null
        },

        render: function () {
            var cfg = this.config;
            this.$container.addClass("uqp-layout");

            if (cfg.type === "space") { this.$container.addClass("uqp-layout-space"); }
            if (cfg.type === "line") { this.$container.addClass("uqp-layout-line"); }
            if (cfg.gap !== null && cfg.gap !== undefined) { this.$container.css("gap", uqp.toPx(cfg.gap)); }

            if (cfg.rows) {
                this.$container.addClass("uqp-rows");
                this._renderStack(cfg.rows, "row");
            } else if (cfg.cols) {
                this.$container.addClass("uqp-cols");
                if (cfg.responsive) { this.$container.addClass("uqp-responsive"); }
                this._renderStack(cfg.cols, "col");
            }
            // layout bez rows/cols slouží jako prostý kontejner (leaf cell)
        },

        _renderStack: function (items, direction) {
            var self = this;
            items.forEach(function (itemCfg) {
                if (itemCfg === undefined || itemCfg === null) { return; }

                var isSpacer = uqp.isObject(itemCfg) &&
                    !itemCfg.view && !itemCfg.rows && !itemCfg.cols;

                var $cell = $("<div class='uqp-cell uqp-" + direction + "'></div>");
                self._applySizing($cell, itemCfg);
                self.$container.append($cell);

                if (isSpacer) {
                    $cell.addClass("uqp-spacer");
                    return; // prázdná buňka = flexibilní mezera
                }

                var child = uqp.ui(itemCfg, $cell);
                self.addChild(child);
            });
        },

        _applySizing: function ($cell, itemCfg) {
            if (!itemCfg || !uqp.isObject(itemCfg)) { return; }
            if (itemCfg.width !== undefined) {
                $cell.css({ "flex": "0 0 auto", "width": uqp.toPx(itemCfg.width) });
            }
            if (itemCfg.height !== undefined) {
                $cell.css({ "flex": "0 0 auto", "height": uqp.toPx(itemCfg.height) });
            }
            if (itemCfg.gravity !== undefined) {
                $cell.css("flex-grow", itemCfg.gravity);
            }
            if (itemCfg.hidden) { $cell.hide(); }
        }
    });

    uqp.registerWidget("layout", Layout);
    uqp.Layout = Layout;

})(window.uqp, jQuery);
