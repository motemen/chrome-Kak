var Prefs = {
    PREFIX: 'preference.',

    DEFAULTS: {
        'style.horizontal.font-family': 'sans-serif',
        'style.horizontal.width.em':    20,
        'style.horizontal.width.%':     40,
        'style.horizontal.width.unit':  'em',
        'style.horizontal.page.lines':  20,

        'style.vertical.font-family': 'serif',
        'style.vertical.height.em':   20,
        'style.vertical.height.%':    60,
        'style.vertical.height.unit': '%',
        'style.vertical.page.lines':  20
    },

    get: function (key) {
        var d = $.Deferred();
        var keys = {};
        for (var k in Prefs.DEFAULTS) {
            keys[ Prefs.PREFIX + k ] = Prefs.DEFAULTS[k];
        }

        chrome.storage.local.get(keys, function (values) {
            if (key) {
                d.resolve(values[ Prefs.PREFIX + key]);
            } else {
                var prefs = {};
                for (var k in Prefs.DEFAULTS) {
                    prefs[k] = values[ Prefs.PREFIX + k ];
                }
                d.resolve(prefs);
            }
        });

        return d;
    },

    set: function (key, value) {
        var d = $.Deferred();

        var update = {};
        update[ Prefs.PREFIX + key] = value;

        chrome.storage.local.set(
            update, function () {
                d.resolve(update);
            }
        );

        return d;
    }
};
