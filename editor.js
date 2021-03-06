function WrappedDeferred (object) {
    this._ = this.object = object;
    this.deferred = $.Deferred();

    this._ok = this.deferred.resolve;
    this._ng = this.deferred.reject;

    this.deferred.done(function (x) {
        console.log('[done]', object, x);
    }).fail(function (x) {
        console.log('[fail]', object, x);
    });
}

WrappedDeferred.prototype = {
    then:    function () { return this.deferred.then   .apply(this.deferred, arguments) },
    done:    function () { return this.deferred.done   .apply(this.deferred, arguments) },
    fail:    function () { return this.deferred.fail   .apply(this.deferred, arguments) },
    promise: function () { return this.deferred.promise.apply(this.deferred, arguments) }
};

function defer (object) { return new WrappedDeferred(object) }

function describeError (error) {
    if (!error || typeof error === 'string') {
        return error;
    }

    var a = [ '[' + error.constructor.name + ']' ];

    if ('code' in error) {
        var code = error.code;
        for (var constantName in error.constructor.prototype) {
            if (!/^[A-Z]/.exec(constantName)) continue;
            if (error.constructor.prototype[constantName] === code) {
                a.push(constantName);
                break;
            }
        }
    }

    return a.join(' ');
}

var UI = {
    background: function () {
        var d = $.Deferred();
        var background = $('<div id="ui-modal-background">').appendTo(document.body);

        d.always(function () {
            background.remove();
        });

        background.one('click', function () { d.resolve() });

        return d;
    },
    prompt: function (options) {
        if (!options) options = {};

        var d = $.Deferred();

        var bg = this.background();
        d.always(bg.resolve);
        bg.always(d.reject);

        $('#ui-prompt').show();
        d.always(function () { $('#ui-prompt').hide() });

        $('#ui-prompt-title').text(options.title || '');

        $('#ui-prompt-input')
            .attr('placeholder', options.placeholder)
            .on('keypress.kak-ui', function (e) {
                if (e.keyCode === 13) {
                    d.resolve($(this).val());
                }
            })
            .val(options.default || '')
            .focus();

        d.always(function () {
            $('#ui-prompt-input').off('.kak-ui');
        });

        return d;
    }
};

var Notification = {
    TIMEOUT: 3000,
    _show: function (a, b, c) {
        var notification = webkitNotifications.createNotification(a, b, c);

        notification.show();

        setTimeout(function () { notification.close() }, Notification.TIMEOUT);
    },
    error: function (title, message) {
        console.error(title, message);
        this._show('', title || 'Error', describeError(message));
    },
    notify: function (title, message) {
        console.log(title, message);
        this._show('', title || 'Notification', message || '');
    }
};

var View = {
    focus: function () {
        $('#content').focus();
    },
    updateTitle: function () {
        chrome.fileSystem.getDisplayPath(Session.file.fileEntry, function (path) {
            var m = path.match(/([^\/]+?)(\.\w+)?$/);
            if (m) {
                $('#title-base').text(m[1]);
                $('#title-extension').text(m[2]);
            }
        });
    },
    updateStyles: function () {
        Prefs.get().done(function (prefs) {
            var _try = function () {
                if (typeof less.modifyVars === 'function') {
                    less.modifyVars({
                        '@horizontal-font-family': prefs['style.horizontal.font-family'],
                        '@horizontal-width':       prefs[ 'style.horizontal.width.' + prefs['style.horizontal.width.unit'] ] + prefs['style.horizontal.width.unit'],
                        '@vertical-font-family':   prefs['style.vertical.font-family'],
                        '@vertical-height':        prefs[ 'style.vertical.height.' + prefs['style.vertical.height.unit'] ] + prefs['style.vertical.height.unit']
                    });

                    setTimeout(function () { View.updateRuler(true) }, 1000);

                    return;
                }

                setTimeout(_try, 100);
            };

            _try();
        });
    },
    updateCharacterCount: function () {
        $('#character-count').text($('#content').text().length);
    },
    updateRuler: function (force) {
        var $content = $('#content'),
            $ruler   = $('#ruler');

        if (!force) {
            var lastSize = $content.data('kak:lastSize') || {};
            if ($content.height() === lastSize.height
                    && $content.width() === lastSize.width) {
                return;
            }
        }

        Prefs.get('style.' + Session.orientation.get() + '.page.lines').done(function (linesPerPage) {
            $ruler.empty();

            var line = 0,
                page = 0,
                dimension = Session.orientation.isVertical() ? 'width' : 'height';
            while ($ruler[dimension]() < $content[dimension]()) {
                if (line++ % linesPerPage === 0) {
                    page++;
                    $ruler.append($('<div class="page-marker">').attr('data-page', page));
                }

                var marker = $('<div class="line-marker">').text('.').attr({
                    'data-line': line,
                    'data-page': page
                });
                $ruler.find('.page-marker:last-child').append(marker);
            }
        });

        $content.data(
            'kak:lastSize', {
                height: $content.height(),
                width: $content.width()
            }
        );
    }
};

var Session = {
    content: {
        get: function () {
            var content = '';
            $(document.getElementById('content').childNodes).each(function () {
                content += $(this).is('br') ? '\n' : $(this).text();
            });
            return content;
        },
        set: function (content) {
            $('#content').empty();

            $('#content').text(content);

            $('#content').trigger('kak:change');
        }
    },
    backup: {
        save: function () {
            var content = Session.content.get();
            if (content.length === 0) return;

            chrome.storage.local.set(
                { backup: content }, function () {
                    console.log('backup saved')
                }
            );
        },
        restore: function () {
            with (defer(chrome.storage.local)) {
                _.get('backup', _ok);

                then(function (s) {
                    Session.content.set(s['backup']);
                });
            }
        },
        clear: function () {
            chrome.storage.local.remove('backup');
        }
    },
    orientation: {
        isVertical: function () {
            return this.get() == 'vertical';
        },
        isHorizontal: function () {
            return this.get() == 'horizontal';
        },
        get: function () {
            return $(document.body).hasClass('vertical') ? 'vertical' : 'horizontal';
        },
        toggle: function () {
            $(document.body)
                .toggleClass('horizontal')
                .toggleClass('vertical');
            setTimeout(function () { View.updateRuler() }, 1000);
        }
    },

    // http://developer.chrome.com/trunk/apps/fileSystem.html
    file: {
        fileEntry: null,

        reset: function () {
            this.fileEntry = null;
            $('#title-base').text('');
            $('#title-extension').text('');
        },

        open: function () {
            var File = this;

            with (defer(chrome.fileSystem)) {
                _.chooseEntry({ type: 'openWritableFile', accepts: [ { mimeTypes: [ 'text/*' ] } ] }, _ok);

                then(function (fileEntry) {
                    File.openFileEntry(fileEntry);
                });
            }
        },

        prepareWritableFileEntry: function (forceNew) {
            var File = this;
            var d = $.Deferred();

            if (this.fileEntry && !forceNew) {
                d.resolve(this.fileEntry);
            } else {
                chrome.fileSystem.chooseEntry({
                    type: 'saveFile',
                    accepts: [ { mimeTypes: [ 'text/*' ], extensions: [ 'txt' ] } ]
                }, d.resolve);
            }

            return d.then(function (fileEntry) {
                File.fileEntry = fileEntry;
                View.updateTitle();
                with (defer(chrome.fileSystem)) {
                    _.getWritableEntry(fileEntry, _ok);
                    return deferred;
                }
            });
        },

        save: function (forceNew) {
            this.prepareWritableFileEntry(forceNew).then($.proxy(this, 'saveToFileEntry'));
        },

        saveToFileEntry: function (fileEntry) {
            var content = Session.content.get(),
                blob = new Blob([ content ], { type: 'text/plain' });

            with (defer(fileEntry)) {
                _.createWriter(_ok, _ng);

                var writer;

                then(function (w) { writer = w }).

                then(function () {
                    with (defer(writer)) {
                        _.onwriteend = _ok;
                        _.onerror    = _ng;
                        _.truncate(blob.size);
                        return deferred;
                    }
                }).

                then(function () {
                    with (defer(writer)) {
                        _.onwriteend = _ok;
                        _.onerror    = _ng;
                        _.seek(0);
                        _.write(blob);
                        return deferred;
                    }
                }).

                then(function () {
                    chrome.fileSystem.getDisplayPath(fileEntry, function (path) {
                        Notification.notify('File wrote', path);
                    });

                    Session.backup.clear();
                }).

                fail(function (e) {
                    Notification.error('Writing file failed', writer && writer.error || e);
                });
            }
        },

        openFileEntry: function (fileEntry) {
            var File = this;

            this.reset();

            with (defer(fileEntry)) {
                _.file(_ok, _ng);

                then(function (file) {
                    with (defer(new FileReader())) {
                        _.onload  = _ok;
                        _.onerror = _ng;
                        _.readAsText(file);
                        return deferred;
                    }
                }).

                then(function (e) {
                    Session.content.set(e.target.result);

                    File.fileEntry = fileEntry;

                    View.focus();
                    View.updateTitle();
                }).

                fail(function (e) {
                    Notification.error('Opening file failed', e);
                });
            }
        }
    }
};

var Tools = {
    YahooKousei: {
        execute: function () {
            with (defer(chrome.storage.local)) {
                _.get('preferences.YahooKousei.appid', _ok);

                then(function (s) {
                    if (s['preferences.YahooKousei.appid']) {
                        return s['preferences.YahooKousei.appid'];
                    }

                    var d = $.Deferred();

                    UI.prompt({ title: 'Yahoo! アプリケーション ID を入力してください' }).done(function (appid) {
                        chrome.storage.local.set(
                            { 'preferences.YahooKousei.appid': appid }, function () {
                                d.resolve(appid);
                            }
                        );
                    });

                    return d;
                }).

                then(function (appid) {
                    return $.ajax(
                        'http://jlp.yahooapis.jp/KouseiService/V1/kousei', {
                            method: 'POST',
                            dataType: 'xml',
                            data: {
                                appid: appid,
                                sentence: Session.content.get()
                            }
                        }
                    );
                }).

                then(function (r) {
                    var results  = r.querySelectorAll('Result');

                    var cursor = {
                        pos: 0,
                        node: null,
                        next: function () {
                            this.pos += this.text().length;
                            return this.node = this._contents.shift();
                        },
                        text: function () {
                            var node = this.node;
                            if (!node) {
                                return "";
                            } else if (node.nodeName === 'BR') {
                                return "\n";
                            } else if (node.nodeName === '#text') {
                                return node.textContent;
                            } else {
                                return "";
                            }
                        },
                        advanceTo: function (pos) {
                            while (pos > this.pos + this.text().length) {
                                this.next();
                            }
                        },
                        _contents: $('#content').contents().toArray()
                    };
                    cursor.next();

                    var points = [];

                    // 結果がソートされている前提
                    $.each(results, function () {
                        var range = document.createRange();
                        var startPos = Number(this.querySelector('StartPos').textContent),
                            endPos   = startPos + Number(this.querySelector('Length').textContent),
                            word     = this.querySelector('ShitekiWord').textContent,
                            info     = this.querySelector('ShitekiInfo').textContent;

                        cursor.advanceTo(startPos);
                        range.setStart(cursor.node, startPos - cursor.pos);

                        cursor.advanceTo(endPos);
                        range.setEnd(cursor.node, endPos - cursor.pos);

                        points.push({ range: range, word: word, info: info });
                    });

                    $.each(points, function () {
                        this.range.surroundContents(
                            $('<span class="yahoo-kousei"></span>')
                                .attr('data-yahoo-kousei-shiteki-word', this.word)
                                .attr('data-yahoo-kousei-shiteki-info', this.info)[0]
                        );
                    });
                });
            }
        }
    }
};

$(function () {
    $('#options').click(function () {
        chrome.app.window.create(
            'options.html', {
                id: 'options',
                singleton: true
            }, function (created) {
                created.contentWindow.reflectToEditor = function () {
                    View.updateStyles();
                };
            }
        );
    });

    $('#toggle-orientation').click(function () {
        Session.orientation.toggle();
    });

    $('#save').click(function () {
        Session.file.save();
    });

    $('#open').click(function () {
        Session.file.open();
    });

    $('#content')
        .on('keyup', function (e) {
            $(this).trigger('kak:userChange');
        })
        .on('kak:userChange', function (e) {
            Session.backup.save();
            $(this).trigger('kak:change');
        })
        .on('kak:change', function (e) {
            View.updateCharacterCount();
            View.updateRuler();
        })
        .focus();

    $('#actions .action').tipsy();

    Session.backup.restore();

    View.updateStyles();
});

var dnd = new DnDFileController('body', function (data) {
    var fileEntry = data.items[0].webkitGetAsEntry();
    chrome.fileSystem.getWritableEntry(fileEntry, function (writeFileEntry) {
        Session.file.openFileEntry(writeFileEntry);
    });
});

var less = { fileAsync: true };
