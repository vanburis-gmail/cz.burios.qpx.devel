/*!
 * uqp - parser
 * Umožňuje definovat komponenty třemi způsoby:
 *
 *  1) JSON skládání (viz uqp.ui/uqp.Layout):
 *       uqp.ui({ rows: [ {view:"template", template:"Ahoj"} ] }, "#app");
 *
 *  2) Napojení na konkrétní HTML element (jako kendoUI / easyUI):
 *       $("#box").uqp("template", { template: "Ahoj #name#" });
 *       // nebo:
 *       $("#box").uqp({ view: "template", template: "Ahoj" });
 *
 *  3) Deklarativně přes data-uqp-* atributy přímo v HTML (jako metro UI CSS):
 *       <div data-uqp-view="template" data-uqp-template="Ahoj #name#"></div>
 *       uqp.parse(); // proskenuje dokument a vše inicializuje
 */
(function (uqp, $) {
    "use strict";

    // převede "data-uqp-auto-height" -> "autoHeight"
    function toCamelCase(str) {
        return str.replace(/-([a-z0-9])/g, function (_, c) { return c.toUpperCase(); });
    }

    // načte všechny data-uqp-* atributy jednoho elementu do konfiguračního objektu.
    // Hodnoty se pokusí naparsovat jako JSON (čísla, booleany, objekty, pole),
    // pokud to nejde, použije se jako obyčejný string.
    uqp.parseAttrs = function (el) {
        var config = {};
        var attrs = el.attributes;
        for (var i = 0; i < attrs.length; i++) {
            var attr = attrs[i];
            var m = attr.name.match(/^data-uqp-(.+)$/);
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
    // všechny dosud neinicializované elementy s atributem data-uqp-view
    uqp.parse = function (root) {
        var $scope = root ? $(root) : $(document);
        var $found = $scope.find("[data-uqp-view]");
        if ($scope.is && $scope.is("[data-uqp-view]")) { $found = $found.add($scope); }

        $found.each(function () {
            if ($(this).data("uqp-widget")) { return; } // už inicializováno
            var cfg = uqp.parseAttrs(this);
            uqp.ui(cfg, this);
        });
        return uqp;
    };

    // vrátí instanci komponenty napojenou na daný element (nebo undefined)
    uqp.$find = function (el) {
        return $(el).data("uqp-widget");
    };

    // -----------------------------------------------------------------
    // jQuery plugin — napojení komponenty přímo na konkrétní element(y)
    // -----------------------------------------------------------------
    $.fn.uqp = function (view, config) {
        var cfg;
        if (uqp.isString(view)) {
            cfg = $.extend({ view: view }, config || {});
        } else {
            cfg = view || {};
        }

        var result = this;
        this.each(function () {
            var widget = uqp.ui(cfg, this);
            $(this).data("uqp-widget", widget);
        });
        return result;
    };

    // po načtení DOM automaticky zpracuje deklarativně zapsané komponenty,
    // pokud si to vývojář výslovně nevypne (uqp.autoParse = false;)
    $(function () {
        if (uqp.autoParse !== false) {
            uqp.parse(document);
        }
    });

})(window.uqp, jQuery);
