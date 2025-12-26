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
