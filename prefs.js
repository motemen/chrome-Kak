var Prefs = {
    PREFIX: 'preference.',

    DEFAULTS: {
        'style.horizontal.font-family':   'sans-serif',
        'style.horizontal.width.em':      40,
        'style.horizontal.width.percent': 30,
        'style.horizontal.width.unit':    'em',
        'style.horizontal.page.lines':    40,

        'style.vertical.font-family':    'serif',
        'style.vertical.height.em':      40,
        'style.vertical.height.percent': 50,
        'style.vertical.height.unit':    'em',
        'style.vertical.page.lines':     40
    },

    get: function (key) {
        var d = $.Deferred();
        var keys = {};
        for (var k in Prefs.DEFAULTS) {
            keys[ Prefs.PREFIX+ k ] = Prefs.DEFAULTS[k];
        }

        chrome.storage.local.get(keys, function (values) {
            if (key) {
                d.resolve(prefs[ Prefs.PREFIX + key]);
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
