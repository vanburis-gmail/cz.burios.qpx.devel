# qpx.qpToolBar (`view: "qpToolBar"`)

Panel nástrojů koncipovaný stejně jako DevExtreme `dxToolBar`: položky
rozdělené do zón `before` / `center` / `after`, každá je samostatný
widget (`button`, `buttonGroup`, `dropDownButton`, `template`, ...).
Responzivně se chová jako panel nástrojů v Chrome DevTools — položky,
které se nevejdou do šířky panelu, se automaticky přesunou do
přetékajícího menu (ikona „⋮“ vpravo). Zdroj: `qpx.toolbar.js`. Dědí ze
[`qpx.Widget`](./qpx-widget-base.md).

## Options

| Option | Typ | Výchozí | Popis |
|---|---|---|---|
| `items` | array | `[]` | Položky panelu (viz níže) |
| `visible` | boolean | `true` | `false` přidá třídu `qpx-hidden` |
| `disabled` | boolean | `false` | Přidá třídu `qpx-state-disabled` na celý panel |
| `theme` | `"generic-light"` \| `"generic-dark"` | `"generic-light"` | Přidá třídu `qpx-theme-<theme>` |
| `overflowMenuIcon` | string | `"⋮"` | Text/glyph tlačítka pro otevření přetékajícího menu |
| `onItemClick` | `function(e)` | `null` | Zkratka za `.on("itemClick", fn)` — agregovaně za všechny typy položek |
| `onOptionChanged` | `function(e)` | `null` | Zkratka za `.on("optionChanged", fn)` |

### Konfigurace položky (`item`)

| Vlastnost | Typ | Výchozí | Popis |
|---|---|---|---|
| `location` | `"before"` \| `"center"` \| `"after"` | `"before"` | Do které zóny se položka vykreslí |
| `widget` | `"button"` \| `"buttonGroup"` \| `"dropDownButton"` \| `"template"` \| jiný registrovaný view | `"button"` (nebo `"template"`, pokud je zadán `template`) | Typ vnitřního widgetu položky |
| `locateInMenu` | `"auto"` \| `"always"` \| `"never"` | `"auto"` | `auto` = přesune se do přetékajícího menu, pokud se nevejde; `always` = vždy jen v menu; `never` = nikdy se do menu nepřesune |
| `visible` | boolean | `true` | `false` = položka se nevykreslí vůbec (ani do menu) |
| `cssClass` | string | – | CSS třída na obalující buňku položky |
| `options` | object | `{}` | Konfigurace předaná dovnitř vnitřního widgetu (`text`, `icon`, `onClick`, `items`, ...) |
| `template` / `data` | – | – | Zkratka pro `widget: "template"` — pokud jsou zadány přímo na položce (ne v `options`), promítnou se do `options.template` / `options.data` |

## Metody

| Metoda | Popis |
|---|---|
| `option()` / `option(name)` / `option(name, value)` / `option({...})` | Zápis `items` kompletně zničí a znovu postaví všechny položky; zápis `disabled`/`visible`/`theme` jen přepne odpovídající CSS třídu |
| `getItemWidget(index)` | Vrátí instanci vnitřního widgetu položky podle jejího indexu v poli `items` |
| `repaint()` | Vynutí přepočet responzivního rozložení (`_doRelayout`) |
| `destroy()` | Zruší `ResizeObserver`/resize handler, zničí všechny vnitřní widgety položek a odstraní přetékající menu z `document.body` |

## Události

| Event | Data (`e`) | Kdy se vyvolá |
|---|---|---|
| `itemClick` | `{ itemData, itemIndex, itemElement, component, ...event z vnitřního widgetu }` | Agregovaně při `click`/`itemClick` libovolného vnitřního widgetu položky |
| `optionChanged` | `{ name, value, previousValue }` | Po změně přes `option()` |
| `layoutChanged` | `{ overflowing }` | Po každém přepočtu responzivního rozložení (`overflowing` = zda je aktuálně něco v přetékajícím menu) |

Panel navíc naslouchá vlastním `click`/`itemClick` eventům jednotlivých
vnitřních widgetů a přeposílá je jako toolbar `itemClick` — takže stačí
poslouchat jen na úrovni toolbaru, není nutné se napojovat na každou
položku zvlášť.

## Responzivní chování

Přepočet (`_doRelayout`) proběhne po prvním vykreslení a dále při
změně velikosti panelu (`ResizeObserver`, s fallbackem na `window`
`resize`, pokud `ResizeObserver` není podporován). Položky s
`locateInMenu: "always"` jsou v menu vždy; položky s `"never"` se do
menu nepřesunou nikdy (typicky uživatelské menu vpravo). Ostatní se
"sbírají" od poslední (nejvíc vpravo) položky, dokud se obsah panelu
nevejde do dostupné šířky.

## Příklad

```js
var toolbar = qpx.ui({
    view: "qpToolBar",
    theme: "generic-light",
    items: [
        { location: "before", widget: "button",
          options: { icon: "☰", stylingMode: "text", hint: "Menu" } },
        { location: "before", widget: "button",
          options: { text: "Nový", icon: "➕", type: "default",
                     onClick: function () { console.log("nový záznam"); } } },
        { location: "before", widget: "buttonGroup",
          options: { items: [{ text: "Den", key: "day" }, { text: "Týden", key: "week" }],
                     selectedItemKeys: ["week"] } },
        { location: "before", widget: "dropDownButton",
          options: { text: "Export", splitButton: true,
                     items: [{ text: "PDF", key: "pdf" }, { text: "CSV", key: "csv" }] } },
        { location: "center", widget: "template",
          template: "<span>#count# položek</span>", data: { count: 128 } },
        { location: "after", widget: "dropDownButton", locateInMenu: "never",
          options: { text: "Petr Novák", icon: "👤",
                     items: [{ text: "Profil", key: "profile" }, { text: "Odhlásit se", key: "logout" }] } }
    ],
    onItemClick: function (e) {
        console.log("klik na položku toolbaru:", e.itemData, "index:", e.itemIndex);
    }
}, "#mistoVDom");

toolbar.option("theme", "generic-dark");
toolbar.getItemWidget(1).option("text", "Nový (2)");
```
